import { DurableObject } from "cloudflare:workers";
import {
	applySuccessfulOperations,
	baselinePublishedGroups,
	classifyIndexNowStatus,
	diffManifest,
	type IndexNowOperation,
	operationSignature,
	operationUrls,
	type PublishedGroups,
	parseManifestText,
	reconcileRetryReservation,
	retryAfterAt,
	retryDelayMs,
} from "./policy";

const STATE_KEY = "coordinator-state";
const LEASE_MS = 2 * 60_000;
const MANIFEST_TIMEOUT_MS = 15_000;
const MANIFEST_MAX_BYTES = 256 * 1024;
const RATE_LIMIT_MIN_RETRY_MS = 10 * 60_000;
const RELAY_LEASE_MS = 10 * 60_000;
const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

type RelayLease = {
	claimId: string;
	expiresAt: number;
	operations: IndexNowOperation[];
};

type PendingBatch = {
	attemptCount: number;
	blocked: boolean;
	discoveredAt: number;
	nextAttemptAt: number;
	operations: IndexNowOperation[];
	relayLease?: RelayLease;
	signature: string;
};

type CoordinatorState = {
	initializedAt?: number;
	lastEndpointHost?: string;
	lastErrorCode?: string;
	lastManifestAt?: number;
	lastOutcome?: RunOutcome;
	lastResponseStatus?: number;
	lastRetryAfter?: string;
	lastSubmittedUrlCount?: number;
	lastSuccessAt?: number;
	leaseUntil?: number;
	pending?: PendingBatch;
	published: PublishedGroups;
};

type RunOutcome =
	| "blocked"
	| "bootstrapped"
	| "busy"
	| "disabled"
	| "no-change"
	| "relay-ready"
	| "retry-scheduled"
	| "submitted";

export type CoordinatorRunResult = {
	outcome: RunOutcome;
	pendingGroupCount: number;
	pendingUrlCount: number;
	submittedUrlCount: number;
};

export type CoordinatorStatus = {
	deliveryMode: "direct" | "relay";
	enabled: boolean;
	endpointHost: string;
	initializedAt: string | null;
	lastEndpointHost: string | null;
	lastErrorCode: string | null;
	lastManifestAt: string | null;
	lastOutcome: RunOutcome | null;
	lastResponseStatus: number | null;
	lastRetryAfter: string | null;
	lastSubmittedUrlCount: number;
	lastSuccessAt: string | null;
	nextAttemptAt: string | null;
	pendingAttemptCount: number;
	pendingGroupCount: number;
	pendingUrlCount: number;
	publishedGroupCount: number;
	relayLeaseExpiresAt: string | null;
};

export type RelayClaimResult =
	| {
			claimId: string;
			endpoint: string;
			host: string;
			keyLocation: string;
			outcome: "claimed";
			urlList: string[];
	  }
	| {
			outcome: "blocked" | "busy" | "no-change" | "retry-scheduled";
	  };

export type RelaySettlement = {
	claimId: string;
	retryAfter?: string;
	status: number;
};

export type RelaySettlementResult = {
	outcome: "blocked" | "busy" | "retry-scheduled" | "stale" | "submitted";
};

function initialState(): CoordinatorState {
	return { published: {} };
}

function iso(timestamp: number | undefined): string | null {
	return timestamp === undefined ? null : new Date(timestamp).toISOString();
}

function errorCode(error: unknown): string {
	if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) {
		return error.message;
	}
	return "INDEXNOW_UNEXPECTED_ERROR";
}

function randomFraction(): number {
	const values = new Uint32Array(1);
	crypto.getRandomValues(values);
	return (values[0] ?? 0) / 2 ** 32;
}

export class IndexNowCoordinator extends DurableObject<Env> {
	async run(_trigger: "manual" | "scheduled"): Promise<CoordinatorRunResult> {
		if (!this.isEnabled()) return this.emptyResult("disabled");
		this.validateConfig();

		const now = Date.now();
		const state = await this.claim(now);
		if (!state) return this.emptyResult("busy");

		try {
			const manifest = await this.fetchManifest();
			state.lastManifestAt = now;
			if (state.initializedAt === undefined) {
				state.initializedAt = now;
				state.published = baselinePublishedGroups(manifest);
				state.pending = undefined;
				state.lastEndpointHost = undefined;
				state.lastErrorCode = undefined;
				state.lastOutcome = "bootstrapped";
				state.lastResponseStatus = undefined;
				state.lastRetryAfter = undefined;
				await this.ctx.storage.deleteAlarm();
				await this.release(state);
				console.log({
					event: "indexnow.baseline_initialized",
					groupCount: manifest.groups.length,
				});
				return this.result(state, "bootstrapped", 0);
			}
			const operations = diffManifest(manifest, state.published);
			const signature = operationSignature(operations);
			const previousPending = state.pending;
			if (operations.length === 0) {
				state.pending = undefined;
				state.lastErrorCode = undefined;
				state.lastOutcome = "no-change";
				await this.release(state);
				return this.result(state, "no-change", 0);
			}

			if (previousPending?.signature === signature) {
				state.pending = previousPending;
			} else {
				const reservation = reconcileRetryReservation(
					previousPending,
					signature,
					now,
				);
				state.pending = {
					...reservation,
					discoveredAt:
						previousPending && !previousPending.blocked
							? previousPending.discoveredAt
							: now,
					operations,
					relayLease: previousPending?.relayLease,
					signature,
				};
				console.log({
					attemptCount: reservation.attemptCount,
					event: "indexnow.pending_merged",
					groupCount: operations.length,
					retryFloorPreserved:
						previousPending !== undefined && !previousPending.blocked,
					urlCount: operationUrls(operations).length,
				});
			}

			if (state.pending.blocked) {
				state.lastOutcome = "blocked";
				await this.release(state);
				return this.result(state, "blocked", 0);
			}
			if (state.pending.nextAttemptAt > now) {
				state.lastOutcome = "retry-scheduled";
				if (!this.usesRelay()) {
					await this.ctx.storage.setAlarm(state.pending.nextAttemptAt);
				}
				await this.release(state);
				return this.result(state, "retry-scheduled", 0);
			}
			if (this.usesRelay()) {
				state.lastOutcome = "relay-ready";
				await this.release(state);
				return this.result(state, "relay-ready", 0);
			}

			return await this.submitPending(state, now);
		} catch (error) {
			state.lastErrorCode = errorCode(error);
			await this.release(state);
			throw error;
		}
	}

	async status(): Promise<CoordinatorStatus> {
		const state =
			(await this.ctx.storage.get<CoordinatorState>(STATE_KEY)) ??
			initialState();
		return {
			deliveryMode: this.usesRelay() ? "relay" : "direct",
			enabled: this.isEnabled(),
			endpointHost: this.indexNowEndpoint().hostname,
			initializedAt: iso(state.initializedAt),
			lastEndpointHost: state.lastEndpointHost ?? null,
			lastErrorCode: state.lastErrorCode ?? null,
			lastManifestAt: iso(state.lastManifestAt),
			lastOutcome: state.lastOutcome ?? null,
			lastResponseStatus: state.lastResponseStatus ?? null,
			lastRetryAfter: state.lastRetryAfter ?? null,
			lastSubmittedUrlCount: state.lastSubmittedUrlCount ?? 0,
			lastSuccessAt: iso(state.lastSuccessAt),
			nextAttemptAt: iso(state.pending?.nextAttemptAt),
			pendingAttemptCount: state.pending?.attemptCount ?? 0,
			pendingGroupCount: state.pending?.operations.length ?? 0,
			pendingUrlCount: operationUrls(state.pending?.operations ?? []).length,
			publishedGroupCount: Object.keys(state.published).length,
			relayLeaseExpiresAt: iso(state.pending?.relayLease?.expiresAt),
		};
	}

	async claimRelay(): Promise<RelayClaimResult> {
		if (!this.usesRelay()) throw new Error("INDEXNOW_RELAY_DISABLED");
		const discovery = await this.run("manual");
		if (discovery.outcome === "busy") return { outcome: "busy" };

		const now = Date.now();
		const state = await this.claim(now);
		if (!state) return { outcome: "busy" };
		try {
			const pending = state.pending;
			if (!pending) {
				await this.release(state);
				return { outcome: "no-change" };
			}
			if (pending.blocked) {
				await this.release(state);
				return { outcome: "blocked" };
			}
			if (pending.nextAttemptAt > now) {
				await this.release(state);
				return { outcome: "retry-scheduled" };
			}
			if (
				pending.relayLease !== undefined &&
				pending.relayLease.expiresAt > now
			) {
				await this.release(state);
				return { outcome: "busy" };
			}

			const claimId = crypto.randomUUID();
			const urlList = operationUrls(pending.operations);
			state.pending = {
				...pending,
				relayLease: {
					claimId,
					expiresAt: now + RELAY_LEASE_MS,
					operations: pending.operations,
				},
			};
			state.lastOutcome = "relay-ready";
			await this.release(state);

			const endpoint = this.indexNowEndpoint();
			const site = new URL(this.env.SITE_BASE_URL);
			console.log({
				endpointHost: endpoint.hostname,
				event: "indexnow.relay_claimed",
				groupCount: pending.operations.length,
				urlCount: urlList.length,
			});
			return {
				claimId,
				endpoint: endpoint.toString(),
				host: site.host,
				keyLocation: new URL(`/${this.env.INDEXNOW_KEY}.txt`, site).toString(),
				outcome: "claimed",
				urlList,
			};
		} catch (error) {
			state.lastErrorCode = errorCode(error);
			await this.release(state);
			throw error;
		}
	}

	async settleRelay(
		settlement: RelaySettlement,
	): Promise<RelaySettlementResult> {
		if (!this.usesRelay()) throw new Error("INDEXNOW_RELAY_DISABLED");
		if (
			!/^[-0-9a-f]{36}$/i.test(settlement.claimId) ||
			!Number.isInteger(settlement.status) ||
			settlement.status < 100 ||
			settlement.status > 599 ||
			(settlement.retryAfter !== undefined &&
				settlement.retryAfter.length > 128)
		) {
			throw new Error("INDEXNOW_RELAY_SETTLEMENT_INVALID");
		}

		const now = Date.now();
		const state = await this.claim(now);
		if (!state) return { outcome: "busy" };
		try {
			const pending = state.pending;
			const relayLease = pending?.relayLease;
			if (
				!pending ||
				!relayLease ||
				relayLease.claimId !== settlement.claimId
			) {
				await this.release(state);
				return { outcome: "stale" };
			}

			const urlCount = operationUrls(relayLease.operations).length;
			const endpoint = this.indexNowEndpoint();
			state.lastEndpointHost = endpoint.hostname;
			state.lastResponseStatus = settlement.status;
			state.lastRetryAfter = settlement.retryAfter;
			state.pending = { ...pending, relayLease: undefined };

			const outcome = classifyIndexNowStatus(settlement.status);
			if (outcome === "success") {
				state.published = applySuccessfulOperations(
					state.published,
					relayLease.operations,
				);
				state.pending = undefined;
				state.lastErrorCode = undefined;
				state.lastOutcome = "submitted";
				state.lastSubmittedUrlCount = urlCount;
				state.lastSuccessAt = now;
				await this.release(state);
				console.log({
					endpointHost: endpoint.hostname,
					event: "indexnow.relay_settled",
					outcome,
					status: settlement.status,
					urlCount,
				});
				return { outcome: "submitted" };
			}

			if (outcome === "permanent-failure") {
				state.pending = {
					...state.pending,
					attemptCount: pending.attemptCount + 1,
					blocked: true,
				};
				state.lastErrorCode = `INDEXNOW_HTTP_${settlement.status}`;
				state.lastOutcome = "blocked";
				await this.release(state);
				console.error({
					endpointHost: endpoint.hostname,
					event: "indexnow.relay_settled",
					outcome,
					status: settlement.status,
					urlCount,
				});
				return { outcome: "blocked" };
			}

			const retryAfter = retryAfterAt(settlement.retryAfter ?? null, now);
			const providerRetryAt =
				settlement.status === 429
					? Math.max(retryAfter ?? 0, now + RATE_LIMIT_MIN_RETRY_MS)
					: retryAfter;
			const result = await this.scheduleRetry(
				state,
				now,
				settlement.status === 599
					? "INDEXNOW_RELAY_NETWORK_ERROR"
					: `INDEXNOW_HTTP_${settlement.status}`,
				providerRetryAt,
			);
			return { outcome: result.outcome as "retry-scheduled" };
		} catch (error) {
			state.lastErrorCode = errorCode(error);
			await this.release(state);
			throw error;
		}
	}

	override async alarm(): Promise<void> {
		if (!this.isEnabled()) return;
		const now = Date.now();
		const state = await this.claim(now);
		if (!state) {
			await this.ctx.storage.setAlarm(now + 60_000);
			return;
		}

		try {
			if (state.initializedAt === undefined) {
				await this.release(state);
				await this.run("scheduled");
				return;
			}
			if (this.usesRelay()) {
				await this.release(state);
				return;
			}
			if (!state.pending || state.pending.blocked) {
				await this.release(state);
				return;
			}
			if (state.pending.nextAttemptAt > now) {
				await this.ctx.storage.setAlarm(state.pending.nextAttemptAt);
				await this.release(state);
				return;
			}
			await this.submitPending(state, now);
		} catch (error) {
			state.lastErrorCode = errorCode(error);
			await this.release(state);
			throw error;
		}
	}

	private async claim(now: number): Promise<CoordinatorState | undefined> {
		return this.ctx.storage.transaction(async (transaction) => {
			const state =
				(await transaction.get<CoordinatorState>(STATE_KEY)) ?? initialState();
			if (state.leaseUntil !== undefined && state.leaseUntil > now) {
				return undefined;
			}
			const claimed = { ...state, leaseUntil: now + LEASE_MS };
			await transaction.put(STATE_KEY, claimed);
			return claimed;
		});
	}

	private async release(state: CoordinatorState): Promise<void> {
		const { leaseUntil: _leaseUntil, ...released } = state;
		await this.ctx.storage.put(STATE_KEY, released);
	}

	private async fetchManifest() {
		const response = await fetch(
			new URL("/api/indexnow-manifest.json", this.env.SITE_BASE_URL),
			{
				headers: { accept: "application/json" },
				redirect: "manual",
				signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
			},
		);
		if (!response.ok) throw new Error("INDEXNOW_MANIFEST_FETCH_FAILED");
		const contentLength = Number(response.headers.get("content-length") ?? 0);
		if (contentLength > MANIFEST_MAX_BYTES) {
			throw new Error("INDEXNOW_MANIFEST_TOO_LARGE");
		}
		const text = await response.text();
		return parseManifestText(text, this.env.SITE_BASE_URL);
	}

	private async submitPending(
		state: CoordinatorState,
		now: number,
	): Promise<CoordinatorRunResult> {
		const pending = state.pending;
		if (!pending) return this.result(state, "no-change", 0);
		const urls = operationUrls(pending.operations);
		const endpoint = this.indexNowEndpoint();
		let response: Response;

		try {
			const site = new URL(this.env.SITE_BASE_URL);
			state.lastEndpointHost = endpoint.hostname;
			state.lastResponseStatus = undefined;
			state.lastRetryAfter = undefined;
			response = await fetch(endpoint, {
				method: "POST",
				headers: { "content-type": "application/json; charset=utf-8" },
				body: JSON.stringify({
					host: site.host,
					key: this.env.INDEXNOW_KEY,
					keyLocation: new URL(
						`/${this.env.INDEXNOW_KEY}.txt`,
						site,
					).toString(),
					urlList: urls,
				}),
				signal: AbortSignal.timeout(15_000),
			});
		} catch {
			return await this.scheduleRetry(state, now, "INDEXNOW_NETWORK_ERROR");
		}

		state.lastResponseStatus = response.status;
		state.lastRetryAfter = response.headers.get("retry-after") ?? undefined;
		const outcome = classifyIndexNowStatus(response.status);
		if (outcome === "success") {
			state.published = applySuccessfulOperations(
				state.published,
				pending.operations,
			);
			state.pending = undefined;
			state.lastErrorCode = undefined;
			state.lastOutcome = "submitted";
			state.lastSubmittedUrlCount = urls.length;
			state.lastSuccessAt = now;
			await this.release(state);
			console.log({
				endpointHost: endpoint.hostname,
				event: "indexnow.submission",
				groupCount: pending.operations.length,
				outcome,
				status: response.status,
				urlCount: urls.length,
			});
			return this.result(state, "submitted", urls.length);
		}

		if (outcome === "permanent-failure") {
			state.pending = {
				...pending,
				attemptCount: pending.attemptCount + 1,
				blocked: true,
			};
			state.lastErrorCode = `INDEXNOW_HTTP_${response.status}`;
			state.lastOutcome = "blocked";
			await this.release(state);
			console.error({
				endpointHost: endpoint.hostname,
				event: "indexnow.submission",
				groupCount: pending.operations.length,
				outcome,
				status: response.status,
				urlCount: urls.length,
			});
			return this.result(state, "blocked", 0);
		}

		const retryAfter = retryAfterAt(response.headers.get("retry-after"), now);
		const providerRetryAt =
			response.status === 429
				? Math.max(retryAfter ?? 0, now + RATE_LIMIT_MIN_RETRY_MS)
				: retryAfter;
		return await this.scheduleRetry(
			state,
			now,
			`INDEXNOW_HTTP_${response.status}`,
			providerRetryAt,
		);
	}

	private async scheduleRetry(
		state: CoordinatorState,
		now: number,
		code: string,
		retryAfter?: number,
	): Promise<CoordinatorRunResult> {
		const pending = state.pending;
		if (!pending) return this.result(state, "no-change", 0);
		const calculatedRetryAt =
			now + retryDelayMs(pending.attemptCount, randomFraction());
		const nextAttemptAt = Math.max(calculatedRetryAt, retryAfter ?? 0);
		state.pending = {
			...pending,
			attemptCount: pending.attemptCount + 1,
			nextAttemptAt,
		};
		state.lastErrorCode = code;
		state.lastOutcome = "retry-scheduled";
		if (!this.usesRelay()) {
			await this.ctx.storage.setAlarm(nextAttemptAt);
		}
		await this.release(state);
		console.warn({
			attemptCount: state.pending.attemptCount,
			event: "indexnow.retry_scheduled",
			nextAttemptAt: new Date(nextAttemptAt).toISOString(),
			urlCount: operationUrls(pending.operations).length,
		});
		return this.result(state, "retry-scheduled", 0);
	}

	private isEnabled(): boolean {
		return this.env.INDEXNOW_ENABLED === "true";
	}

	private usesRelay(): boolean {
		return this.env.INDEXNOW_DELIVERY_MODE === "relay";
	}

	private indexNowEndpoint(): URL {
		return new URL(this.env.INDEXNOW_ENDPOINT);
	}

	private validateConfig(): void {
		if (!KEY_PATTERN.test(this.env.INDEXNOW_KEY)) {
			throw new Error("INDEXNOW_KEY_INVALID");
		}
		const site = new URL(this.env.SITE_BASE_URL);
		if (site.protocol !== "https:" || site.pathname !== "/") {
			throw new Error("INDEXNOW_SITE_BASE_URL_INVALID");
		}
		const endpoint = this.indexNowEndpoint();
		if (
			endpoint.protocol !== "https:" ||
			endpoint.username !== "" ||
			endpoint.password !== "" ||
			endpoint.pathname.toLowerCase() !== "/indexnow" ||
			endpoint.search !== "" ||
			endpoint.hash !== ""
		) {
			throw new Error("INDEXNOW_ENDPOINT_INVALID");
		}
		const deliveryMode: string = this.env.INDEXNOW_DELIVERY_MODE;
		if (deliveryMode !== "direct" && deliveryMode !== "relay") {
			throw new Error("INDEXNOW_DELIVERY_MODE_INVALID");
		}
	}

	private emptyResult(outcome: RunOutcome): CoordinatorRunResult {
		return {
			outcome,
			pendingGroupCount: 0,
			pendingUrlCount: 0,
			submittedUrlCount: 0,
		};
	}

	private result(
		state: CoordinatorState,
		outcome: RunOutcome,
		submittedUrlCount: number,
	): CoordinatorRunResult {
		return {
			outcome,
			pendingGroupCount: state.pending?.operations.length ?? 0,
			pendingUrlCount: operationUrls(state.pending?.operations ?? []).length,
			submittedUrlCount,
		};
	}
}
