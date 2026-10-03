export type ReviewSource = "save" | "results";
export const REVIEW_COOLDOWN_MS = 30 * 86_400_000;
export const REVIEW_SAVED_MILESTONE = 3;

/** Requesting a review never establishes that the SDK displayed or received one. */
export function createReviewRequest(deps: {
	storage: {
		getItem(key: string): Promise<string | null> | string | null;
		setItem(key: string, value: string): Promise<void> | void;
	};
	key: string;
	supported: () => boolean;
	request: () => Promise<void>;
	onRequested?: (source: ReviewSource) => void;
	now?: () => number;
}) {
	let attempted = false;
	let pending = false;
	return {
		async consider(options: {
			source: ReviewSource;
			eligible: boolean;
			canShow: () => boolean;
		}) {
			if (!options.eligible || attempted || pending) return false;
			pending = true;
			try {
				if (!deps.supported() || !options.canShow()) return false;
				const raw = await deps.storage.getItem(deps.key);
				let last: unknown = null;
				try {
					if (raw !== null) last = JSON.parse(raw);
				} catch {
					// Corrupt optional metadata cannot establish a previous request.
				}
				const now = (deps.now ?? Date.now)();
				if (
					typeof last === "number" &&
					Number.isSafeInteger(last) &&
					last >= 0 &&
					now - last < REVIEW_COOLDOWN_MS
				)
					return false;
				if (!options.canShow()) return false;
				attempted = true;
				let request: Promise<void>;
				try {
					request = deps.request();
				} catch {
					request = Promise.reject();
				}
				try {
					deps.onRequested?.(options.source);
				} catch {
					// Optional analytics cannot affect the SDK or the completed task.
				}
				await Promise.allSettled([
					request,
					Promise.resolve().then(() =>
						deps.storage.setItem(deps.key, JSON.stringify(now)),
					),
				]);
				return true;
			} catch {
				// Version checks and local-storage outages silently skip this optional UI.
				return false;
			} finally {
				pending = false;
			}
		},
	};
}
