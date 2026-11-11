/** Private, account-scoped recovery receipt. Never an entitlement or analytics payload. */
export type PendingAdCompletion = {
	placement: string;
	id: string;
	events: string[];
	opportunityKey: string | null;
	savedAt: number;
};
type Scope = {
	key: string;
	storage: {
		getItem(key: string): string | null | Promise<string | null>;
		setItem(key: string, value: string): void | Promise<void>;
	};
};
const terminal = new Set([
	"AD_INCOMPLETE",
	"AD_EXPIRED",
	"AD_NOT_FOUND",
	"RESTORE_EXPIRED",
	"RESTORE_UNAVAILABLE",
]);
const placements = new Set([
	"generation_continue",
	"custom",
	"report",
	"attendance_restore",
]);
const events = new Set([
	"requested",
	"show",
	"impression",
	"clicked",
	"dismissed",
	"userEarnedReward",
	"failedToShow",
	"cancelled",
]);

export function normalizeAdCompletion(
	value: unknown,
	now = Date.now(),
): PendingAdCompletion | null {
	if (!value || typeof value !== "object") return null;
	const p = value as PendingAdCompletion;
	if (
		!placements.has(p.placement) ||
		typeof p.id !== "string" ||
		!/^[a-zA-Z0-9_-]{1,96}$/.test(p.id) ||
		!Array.isArray(p.events) ||
		p.events.length === 0 ||
		p.events.length > 24 ||
		!p.events.every((e) => events.has(e)) ||
		!(
			p.opportunityKey === null ||
			(typeof p.opportunityKey === "string" &&
				/^[a-zA-Z0-9_.:-]{1,160}$/.test(p.opportunityKey))
		) ||
		!Number.isSafeInteger(p.savedAt) ||
		p.savedAt > now + 300_000 ||
		now - p.savedAt > 86_400_000
	)
		return null;
	return {
		placement: p.placement,
		id: p.id,
		events: [...p.events],
		opportunityKey: p.opportunityKey,
		savedAt: p.savedAt,
	};
}

export function completionMatches(
	pending: PendingAdCompletion,
	placement: string,
	opportunityKey?: string | null,
) {
	return (
		pending.placement === placement &&
		pending.opportunityKey === (opportunityKey ?? null)
	);
}

export function createAdCompletionRecovery<T>(deps: {
	scope: () => Promise<Scope>;
	complete: (id: string, events: string[]) => Promise<T>;
	errorCode: (error: unknown) => string | null;
	retryable: (error: unknown) => boolean;
	active: () => boolean;
	validate?: (result: T, pending: PendingAdCompletion) => void;
	track: (
		event:
			| "completion_retry"
			| "completion_recovered"
			| "completion_failed"
			| "completion_storage_failed",
		outcome: string,
	) => void;
	wait?: () => Promise<void>;
}) {
	let scope: Scope | null = null;
	let pending: PendingAdCompletion | null = null;
	const check = () => {
		if (!deps.active()) throw new Error("광고 요청을 중단했어요.");
	};
	async function persist() {
		if (!scope) throw new Error("광고 연결 정보를 확인해 주세요.");
		try {
			await scope.storage.setItem(scope.key, JSON.stringify(pending));
		} catch {
			deps.track("completion_storage_failed", "storage_unavailable");
		}
	}
	return {
		get pending() {
			return pending;
		},
		async load() {
			const next = await deps.scope();
			check();
			if (scope?.key === next.key) return;
			scope = next;
			pending = null;
			try {
				pending = normalizeAdCompletion(
					JSON.parse((await next.storage.getItem(next.key)) ?? "null"),
				);
			} catch {
				deps.track("completion_storage_failed", "storage_unavailable");
			}
			check();
		},
		async save(value: Omit<PendingAdCompletion, "savedAt">) {
			check();
			pending = { ...value, events: [...value.events], savedAt: Date.now() };
			await persist();
			check();
		},
		async discard() {
			pending = null;
			await persist();
		},
		async settle() {
			check();
			const previous = pending;
			if (!previous) throw new Error("처리할 광고 결과가 없어요.");
			for (let attempt = 0; ; attempt++) {
				try {
					const result = await deps.complete(previous.id, previous.events);
					check();
					deps.validate?.(result, previous);
					pending = null;
					await persist();
					check();
					if (attempt) deps.track("completion_recovered", "accepted");
					return result;
				} catch (error) {
					check();
					const code = deps.errorCode(error);
					if (code && terminal.has(code)) {
						pending = null;
						await persist();
					}
					if (attempt === 0 && pending && deps.retryable(error)) {
						deps.track("completion_retry", "transient");
						await (deps.wait?.() ??
							new Promise((resolve) => setTimeout(resolve, 400)));
						check();
						continue;
					}
					deps.track(
						"completion_failed",
						code && /^[A-Z0-9_]{1,48}$/.test(code)
							? code
							: "network_or_response",
					);
					throw error;
				}
			}
		},
	};
}
