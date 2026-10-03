import type { RoundContext, SavedCombination } from "@645/lotto-core";
import type { Api, User } from "./api";
import { createPerformanceTracker } from "./performance";
import type { createProductTelemetry } from "./product-telemetry";
/** Public context and authentication are independent. Feed loading belongs to the subscription effect. */
export async function loadLottoStartup(
	api: Pick<Api, "context" | "ensure" | "saved">,
	callbacks: {
		active: () => boolean;
		context: (value: RoundContext) => void;
		user: (value: User) => void;
		saved: (value: SavedCombination[]) => void;
		private: () => Promise<void>;
		track: ReturnType<typeof createProductTelemetry>;
	},
	signal?: AbortSignal,
) {
	const performance = createPerformanceTracker(callbacks.track);
	const contextTime = performance.start("startup_context", "startup");
	const sessionTime = performance.start("startup_session", "startup");
	const context = (async () => {
		try {
			const value = await api.context(signal);
			if (callbacks.active()) {
				callbacks.context(value);
				contextTime.end();
			} else contextTime.end("canceled");
		} catch (error) {
			contextTime.end(callbacks.active() ? "failed" : "canceled");
			throw error;
		}
	})();
	const account = (async () => {
		try {
			const user = await api.ensure();
			if (!callbacks.active()) {
				sessionTime.end("canceled");
				return;
			}
			callbacks.user(user);
			sessionTime.end();
			const state = await Promise.allSettled([
				api
					.saved(user)
					.read()
					.then((items) => {
						if (callbacks.active()) callbacks.saved(items);
					}),
				callbacks.private(),
			]);
			const failed = state.find((value) => value.status === "rejected");
			if (failed?.status === "rejected") throw failed.reason;
		} catch (error) {
			sessionTime.end(callbacks.active() ? "failed" : "canceled");
			throw error;
		}
	})();
	const results = await Promise.allSettled([context, account]);
	const failed = results.find((value) => value.status === "rejected");
	if (failed?.status === "rejected") throw failed.reason;
}
