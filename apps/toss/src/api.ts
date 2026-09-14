import type {
	Draw,
	Feed,
	Generation,
	GenerationOptions,
	RoundContext,
} from "@645/lotto-core";
import { parseNumbers } from "@645/lotto-core";
import { getAnonymousKey, Storage } from "@apps-in-toss/framework";
import { createAppsInTossSessionStorage } from "@trailbase-apps-in-toss-kit/ait-rn/storage";
import {
	createAppsInTossSessionManager,
	normalizeTrailBaseAuthTokens,
	type TrailBaseAuthTokens,
	TrailBaseHttpError,
	toTrailBaseSdkTokens,
} from "@trailbase-apps-in-toss-kit/trailbase-client";
import { initClient } from "trailbase";
import { resolveLottoRuntime } from "./runtime-config";
import { createSavedStore } from "./saved-store";

const runtime = resolveLottoRuntime(
	import.meta.env.LOTTO_APP_ENV,
	import.meta.env.LOTTO_API_BASE_URL,
);
export const API_BASE = runtime.apiBase;
export const LOCAL_PREVIEW = runtime.local;
export type User = { id: string; displayName: string };
export type AdPlacement = "custom" | "report" | "attendance_restore";
export type AdConfig = {
	placements: {
		placement: AdPlacement;
		enabled: boolean;
		rewardedGroupId: string | null;
		interstitialGroupId: string | null;
		passDurationMs: number;
		rewardedWeight: number;
	}[];
	passes: Partial<Record<"custom" | "report", number>>;
	testMode: boolean;
	bannerGroupId: string | null;
	bannerGroups?: { card: string | null; inline: string | null };
	feedInlineGroupIds?: string[];
	serverTime: number;
};
export type Promotion = {
	kind: "daily" | "weekly" | "legacy";
	periodDay: number | null;
	campaignId: string | null;
	claimId: string | null;
	amount: number;
	eligible: boolean;
	available: boolean;
	status: string | null;
};
export type Attendance = {
	day: number;
	checkedIn: boolean;
	generatedToday: boolean;
	streak: number;
	cycleLength: number;
	canRestore: boolean;
	restoreLimit: number;
	notificationTemplateCode: string | null;
	notificationsEnabled: boolean;
	serverTime: number;
	promotions: Promotion[];
	promotionHistory: Promotion[];
};
export type AdSession =
	| { alreadyGranted: true }
	| {
			alreadyGranted: false;
			id: string;
			format: "rewarded" | "interstitial";
			groupId: string;
			expiresAt: number;
	  };

async function readResponse<T>(response: Response): Promise<T> {
	const parsed = (await response.json().catch(() => null)) as {
		error?: { message?: string };
	} | null;
	if (!response.ok)
		throw new TrailBaseHttpError(
			parsed?.error?.message || "연결을 확인하고 다시 시도해 주세요.",
			{
				status: response.status,
				statusText: response.statusText,
				payload: parsed,
			},
		);
	if (parsed === null || typeof parsed !== "object")
		throw new Error(
			"서버 응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
		);
	return parsed as T;
}
async function withTimeout<T>(
	operation: (signal: AbortSignal) => Promise<T>,
	parent?: AbortSignal,
): Promise<T> {
	const controller = new AbortController();
	const cancel = () => controller.abort();
	if (parent?.aborted) cancel();
	parent?.addEventListener("abort", cancel);
	const timer = setTimeout(cancel, 12_000);
	try {
		return await operation(controller.signal);
	} catch (error) {
		if (controller.signal.aborted && !parent?.aborted)
			throw new Error("연결이 오래 걸리고 있어요. 다시 시도해 주세요.");
		throw error;
	} finally {
		clearTimeout(timer);
		parent?.removeEventListener("abort", cancel);
	}
}
export function apiErrorCode(error: unknown): string | null {
	return error instanceof TrailBaseHttpError
		? ((error.payload as { error?: { code?: string } })?.error?.code ?? null)
		: null;
}
export async function publicGet<T>(
	path: string,
	signal?: AbortSignal,
): Promise<T> {
	return withTimeout(
		async (signal) =>
			readResponse<T>(
				await fetch(`${API_BASE}${path}`, {
					signal,
					headers: { Accept: "application/json" },
				}),
			),
		signal,
	);
}
export function newRequestId() {
	return `g-${Date.now().toString(36)}-${Array.from({ length: 4 }, () =>
		Math.floor(Math.random() * 0x100000000)
			.toString(16)
			.padStart(8, "0"),
	).join("")}`;
}

export function createApi() {
	const storage = createAppsInTossSessionStorage({
		appKey: runtime.storageKey,
		storage: Storage,
		// Explicit local preview uses the kit's persistent dev-anon identity.
		getAnonymousKey: LOCAL_PREVIEW ? async () => undefined : getAnonymousKey,
		production: !LOCAL_PREVIEW,
		allowFallback: false,
		productionRequired: true,
	});
	let client: ReturnType<typeof initClient> | null = null;
	let currentUser: User | null = null;
	let pending: Promise<User> | null = null;
	let epoch = 0;
	let paused = false;
	const interrupted = () =>
		new Error("연결 요청을 중단했어요. 다시 연결해 주세요.");
	function initialize(tokens: unknown) {
		const normalized = toTrailBaseSdkTokens(tokens);
		client = initClient(
			API_BASE,
			normalized
				? {
						tokens: {
							auth_token: normalized.auth_token,
							refresh_token: normalized.refresh_token ?? null,
							csrf_token: normalized.csrf_token ?? null,
						},
					}
				: {},
		);
		return client;
	}
	async function requestWith<T>(
		instance: ReturnType<typeof initClient>,
		path: string,
		body?: unknown,
	): Promise<T> {
		return withTimeout(async (signal) => {
			const response = await instance.fetch(path, {
				signal,
				method: body === undefined ? "GET" : "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: body === undefined ? undefined : JSON.stringify(body),
				throwOnError: false,
			});
			return readResponse<T>(response);
		});
	}
	const manager = createAppsInTossSessionManager<User>({
		...storage,
		appLogin: async () => {
			throw new Error("별도의 로그인이 필요하지 않아요.");
		},
		completeTossLogin: async () => {
			throw new Error("계정 연동을 사용하지 않아요.");
		},
		bootstrap: async (anonymousHash) => {
			const response = await withTimeout(async (signal) =>
				readResponse<{
					user: User;
					authTokens: TrailBaseAuthTokens;
				}>(
					await fetch(`${API_BASE}/api/app/v1/session/bootstrap`, {
						signal,
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ anonymousHash }),
					}),
				),
			);
			initialize(response.authTokens);
			return { user: response.user, tokens: response.authTokens };
		},
		loadSession: async (input) => {
			const instance = initialize(input.authTokens);
			const response = await requestWith<{ user: User }>(
				instance,
				"/api/app/v1/session/me",
			);
			return { ...response, tokens: instance.tokens() ?? input.authTokens };
		},
		isInvalidSessionError: (error) =>
			error instanceof TrailBaseHttpError && error.status === 401,
	});
	async function ensure(): Promise<User> {
		if (paused) throw interrupted();
		if (currentUser) return currentUser;
		if (pending) return pending;
		const attempt = epoch;
		pending = manager
			.getOrCreateAppSession()
			.then((session) => {
				if (attempt !== epoch || paused) throw interrupted();
				const tokens =
					normalizeTrailBaseAuthTokens(session) ?? session.authTokens;
				if (!tokens) throw new Error("연결 정보를 확인하지 못했어요.");
				initialize(tokens);
				currentUser = session.user;
				return session.user;
			})
			.finally(() => {
				pending = null;
			});
		return pending;
	}
	async function request<T>(path: string, body?: unknown): Promise<T> {
		const attempt = epoch;
		await ensure();
		if (attempt !== epoch || paused) throw interrupted();
		try {
			if (!client) throw new Error("세션을 다시 연결해 주세요.");
			const result = await requestWith<T>(client, path, body);
			if (attempt !== epoch || paused) throw interrupted();
			return result;
		} catch (error) {
			if (attempt !== epoch || paused) throw interrupted();
			if (error instanceof TrailBaseHttpError && error.status === 401) {
				currentUser = null;
				await manager.clearSessions();
				await ensure();
				if (!client) throw new Error("세션을 다시 연결해 주세요.");
				const result = await requestWith<T>(client, path, body);
				if (attempt !== epoch || paused) throw interrupted();
				return result;
			}
			throw error;
		}
	}
	return {
		ensure,
		request,
		saved: (user: User) =>
			createSavedStore(
				storage.storage,
				`${runtime.storageKey}.saved.v1.${user.id}`,
			),
		context: () => publicGet<RoundContext>("/api/app/v1/lotto/round-context"),
		feed: (round: number, signal?: AbortSignal, cursor?: string) =>
			publicGet<Feed>(
				`/api/app/v1/lotto/feed?round=${round}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
				signal,
			),
		generate: (requestId: string, round: number, options: GenerationOptions) =>
			request<{ generation: Generation; replayed: boolean }>(
				"/api/app/v1/lotto/generations",
				{ requestId, round, options },
			),
		removePublic: (id: number) =>
			request<{ deleted: boolean }>("/api/app/v1/lotto/generations/delete", {
				id,
			}),
		ads: () => request<AdConfig>("/api/app/v1/ads/config"),
		startAd: (placement: AdPlacement) =>
			request<AdSession>("/api/app/v1/ads/start", { placement }),
		completeAd: (id: string, events: string[]) =>
			request<{ feature: string; expiresAt: number }>(
				"/api/app/v1/ads/complete",
				{ id, events },
			),
		attendance: () => request<Attendance>("/api/app/v1/attendance/status"),
		checkIn: () =>
			request<{ streak: number; replayed: boolean }>(
				"/api/app/v1/attendance/check-in",
				{},
			),
		heartbeat: (active = true) =>
			request(
				`/api/app/v1/presence/${active ? "heartbeat" : "disconnect"}`,
				{},
			),
		async draw(round: number): Promise<Draw | null> {
			try {
				const row = await publicGet<Record<string, unknown>>(
					`/api/records/v1/lotto_draw_results/${round}`,
				);
				const numbers = parseNumbers(
					Array.from({ length: 6 }, (_, i) => row[`draw_number_${i + 1}`]),
				);
				if (!numbers || typeof row.bonus_number !== "number")
					throw new Error("결과를 확인하지 못했어요.");
				return {
					round,
					numbers,
					bonus: row.bonus_number,
					drawDate: String(row.draw_date),
				};
			} catch (error) {
				if (error instanceof TrailBaseHttpError && error.status === 404)
					return null;
				throw error;
			}
		},
		async withdraw() {
			paused = false;
			await ensure();
			if (!client) throw new Error("세션을 다시 연결해 주세요.");
			epoch += 1;
			paused = true;
			manager.cancelPendingOperations();
			// Old heartbeat/ad responses cannot re-bootstrap the account after deletion.
			await requestWith(client, "/api/app/v1/session/withdraw", {});
			currentUser = null;
			client = null;
			try {
				await manager.clearSessions();
				return { credentialsCleared: true };
			} catch {
				// The server has already revoked these credentials. Never bootstrap a new
				// identity as part of retrying a completed deletion.
				return { credentialsCleared: false };
			}
		},
		dispose() {
			epoch += 1;
			paused = true;
			manager.cancelPendingOperations();
		},
		reconnect() {
			if (paused) {
				paused = false;
				currentUser = null;
				client = null;
			}
		},
	};
}
export type Api = ReturnType<typeof createApi>;
