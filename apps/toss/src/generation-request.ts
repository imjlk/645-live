import type {
	Generation,
	GenerationOptions,
	RoundContext,
} from "@645/lotto-core";

export type GenerationResponse = {
	generation: Generation;
	replayed: boolean;
	generationAdRequired?: boolean;
};
type Dependencies = {
	context(): Promise<RoundContext>;
	generate(
		id: string,
		round: number,
		options: GenerationOptions,
		clientManagedCounter?: boolean,
	): Promise<GenerationResponse>;
	errorCode(error: unknown): string | null;
	newRequestId(): string;
};

/** Reuse the loaded round; only a server-confirmed rollover needs another GET. */
export function createGenerationRequest(api: Dependencies) {
	let pending: {
		id: string;
		round: number;
		options: GenerationOptions;
	} | null = null;
	return async (
		options: GenerationOptions,
		cached: RoundContext | null,
		clientManagedCounter: boolean,
	) => {
		let context = cached ?? (await api.context());
		const serialized = JSON.stringify(options);
		for (let attempt = 0; ; attempt++) {
			if (
				!pending ||
				pending.round !== context.targetRound ||
				JSON.stringify(pending.options) !== serialized
			)
				pending = {
					id: api.newRequestId(),
					round: context.targetRound,
					options: JSON.parse(serialized),
				};
			try {
				const response = await api.generate(
					pending.id,
					pending.round,
					pending.options,
					clientManagedCounter,
				);
				pending = null;
				return { response, context };
			} catch (error) {
				const code = api.errorCode(error);
				if (
					[
						"ROUND_CHANGED",
						"GENERATION_DELETED",
						"INVALID_OPTIONS",
						"IMPOSSIBLE_OPTIONS",
						"PASS_REQUIRED",
					].includes(code ?? "")
				)
					pending = null;
				if (code !== "ROUND_CHANGED" || attempt > 0) throw error;
				context = await api.context();
			}
		}
	};
}
