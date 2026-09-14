import type { Generation } from "@645/lotto-core";
import { getContext, setContext } from "svelte";
import type { GenerationPreview } from "$lib/server/generation-preview";
import { getTrailbaseBrowserBaseUrl } from "$lib/trailbase/browser-base";
import {
	type Batch,
	createGenerationSession,
	GenerationApiError,
	IDENTITY_KEY,
} from "./api";
import { createLiveGenerations } from "./live.svelte";
import {
	CURRENT_KEY,
	PENDING_KEY,
	parseBatch,
	parseGenerations,
	SAVED_KEY,
} from "./storage";

const KEY = Symbol("web-generator");
function createModel(initial: GenerationPreview) {
	const live = createLiveGenerations(initial, getTrailbaseBrowserBaseUrl);
	let current = $state<Generation[]>([]);
	let saved = $state<Generation[]>([]);
	let pending = $state<Batch | null>(null);
	let ready = $state(false);
	let active = false;
	let busy = $state(false);
	let error = $state("");
	let notice = $state("");
	let session: ReturnType<typeof createGenerationSession>;
	function load() {
		try {
			current = parseGenerations(localStorage.getItem(CURRENT_KEY));
			saved = parseGenerations(localStorage.getItem(SAVED_KEY));
			pending = parseBatch(localStorage.getItem(PENDING_KEY));
			ready = true;
			error = "";
		} catch (e) {
			ready = false;
			error =
				e instanceof Error
					? e.message
					: "브라우저 저장 공간을 사용할 수 없어요.";
		}
	}
	function store(key: string, value: unknown) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			throw new Error(
				"기기 저장 공간이 부족하거나 저장이 차단됐어요. 보관함을 백업한 뒤 공간을 확보해 주세요.",
			);
		}
	}
	async function locked(action: () => Promise<void>) {
		if (!ready || busy || !active) return;
		busy = true;
		error = "";
		notice = "";
		try {
			// Serialize writes across tabs so a second request cannot overwrite a
			// first request's recovery record or race a server-data deletion.
			if (navigator.locks)
				await navigator.locks.request("645-web-generator", async () => {
					if (active) await action();
				});
			else await action();
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: "처리하지 못했어요. 다시 확인해 주세요.";
		} finally {
			busy = false;
		}
	}
	async function settlePending() {
		const batch = parseBatch(localStorage.getItem(PENDING_KEY));
		pending = batch;
		if (!batch) return;
		const clear = () => {
			if (
				parseBatch(localStorage.getItem(PENDING_KEY))?.requestId ===
				batch.requestId
			)
				localStorage.removeItem(PENDING_KEY);
			pending = parseBatch(localStorage.getItem(PENDING_KEY));
		};
		try {
			const result = await session.publish(batch);
			store(CURRENT_KEY, result.generations);
			clear();
			current = result.generations;
			notice = `${result.generations.length}게임을 만들고 실시간 현황에 반영했어요.`;
			void live.refresh();
		} catch (e) {
			if (
				e instanceof GenerationApiError &&
				["ROUND_CHANGED", "GENERATION_DELETED", "REQUEST_CONFLICT"].includes(
					e.code,
				)
			) {
				clear();
				void live.refresh();
			}
			throw e;
		}
	}
	async function retry() {
		await locked(settlePending);
	}
	async function publish(games: number[][]) {
		let created = false;
		await locked(async () => {
			pending = parseBatch(localStorage.getItem(PENDING_KEY));
			if (pending) {
				await settlePending();
				return;
			}
			await live.refresh();
			if (!active) return;
			if (!live.context)
				throw new Error("생성할 회차를 확인하지 못했어요. 다시 연결해 주세요.");
			const batch = {
				requestId: crypto.randomUUID(),
				round: live.context.targetRound,
				games,
			};
			store(PENDING_KEY, batch);
			pending = batch;
			await settlePending();
			created = true;
		});
		return created;
	}
	function toggleSave(g: Generation) {
		if (!ready) return;
		try {
			const latest = parseGenerations(localStorage.getItem(SAVED_KEY));
			const exists = latest.some((s) => s.id === g.id);
			const next = exists
				? latest.filter((s) => s.id !== g.id)
				: [g, ...latest];
			store(SAVED_KEY, next);
			saved = next;
			notice = exists
				? "이 기기의 보관함에서 삭제했어요."
				: "이 기기에 보관했어요.";
			error = "";
		} catch (e) {
			error = e instanceof Error ? e.message : "보관하지 못했어요.";
		}
	}
	async function withdraw() {
		await locked(async () => {
			await session.withdraw();
			localStorage.removeItem(CURRENT_KEY);
			localStorage.removeItem(PENDING_KEY);
			current = [];
			pending = null;
			notice =
				"이 브라우저에서 공유한 기록을 삭제했어요. 기기의 보관함은 유지됩니다.";
			void live.refresh();
		});
	}
	function start() {
		active = true;
		try {
			session = createGenerationSession(
				getTrailbaseBrowserBaseUrl().replace(/\/$/, ""),
				localStorage,
			);
			load();
		} catch {
			error = "브라우저의 저장 공간을 사용할 수 없어요.";
		}
		const stop = live.start();
		const heartbeat = () => {
			if (document.visibilityState === "visible" && ready)
				void session.heartbeat().catch(() => {});
		};
		heartbeat();
		const timer = setInterval(heartbeat, 45000);
		const sync = (e: StorageEvent) => {
			if (
				[null, IDENTITY_KEY, SAVED_KEY, CURRENT_KEY, PENDING_KEY].includes(
					e.key,
				)
			) {
				if (e.key === null || e.key === IDENTITY_KEY) session.reset();
				load();
			}
		};
		window.addEventListener("storage", sync);
		return () => {
			active = false;
			stop();
			session?.reset();
			clearInterval(timer);
			window.removeEventListener("storage", sync);
		};
	}
	return {
		live,
		get current() {
			return current;
		},
		get saved() {
			return saved;
		},
		get pending() {
			return pending;
		},
		get ready() {
			return ready;
		},
		get busy() {
			return busy;
		},
		get error() {
			return error;
		},
		get notice() {
			return notice;
		},
		start,
		publish,
		retry,
		toggleSave,
		withdraw,
	};
}
export type GeneratorModel = ReturnType<typeof createModel>;
export function provideGenerator(initial: GenerationPreview) {
	const model = createModel(initial);
	setContext(KEY, model);
	return model;
}
export function useGenerator() {
	return getContext<GeneratorModel>(KEY);
}
