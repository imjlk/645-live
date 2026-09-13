import {
	type CombinationReport,
	compareDraw,
	type Draw,
	EMPTY_OPTIONS,
	type Feed,
	type Generation,
	type GenerationOptions,
	type RoundContext,
	resultFingerprint,
	type SavedCombination,
} from "@645/lotto-core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { createAdController, setResultNotification } from "./ad-bridge";
import {
	type AdConfig,
	API_BASE,
	type Attendance,
	apiErrorCode,
	createApi,
	newRequestId,
	type User,
} from "./api";
import type { ReportState } from "./ReportHistory";
import { type ConnectionState, subscribeRealtime } from "./realtime";

const message = (value: unknown) =>
	value instanceof Error
		? value.message
		: "처리하지 못했어요. 다시 시도해 주세요.";

export function useLotto() {
	const api = useMemo(createApi, []);
	const adsController = useMemo(() => createAdController(api), [api]);
	const [user, setUser] = useState<User | null>(null);
	const [context, setContext] = useState<RoundContext | null>(null);
	const [feed, setFeed] = useState<Feed | null>(null);
	const [current, setCurrent] = useState<Generation | null>(null);
	const [saved, setSaved] = useState<SavedCombination[]>([]);
	const [savedReady, setSavedReady] = useState(false);
	const [reports, setReports] = useState<Record<string, ReportState>>({});
	const [results, setResults] = useState<Record<number, Draw>>({});
	const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
	const [attendance, setAttendance] = useState<Attendance | null>(null);
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [connection, setConnection] = useState<ConnectionState>("connecting");
	const [foreground, setForeground] = useState(
		AppState.currentState !== "background",
	);
	const [reducedMotion, setReducedMotion] = useState(true);
	const [celebration, setCelebration] = useState<string | null>(null);
	const [revision, setRevision] = useState(0);
	const pending = useRef<{
		id: string;
		round: number;
		options: GenerationOptions;
	} | null>(null);
	const active = useRef(true);
	const actionLock = useRef(false);
	const seenWins = useRef(new Set<string>());
	const store = useMemo(() => (user ? api.saved(user) : null), [api, user]);

	const run = useCallback(async (name: string, task: () => Promise<void>) => {
		if (actionLock.current) return;
		actionLock.current = true;
		setBusy(name);
		setError(null);
		try {
			await task();
		} catch (e) {
			if (active.current) setError(message(e));
		} finally {
			actionLock.current = false;
			if (active.current) setBusy(null);
		}
	}, []);

	const loadReport = useCallback(
		(item: SavedCombination) =>
			run("report", async () => {
				try {
					const data = await api.request<CombinationReport>(
						"/api/app/v1/lotto/report",
						{ numbers: item.numbers },
					);
					if (active.current)
						setReports((prev) => ({ ...prev, [item.id]: { data } }));
				} catch (error) {
					if (active.current)
						setReports((prev) => ({
							...prev,
							[item.id]: { error: message(error) },
						}));
				}
			}),
		[api, run],
	);

	const refreshPrivate = useCallback(async () => {
		const [ads, check] = await Promise.all([api.ads(), api.attendance()]);
		if (active.current) {
			setAdConfig(ads);
			setAttendance(check);
			adsController.preload(ads);
		}
	}, [api, adsController]);

	useEffect(() => {
		active.current = true;
		void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
		const motion = AccessibilityInfo.addEventListener(
			"reduceMotionChanged",
			setReducedMotion,
		);
		const subscription = AppState.addEventListener("change", (state) =>
			setForeground(state === "active"),
		);
		return () => {
			active.current = false;
			motion.remove();
			subscription.remove();
			api.dispose();
			adsController.dispose();
		};
	}, [api, adsController]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Revision represents an explicit user retry.
	useEffect(() => {
		let cancelled = false;
		setError(null);
		void (async () => {
			try {
				const context = await api.context();
				if (cancelled) return;
				setContext(context);
				const initial = await api.feed(context.targetRound);
				if (cancelled) return;
				setFeed(initial);
				const account = await api.ensure();
				if (cancelled) return;
				setUser(account);
				const items = await api.saved(account).read();
				if (cancelled) return;
				setSaved(items);
				setSavedReady(true);
				await refreshPrivate();
			} catch (e) {
				if (!cancelled) setError(message(e));
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [api, revision, refreshPrivate]);

	useEffect(() => {
		const round = context?.targetRound;
		if (!round || !foreground) return;
		let closed = false;
		let refreshing = false;
		let dirty = false;
		let debounce: ReturnType<typeof setTimeout> | undefined;
		const refresh = async () => {
			if (closed) return;
			if (refreshing) {
				dirty = true;
				return;
			}
			refreshing = true;
			try {
				const next = await api.feed(round);
				if (!closed) setFeed(next);
			} catch {
				if (!closed) setConnection("reconnecting");
			} finally {
				refreshing = false;
				if (dirty && !closed) {
					dirty = false;
					changed();
				}
			}
		};
		const changed = () => {
			if (debounce || closed) return;
			debounce = setTimeout(() => {
				debounce = undefined;
				void refresh();
			}, 180);
		};
		const cleanup = [
			subscribeRealtime({
				url: `${API_BASE}/api/records/v1/lotto_public_generations/subscribe/*`,
				onChange: changed,
				onState: (state) => {
					if (!closed) setConnection(state);
				},
			}),
			subscribeRealtime({
				url: `${API_BASE}/api/records/v1/lotto_draw_generation_counts/subscribe/${round}`,
				onChange: changed,
				onState: () => {},
			}),
		];
		void refresh();
		const poll = setInterval(changed, 30_000);
		const roundPoll = setInterval(
			() =>
				void api
					.context()
					.then((next) => {
						if (!closed) setContext(next);
					})
					.catch(() => {}),
			30_000,
		);
		return () => {
			closed = true;
			for (const close of cleanup) close();
			if (debounce) clearTimeout(debounce);
			clearInterval(poll);
			clearInterval(roundPoll);
		};
	}, [api, context?.targetRound, foreground]);

	useEffect(() => {
		if (!user) return;
		if (!foreground) {
			void api.heartbeat(false).catch(() => {});
			return;
		}
		void api.heartbeat().catch(() => {});
		void refreshPrivate().catch(() => {});
		const timer = setInterval(
			() => void api.heartbeat().catch(() => {}),
			30_000,
		);
		return () => {
			clearInterval(timer);
		};
	}, [api, user, foreground, refreshPrivate]);

	useEffect(() => {
		if (!user || !foreground) return;
		const timer = setInterval(
			() => void refreshPrivate().catch(() => {}),
			60_000,
		);
		return () => clearInterval(timer);
	}, [user, foreground, refreshPrivate]);

	const roundsKey = [...new Set(saved.map((s) => s.round))]
		.sort((a, b) => b - a)
		.join(",");
	const resultTime = context?.latestDraw
		? resultFingerprint(context.latestDraw)
		: "";
	// biome-ignore lint/correctness/useExhaustiveDependencies: Re-fetch saved results after an imported result correction or explicit retry.
	useEffect(() => {
		if (!foreground || !roundsKey) return;
		let closed = false;
		// Bound concurrency even for a large local collection spanning many rounds.
		void (async () => {
			const rounds = roundsKey.split(",").map(Number);
			const collected: Record<number, Draw> = {};
			for (let start = 0; start < rounds.length; start += 4) {
				const values = await Promise.allSettled(
					rounds.slice(start, start + 4).map((round) => api.draw(round)),
				);
				if (closed) return;
				for (const value of values)
					if (value.status === "fulfilled" && value.value)
						collected[value.value.round] = value.value;
			}
			if (!closed) setResults((prev) => ({ ...prev, ...collected }));
		})();
		return () => {
			closed = true;
		};
	}, [api, roundsKey, resultTime, foreground, revision]);

	useEffect(() => {
		if (!foreground || !store || !savedReady) return;
		const winning = saved.find((item) => {
			const draw = results[item.round];
			if (!draw) return false;
			const fingerprint = resultFingerprint(draw);
			return (
				compareDraw(item.numbers, draw).rank !== null &&
				item.celebratedResult !== fingerprint &&
				!seenWins.current.has(`${item.id}:${fingerprint}`)
			);
		});
		if (!winning) return;
		const fingerprint = resultFingerprint(results[winning.round]);
		seenWins.current.add(`${winning.id}:${fingerprint}`);
		void store
			.celebrate([winning.id], fingerprint)
			.then((items) => {
				if (!active.current) return;
				setSaved(items);
				const rank = compareDraw(winning.numbers, results[winning.round]).rank;
				setNotice(
					`${winning.round}회에 ${rank}등 번호가 있어요! 보관함에서 확인해 보세요.`,
				);
				if (!reducedMotion) setCelebration(`${winning.id}:${fingerprint}`);
			})
			.catch((e) => setError(message(e)));
	}, [foreground, store, savedReady, saved, results, reducedMotion]);

	async function save(generation: Generation) {
		if (!store || !savedReady)
			throw new Error("보관함 연결을 먼저 확인해 주세요.");
		const items = await store.add({
			version: 1,
			id: `generation-${generation.id}`,
			generationId: generation.id,
			round: generation.round,
			numbers: generation.numbers,
			savedAt: Date.now(),
		});
		setSaved(items);
		setNotice("이 기기의 보관함에 저장했어요.");
		if (attendance?.notificationsEnabled)
			await api
				.request("/api/app/v1/notifications/watch-result", {
					round: generation.round,
				})
				.catch(() =>
					setNotice(
						"번호는 저장했어요. 결과 알림은 설정에서 다시 신청해 주세요.",
					),
				);
	}
	return {
		user,
		reports,
		loadReport,
		context,
		feed,
		current,
		saved,
		savedReady,
		results,
		adConfig,
		attendance,
		busy,
		error,
		notice,
		connection,
		reducedMotion,
		celebration,
		clearNotice: () => setNotice(null),
		clearError: () => setError(null),
		finishCelebration: () => setCelebration(null),
		retry: () => setRevision((v) => v + 1),
		generate: (options: GenerationOptions = EMPTY_OPTIONS) =>
			run("generate", async () => {
				const round = await api.context();
				setContext(round);
				if (!pending.current)
					pending.current = {
						id: newRequestId(),
						round: round.targetRound,
						options: JSON.parse(JSON.stringify(options)),
					};
				const request = pending.current;
				try {
					const response = await api.generate(
						request.id,
						request.round,
						request.options,
					);
					pending.current = null;
					setCurrent(response.generation);
					await api
						.feed(round.targetRound)
						.then(setFeed)
						.catch(() => {});
				} catch (e) {
					if (
						[
							"ROUND_CHANGED",
							"GENERATION_DELETED",
							"INVALID_OPTIONS",
							"IMPOSSIBLE_OPTIONS",
							"PASS_REQUIRED",
						].includes(apiErrorCode(e) ?? "")
					)
						pending.current = null;
					throw e;
				}
			}),
		save: (generation: Generation) => run("save", () => save(generation)),
		remove: (item: SavedCombination) =>
			run("remove", async () => {
				if (store) setSaved(await store.remove(item.id));
			}),
		removePublic: (item: SavedCombination) =>
			run("removePublic", async () => {
				const result = await api.removePublic(item.generationId);
				if (store) setSaved(await store.remove(item.id));
				setNotice(
					result.deleted
						? "내 공개 생성 내역과 기기 보관 번호를 삭제했어요."
						: "기기 보관 번호를 삭제했어요. 다른 사람이 만든 공개 내역은 유지돼요.",
				);
			}),
		checkIn: () =>
			run("checkIn", async () => {
				const result = await api.checkIn();
				await refreshPrivate();
				setNotice(
					result.passGranted
						? "3일 연속 출석! 맞춤 생성과 분석 이용권이 열렸어요."
						: "오늘 출석했어요. 내일도 만나요!",
				);
			}),
		unlock: (feature: "custom" | "report") =>
			run(`unlock-${feature}`, async () => {
				await adsController.unlock(feature);
				await refreshPrivate();
				setNotice("24시간 이용권이 열렸어요.");
			}),
		notifications: (enabled: boolean) =>
			run("notifications", async () => {
				const template = attendance?.notificationTemplateCode;
				if (!template) throw new Error("결과 알림을 준비 중이에요.");
				const rounds = saved
					.map((v) => v.round)
					.filter((r) => r >= (context?.targetRound ?? 1) - 1);
				const opted = await setResultNotification(
					api,
					template,
					enabled,
					rounds,
				);
				await refreshPrivate();
				setNotice(
					opted
						? "보관한 번호의 결과가 나오면 알려드릴게요."
						: "결과 알림을 껐어요.",
				);
			}),
		promotion: () =>
			run("promotion", async () => {
				const result = await api.request<{ status: string; amount: number }>(
					"/api/app/v1/attendance/promotion/claim",
					{ campaignId: attendance?.promotion?.campaignId },
				);
				await refreshPrivate();
				setNotice(
					result.status === "success"
						? `${result.amount}원을 받았어요.`
						: result.status === "needs_review" || result.status === "failed"
							? "지급 확인에 도움이 필요해요. support@645.live로 문의해 주세요."
							: "지급 결과를 확인 중이에요. 잠시 후 지급 상태를 다시 확인해 주세요.",
				);
			}),
		withdraw: () =>
			run("withdraw", async () => {
				await api.withdraw();
				setUser(null);
				setSaved([]);
				setSavedReady(false);
				setAdConfig(null);
				setAttendance(null);
				setNotice("미니앱 이용 데이터와 기기 보관함을 삭제했어요.");
			}),
	};
}
