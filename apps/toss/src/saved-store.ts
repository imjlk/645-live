import { normalizeSaved, type SavedCombination } from "@645/lotto-core";

export const SAVED_LIMIT = 1_000;

export type Storage = {
	getItem(key: string): Promise<string | null> | string | null;
	setItem(key: string, value: string): Promise<void> | void;
};

/** Core user data must fail visibly, never silently fall back to memory or clear a corrupt file. */
export function createSavedStore(storage: Storage, key: string) {
	let queue: Promise<unknown> = Promise.resolve();
	async function read(): Promise<SavedCombination[]> {
		const value = await storage.getItem(key);
		return value === null || value === ""
			? []
			: normalizeSaved(JSON.parse(value));
	}
	function update(
		change: (current: SavedCombination[]) => SavedCombination[],
		replace = false,
	) {
		const operation = queue
			.catch(() => {})
			.then(async () => {
				const next = change(replace ? [] : await read());
				if (next.length > SAVED_LIMIT)
					throw new Error(
						`보관함은 ${SAVED_LIMIT.toLocaleString()}개까지 저장할 수 있어요. 이전 번호를 정리해 주세요.`,
					);
				const serialized = JSON.stringify(next);
				await storage.setItem(key, serialized);
				if ((await storage.getItem(key)) !== serialized)
					throw new Error("기기에 저장하지 못했어요. 다시 시도해 주세요.");
				return next;
			});
		queue = operation;
		return operation;
	}
	return {
		read,
		add: (item: SavedCombination) =>
			update((items) =>
				items.some((v) => v.id === item.id) ? items : [item, ...items],
			),
		remove: (id: string) => update((items) => items.filter((v) => v.id !== id)),
		celebrate: (ids: string[], fingerprint: string) =>
			update((items) =>
				items.map((v) =>
					ids.includes(v.id) ? { ...v, celebratedResult: fingerprint } : v,
				),
			),
		// Explicitly confirmed deletion can also recover from a corrupt local collection.
		clear: () => update(() => [], true),
	};
}
