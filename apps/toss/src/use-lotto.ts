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
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { createAdController, setResultNotification } from "./ad-bridge";
import {
	type AdConfig,
	type AdPlacement,
	API_BASE,
	type Attendance,
	apiErrorCode,
	createApi,
	LOCAL_PREVIEW,
	type LocalAttendanceAction,
	newRequestId,
	type Promotion,
	type User,
} from "./api";
import { createFeedHistory, deletedGenerationId } from "./feed-history";
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
	const feedHistory = useMemo(
		() =>
			createFeedHistory((round, signal, cursor) =>
				api.feed(round, signal, cursor),
			),
		[api],
	);
	const history = useSyncExternalStore(
		feedHistory.subscribe,
		feedHistory.getSnapshot,
	);
	const receiveFeed = useCallback(
		(next: Feed) => {
			setFeed((current) =>
				current &&
				(current.round > next.round ||
					(current.round === next.round &&
						current.serverTime > next.serverTime))
					? current
					: next,
			);
			feedHistory.receive(next);
		},
		[feedHistory],
	);
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
	const [refreshing, setRefreshing] = useState(false);
	const pending = useRef<{
		id: string;
		round: number;
		options: GenerationOptions;
	} | null>(null);
	const active = useRef(true);
	const actionLock = useRef(false);
	const seenWins = useRef(new Set<string>());
	const store = useMemo(() => (user ? api.saved(user) : null), [api, user]);
	const clearNotice = useCallback(() => setNotice(null), []);
	const clearError = useCallback(() => setError(null), []);
	const retry = useCallback(() => {
		if (!actionLock.current) {
			api.reconnect();
			setRevision((v) => v + 1);
		}
	}, [api]);

	const run = useCallback(async (name: string, task: () => Promise<void>) => {
		if (actionLock.current) return false;
		actionLock.current = true;
		setBusy(name);
		setError(null);
		try {
			await task();
			return true;
		} catch (e) {
			if (active.current) setError(message(e));
			return false;
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
			feedHistory.cancel();
		};
	}, [api, adsController, feedHistory]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Revision represents an explicit user retry.
	useEffect(() => {
		let cancelled = false;
		setRefreshing(true);
		setError(null);
		void (async () => {
			try {
				const context = await api.context();
				if (cancelled) return;
				setContext(context);
				const initial = await api.feed(context.targetRound);
				if (cancelled) return;
				receiveFeed(initial);
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
			} finally {
				if (!cancelled) setRefreshing(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [api, revision, refreshPrivate, receiveFeed]);

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
				if (!closed) receiveFeed(next);
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
				onChange: (event) => {
					const id = event ? deletedGenerationId(event.data) : null;
					if (id !== null) feedHistory.remove(id);
					changed();
				},
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
	}, [api, context?.targetRound, foreground, receiveFeed, feedHistory]);

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
	useEffect(() => {
		if (reducedMotion) setCelebration(null);
	}, [reducedMotion]);
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
			let failed = false;
			for (let start = 0; start < rounds.length; start += 4) {
				const values = await Promise.allSettled(
					rounds.slice(start, start + 4).map((round) => api.draw(round)),
				);
				if (closed) return;
				for (const value of values) {
					if (value.status === "fulfilled" && value.value)
						collected[value.value.round] = value.value;
					if (value.status === "rejected") failed = true;
				}
			}
			if (!closed) {
				setResults((prev) => ({ ...prev, ...collected }));
				if (failed)
					setError(
						"일부 당첨 결과를 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.",
					);
			}
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
		history,
		feedHistory,
		current,
		saved,
		savedReady,
		results,
		adConfig,
		generationAdRequired: adConfig?.generationAdRequired === true,
		adUnavailableReason: adsController.unavailableReason(),
		attendance,
		busy,
		refreshing,
		error,
		notice,
		connection,
		reducedMotion,
		celebration,
		clearNotice,
		clearError,
		finishCelebration: () => setCelebration(null),
		retry,
		prepareGenerationAd: () =>
			run("generationAd", async () => {
				if (!LOCAL_PREVIEW) return;
				await api.request("/api/app/v1/dev/entitlements", {
					action: "generation_ad",
				});
				await refreshPrivate();
			}),
		generate: (options: GenerationOptions = EMPTY_OPTIONS, watchAd = false) =>
			run("generate", async () => {
				// Only the explicitly labelled ad CTA is allowed to open a full-screen ad.
				if (watchAd) {
					const result = await adsController.unlock("generation_continue");
					if (result?.continuedWithoutAd)
						setNotice("광고를 불러오지 못해 바로 이어서 만들어요.");
				}
				const round = await api.context();
				setContext(round);
				const serializedOptions = JSON.stringify(options);
				if (
					!pending.current ||
					pending.current.round !== round.targetRound ||
					JSON.stringify(pending.current.options) !== serializedOptions
				)
					pending.current = {
						id: newRequestId(),
						round: round.targetRound,
						options: JSON.parse(serializedOptions),
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
					setAdConfig((previous) =>
						previous
							? {
									...previous,
									generationAdRequired: response.generationAdRequired === true,
								}
							: previous,
					);
					await api
						.attendance()
						.then(setAttendance)
						.catch(() => {});
					await api
						.feed(round.targetRound)
						.then(receiveFeed)
						.catch(() => {});
				} catch (e) {
					if (apiErrorCode(e) === "GENERATION_AD_REQUIRED") {
						await api
							.ads()
							.then(setAdConfig)
							.catch(() => {});
					}
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
				await api.checkIn();
				const state = await api.attendance();
				setAttendance(state);
				const daily = state.promotions.find(
					(p) => p.kind === "daily" && p.eligible,
				);
				if (!daily) {
					setNotice("오늘 출석했어요. 내일도 만나요!");
					return;
				}
				try {
					const result = await api.request<{ status: string; amount: number }>(
						"/api/app/v1/attendance/promotion/claim",
						{
							kind: daily.kind,
							periodDay: daily.periodDay,
							campaignId: daily.campaignId,
						},
					);
					setNotice(
						result.status === "success"
							? `출석 완료! ${result.amount}P를 받았어요.`
							: "출석했어요. 포인트 지급 상태를 확인해 주세요.",
					);
				} catch {
					setNotice(
						"출석은 완료했어요. 아래에서 일일 혜택을 다시 확인해 주세요.",
					);
				} finally {
					await refreshPrivate();
				}
			}),
		testPass: (feature?: "custom" | "report") =>
			run("test-pass", async () => {
				if (!LOCAL_PREVIEW)
					throw new Error("로컬 테스트에서만 사용할 수 있어요.");
				await api.request(
					"/api/app/v1/dev/entitlements",
					feature ? { action: "unlock", feature } : { action: "reset" },
				);
				await refreshPrivate();
				setNotice(
					feature
						? "테스트 이용권을 열었어요. 바로 기능을 확인해 보세요."
						: "테스트 이용권을 초기화했어요. 광고 시청을 다시 확인할 수 있어요.",
				);
			}),
		localAttendance: (action: LocalAttendanceAction) =>
			run("local-attendance", async () => {
				if (!LOCAL_PREVIEW)
					throw new Error("로컬 테스트에서만 사용할 수 있어요.");
				await api.request("/api/app/v1/dev/attendance", action);
				await refreshPrivate();
				setNotice(
					action.action === "restore"
						? "테스트 출석을 복구했어요."
						: "로컬 출석 시나리오를 준비했어요.",
				);
			}),
		unlock: (feature: AdPlacement) =>
			run(`unlock-${feature}`, async () => {
				let refreshed = true;
				try {
					await adsController.unlock(feature);
				} finally {
					await refreshPrivate().catch(() => {
						refreshed = false;
					});
				}
				if (!refreshed) {
					setNotice(
						"광고 처리는 완료했어요. 새로고침하면 출석·이용권 현황을 확인할 수 있어요.",
					);
					return;
				}
				setNotice(
					feature === "attendance_restore"
						? "놓친 출석을 복구했어요. 연속 출석을 이어가세요!"
						: "24시간 이용권이 열렸어요.",
				);
			}),
		notifications: (enabled: boolean) =>
			run("notifications", async () => {
				const template = attendance?.notificationTemplateCode;
				if (!template) throw new Error("결과 알림을 준비 중이에요.");
				const rounds = saved
					.map((v) => v.round)
					.filter((r) => r >= (context?.targetRound ?? 1) - 1);
				let opted: boolean;
				try {
					opted = await setResultNotification(api, template, enabled, rounds);
				} finally {
					// Agreement may succeed before a round watch fails. Keep the switch
					// consistent with the saved consent even on that partial failure.
					await refreshPrivate();
				}
				setNotice(
					opted
						? "보관한 번호의 결과가 나오면 알려드릴게요."
						: "결과 알림을 껐어요.",
				);
			}),
		testPromotion: (kind: "daily" | "weekly") =>
			run("promotion-test", async () => {
				const result = await api.request<{ testOnly: true; status: string }>(
					"/api/app/v1/attendance/promotion/test",
					{ kind },
				);
				if (result.status === "success" || result.status === "recorded") {
					setNotice("테스트 호출이 완료됐어요. 토스 콘솔에서 확인해 주세요.");
					return;
				}
				setNotice(
					result.status === "pending"
						? "테스트 처리 중이에요. 같은 버튼을 누르면 기존 요청의 상태를 확인해요."
						: "테스트가 완료되지 않았어요. 서버 설정과 토스 콘솔을 확인해 주세요.",
				);
			}),
		promotion: (promotion: Promotion) =>
			run("promotion", async () => {
				const result = await api.request<{ status: string; amount: number }>(
					"/api/app/v1/attendance/promotion/claim",
					{
						campaignId: promotion.campaignId,
						kind: promotion.kind === "legacy" ? undefined : promotion.kind,
						periodDay: promotion.periodDay,
						claimId: promotion.claimId,
					},
				);
				await refreshPrivate();
				setNotice(
					result.status === "success"
						? `${result.amount}P를 받았어요.`
						: result.status === "needs_review" || result.status === "failed"
							? "지급 확인에 도움이 필요해요. support@645.live로 문의해 주세요."
							: "지급 결과를 확인 중이에요. 잠시 후 지급 상태를 다시 확인해 주세요.",
				);
			}),
		withdraw: () =>
			run("withdraw", async () => {
				if (!store) throw new Error("보관함 연결을 먼저 확인해 주세요.");
				// Clear the explicitly selected device data before revoking its server identity;
				// a storage failure remains retryable under the same identity.
				setSaved(await store.clear());
				const result = await api.withdraw();
				setUser(null);
				setSaved([]);
				setSavedReady(false);
				setAdConfig(null);
				setAttendance(null);
				setNotice("미니앱 이용 데이터와 기기 보관함을 삭제했어요.");
				if (!result.credentialsCleared)
					setError(
						"데이터 삭제는 완료했어요. 기기의 연결 정보를 정리하려면 토스 앱을 다시 열어 주세요.",
					);
			}),
	};
}

export type LottoModel = ReturnType<typeof useLotto>;
