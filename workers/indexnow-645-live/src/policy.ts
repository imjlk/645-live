import {
	INDEXNOW_MAX_URLS,
	type IndexNowManifest,
	type IndexNowManifestGroup,
	type IndexNowManifestKind,
} from "@645/shared/indexnow";

export type PublishedGroups = Record<string, IndexNowManifestGroup>;

export type IndexNowOperation = {
	action: "delete" | "upsert";
	group: IndexNowManifestGroup;
};

export type RetryReservation = {
	attemptCount: number;
	blocked: boolean;
	nextAttemptAt: number;
	signature: string;
};

const GROUP_ID_PATTERN = /^[a-z0-9][a-z0-9:-]{0,127}$/;
const MANIFEST_MAX_BYTES = 256 * 1024;
const RETRY_SCHEDULE_MS = [
	5 * 60_000,
	15 * 60_000,
	60 * 60_000,
	6 * 60 * 60_000,
] as const;
const VALID_KINDS = new Set<IndexNowManifestKind>([
	"draw",
	"news",
	"scan",
	"stats",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGroup(
	value: unknown,
	expectedOrigin: URL,
): IndexNowManifestGroup {
	if (!isRecord(value)) throw new Error("INDEXNOW_MANIFEST_GROUP_INVALID");
	const { id, kind, version, urls } = value;
	if (typeof id !== "string" || !GROUP_ID_PATTERN.test(id)) {
		throw new Error("INDEXNOW_MANIFEST_GROUP_ID_INVALID");
	}
	if (
		typeof kind !== "string" ||
		!VALID_KINDS.has(kind as IndexNowManifestKind)
	) {
		throw new Error("INDEXNOW_MANIFEST_GROUP_KIND_INVALID");
	}
	if (
		typeof version !== "string" ||
		version.length === 0 ||
		version.length > 256
	) {
		throw new Error("INDEXNOW_MANIFEST_VERSION_INVALID");
	}
	if (!Array.isArray(urls) || urls.length === 0) {
		throw new Error("INDEXNOW_MANIFEST_URLS_INVALID");
	}

	const canonicalUrls = urls.map((url) => {
		if (typeof url !== "string") {
			throw new Error("INDEXNOW_MANIFEST_URL_INVALID");
		}
		const parsed = new URL(url);
		if (
			parsed.origin !== expectedOrigin.origin ||
			parsed.protocol !== "https:" ||
			parsed.username !== "" ||
			parsed.password !== "" ||
			parsed.search !== "" ||
			parsed.hash !== ""
		) {
			throw new Error("INDEXNOW_MANIFEST_URL_NONCANONICAL");
		}
		return parsed.toString();
	});

	return {
		id,
		kind: kind as IndexNowManifestKind,
		version,
		urls: [...new Set(canonicalUrls)],
	};
}

export function parseManifestText(
	text: string,
	expectedOrigin: string,
): IndexNowManifest {
	if (new TextEncoder().encode(text).byteLength > MANIFEST_MAX_BYTES) {
		throw new Error("INDEXNOW_MANIFEST_TOO_LARGE");
	}
	const value: unknown = JSON.parse(text);
	if (!isRecord(value) || value.schemaVersion !== 1) {
		throw new Error("INDEXNOW_MANIFEST_SCHEMA_INVALID");
	}
	if (
		typeof value.generatedAt !== "string" ||
		!Number.isFinite(Date.parse(value.generatedAt)) ||
		!Array.isArray(value.groups)
	) {
		throw new Error("INDEXNOW_MANIFEST_INVALID");
	}

	const origin = new URL(expectedOrigin);
	const groups = value.groups.map((group) => parseGroup(group, origin));
	if (new Set(groups.map((group) => group.id)).size !== groups.length) {
		throw new Error("INDEXNOW_MANIFEST_DUPLICATE_GROUP");
	}
	if (new Set(groups.flatMap((group) => group.urls)).size > INDEXNOW_MAX_URLS) {
		throw new Error("INDEXNOW_MANIFEST_URL_LIMIT_EXCEEDED");
	}

	return {
		schemaVersion: 1,
		generatedAt: value.generatedAt,
		groups,
	};
}

export function diffManifest(
	manifest: IndexNowManifest,
	published: PublishedGroups,
): IndexNowOperation[] {
	const current = new Map(manifest.groups.map((group) => [group.id, group]));
	const operations: IndexNowOperation[] = [];

	for (const group of manifest.groups) {
		const previous = published[group.id];
		if (previous?.version !== group.version) {
			operations.push({ action: "upsert", group });
		}
	}

	for (const previous of Object.values(published)) {
		if (previous.kind === "news" && !current.has(previous.id)) {
			operations.push({ action: "delete", group: previous });
		}
	}

	return operations.sort((left, right) =>
		left.group.id.localeCompare(right.group.id),
	);
}

/**
 * Records the deployment-time inventory without reporting old URLs as fresh.
 * IndexNow should receive changes observed after adoption, while the sitemap
 * remains the complete historical inventory.
 */
export function baselinePublishedGroups(
	manifest: IndexNowManifest,
): PublishedGroups {
	return Object.fromEntries(manifest.groups.map((group) => [group.id, group]));
}

export function operationUrls(
	operations: readonly IndexNowOperation[],
): string[] {
	return [...new Set(operations.flatMap((operation) => operation.group.urls))];
}

export function operationSignature(
	operations: readonly IndexNowOperation[],
): string {
	return JSON.stringify(
		operations.map((operation) => ({
			action: operation.action,
			id: operation.group.id,
			version: operation.group.version,
			urls: operation.group.urls,
		})),
	);
}

/**
 * Merges newly discovered host changes into an existing retry cohort.
 *
 * A changed signature must not reset a retryable host response: doing so lets
 * any fresh content bypass the provider's backoff and turns a scheduled poll
 * into an immediate duplicate request. A permanent failure is different; a
 * genuinely new version is allowed to unblock it for a corrected submission.
 */
export function reconcileRetryReservation(
	previous: RetryReservation | undefined,
	signature: string,
	now: number,
): Omit<RetryReservation, "signature"> {
	if (previous === undefined) {
		return { attemptCount: 0, blocked: false, nextAttemptAt: now };
	}
	if (previous.signature === signature) {
		return {
			attemptCount: previous.attemptCount,
			blocked: previous.blocked,
			nextAttemptAt: previous.nextAttemptAt,
		};
	}
	if (previous.blocked) {
		return { attemptCount: 0, blocked: false, nextAttemptAt: now };
	}
	return {
		attemptCount: previous.attemptCount,
		blocked: false,
		nextAttemptAt: Math.max(now, previous.nextAttemptAt),
	};
}

export function applySuccessfulOperations(
	published: PublishedGroups,
	operations: readonly IndexNowOperation[],
): PublishedGroups {
	const next = { ...published };
	for (const operation of operations) {
		if (operation.action === "delete") {
			delete next[operation.group.id];
		} else {
			next[operation.group.id] = operation.group;
		}
	}
	return next;
}

export function classifyIndexNowStatus(
	status: number,
): "permanent-failure" | "retry" | "success" {
	if (status === 200 || status === 202) return "success";
	if (status === 400 || status === 403 || status === 422) {
		return "permanent-failure";
	}
	return "retry";
}

export function retryDelayMs(
	attemptCount: number,
	randomValue: number,
): number {
	const base =
		RETRY_SCHEDULE_MS[Math.min(attemptCount, RETRY_SCHEDULE_MS.length - 1)] ??
		6 * 60 * 60_000;
	const jitter = 0.8 + 0.4 * Math.min(1, Math.max(0, randomValue));
	return Math.floor(base * jitter);
}

export function retryAfterAt(
	value: string | null,
	now: number,
): number | undefined {
	if (!value) return undefined;
	const seconds = Number(value);
	if (Number.isFinite(seconds) && seconds >= 0) {
		return now + seconds * 1_000;
	}
	const timestamp = Date.parse(value);
	return Number.isFinite(timestamp) && timestamp > now ? timestamp : undefined;
}
