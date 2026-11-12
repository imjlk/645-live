import { describe, expect, test } from "bun:test";
import type { Attendance, Promotion, RewardPolicy } from "./api";
import {
	checkInLabel,
	kstEndLabel,
	kstStartLabel,
	pointWindowHeadline,
	pointWindowNotice,
	promotionButton,
	visiblePointRewards,
} from "./reward-policy";

// Fixed fixture: 2026-12-08 00:00 KST, an exclusive day-8 boundary.
const DAY_EIGHT = Date.UTC(2026, 11, 7, 15);

const reward = (overrides: Partial<Promotion> = {}): Promotion => ({
	kind: "weekly",
	periodDay: 1,
	campaignId: "weekly-30",
	claimId: null,
	amount: 30,
	eligible: true,
	available: true,
	status: null,
	...overrides,
});
const attendance = (overrides: Partial<Attendance> = {}) =>
	({
		checkedIn: false,
		promotions: [],
		...overrides,
	}) as unknown as Attendance;

const currentProgram: NonNullable<RewardPolicy["program"]> = {
	startsAt: DAY_EIGHT - 7 * 86_400_000,
	started: true,
	rewards: [
		{
			kind: "daily" as const,
			amount: 1,
			available: true,
			unavailableReason: null,
		},
		{
			kind: "weekly" as const,
			amount: 10,
			available: true,
			unavailableReason: null,
		},
	],
};
const programState = () => ({
	...attendance({}),
	promotions: [
		reward({ amount: 50, claimId: "past-reward", available: false }),
	],
	rewardPolicy: {
		version: "attendance-rewards-v2",
		noticeStartsAt: null,
		noticeActive: false,
		legacyPointsEndsAt: 1,
		welcomePointDays: 15,
		windowStart: "first_check_in" as const,
		welcomeStreakLimit: 1,
		pointWindow: {
			status: "WELCOME",
			cohort: "WELCOME",
			endsAt: DAY_EIGHT,
		} as RewardPolicy["pointWindow"],
		program: structuredClone(currentProgram),
	},
});

describe("current program notice", () => {
	test("historical claims and unclaimed snapshots never set the advertised amount", () => {
		for (const claimId of ["past-reward", null]) {
			const state = programState();
			state.promotions[0].claimId = claimId;
			expect(pointWindowNotice(state)).toContain("10P");
			expect(pointWindowNotice(state)).not.toContain("50P");
			expect(state.promotions[0].amount).toBe(50);
		}
	});
	test("an exhausted reward is qualified independently of the remaining reward", () => {
		const state = programState();
		const weekly = state.rewardPolicy.program.rewards[1];
		weekly.available = false;
		weekly.unavailableReason = "budget_exhausted";
		expect(pointWindowNotice(state)).toContain("매일 1P");
		expect(pointWindowNotice(state)).toContain("연속 출석 예산 소진");
		expect(pointWindowNotice(state)).not.toContain("10P");
	});
	test("both exhausted budgets remove payment promises from both notices", () => {
		const state = programState();
		for (const reward of state.rewardPolicy.program.rewards) {
			reward.available = false;
			reward.unavailableReason = "budget_exhausted";
		}
		for (const text of [pointWindowNotice(state), pointWindowHeadline(state)]) {
			expect(text).toBe("출석 포인트 예산이 소진됐어요.");
			expect(text).not.toContain("받을 수 있어요");
		}
	});
	test("program start is separate from a participant's first check-in", () => {
		const state = programState();
		state.rewardPolicy.pointWindow = {
			status: "NOT_STARTED",
			cohort: "WELCOME",
			endsAt: null,
		};
		state.rewardPolicy.program.started = false;
		for (const text of [pointWindowNotice(state), pointWindowHeadline(state)])
			expect(text).toBe("출석 포인트 혜택은 12월 1일부터 시작돼요.");
		state.rewardPolicy.program.started = true;
		expect(pointWindowNotice(state)).toContain("첫 출석부터 15일");
		expect(pointWindowHeadline(state)).toContain("출석하면 15일");
	});
	test("older servers never fall back to historical amounts or an unverified start", () => {
		const state: Attendance = programState();
		delete state.rewardPolicy?.program;
		expect(pointWindowNotice(state)).not.toMatch(/50P|10P/);
		expect(pointWindowHeadline(state)).toBeNull();
		if (state.rewardPolicy)
			state.rewardPolicy.pointWindow = {
				status: "NOT_STARTED",
				cohort: "WELCOME",
				endsAt: null,
			};
		expect(pointWindowNotice(state)).not.toContain("첫 출석부터");
		expect(pointWindowHeadline(state)).toBeNull();
	});
	test("paused, ended and missing offers do not promise payment", () => {
		for (const reason of ["paused", "ended", null] as const) {
			const state = programState();
			for (const reward of state.rewardPolicy.program.rewards) {
				reward.available = false;
				reward.unavailableReason = reason;
				if (reason === null) reward.amount = null;
			}
			for (const text of [
				pointWindowNotice(state),
				pointWindowHeadline(state),
			]) {
				expect(text).not.toMatch(/받을 수 있어요|10P|50P/);
				expect(text).toBe(
					reason === "ended"
						? "출석 포인트 이벤트가 종료됐어요."
						: "출석 포인트 지급을 잠시 쉬고 있어요.",
				);
			}
		}
	});
	test("a participant's ended period is not reopened by a current program offer", () => {
		const state = programState();
		state.rewardPolicy.pointWindow = {
			status: "ENDED",
			cohort: "WELCOME",
			endsAt: DAY_EIGHT,
		};
		expect(pointWindowNotice(state)).toContain(
			"15일 토스 포인트 출석 혜택 기간이 끝났어요",
		);
		expect(pointWindowHeadline(state)).toBeNull();
	});
});

describe("reward policy copy", () => {
	test("exclusive KST ends show the last included day", () => {
		expect(kstEndLabel(DAY_EIGHT)).toBe("12월 7일까지");
		expect(kstStartLabel(DAY_EIGHT)).toBe("12월 8일부터");
		expect(kstStartLabel(DAY_EIGHT + 9 * 3_600_000)).toBe("12월 8일 09:00부터");
		expect(kstEndLabel(DAY_EIGHT + 12 * 3_600_000)).toBe(
			"12월 8일 12:00 전까지",
		);
	});
	test("window notices follow the server cohort, never a fixed amount", () => {
		const policy = (status: "LEGACY_GRACE" | "WELCOME" | "ENDED") => ({
			version: "v",
			noticeStartsAt: 1,
			noticeActive: true,
			legacyPointsEndsAt: DAY_EIGHT,
			welcomePointDays: 7,
			pointWindow: {
				status,
				cohort:
					status === "WELCOME" ? ("WELCOME" as const) : ("LEGACY" as const),
				endsAt: DAY_EIGHT,
			},
		});
		expect(
			pointWindowNotice(attendance({ rewardPolicy: policy("WELCOME") })),
		).toBe("처음 7일 토스 포인트 추가 혜택 · 12월 7일까지");
		expect(
			pointWindowNotice(attendance({ rewardPolicy: policy("LEGACY_GRACE") })),
		).toContain("12월 7일까지 제공돼요");
		expect(
			pointWindowNotice(attendance({ rewardPolicy: policy("ENDED") })),
		).toContain("출석 스킵권은 계속");
		const grace = pointWindowNotice(
			attendance({
				rewardPolicy: policy("LEGACY_GRACE"),
				adSkips: {
					active: false,
					startsAt: DAY_EIGHT - 7 * 86_400_000,
					dailyTickets: 1,
					streakBonusTickets: 3,
				},
			} as Partial<Attendance>),
		);
		expect(grace).toContain("12월 1일부터 출석하면 광고 스킵권 1장");
		expect(grace).toContain("추가 3장");
		expect(grace).toContain("신청 기한까지");
		expect(grace).toContain("이전 혜택 내역");
		expect(
			pointWindowHeadline(attendance({ rewardPolicy: policy("LEGACY_GRACE") })),
		).toBe("토스 포인트 출석 혜택은 12월 7일까지 제공돼요.");
		expect(
			pointWindowHeadline(attendance({ rewardPolicy: policy("ENDED") })),
		).toBeNull();
		expect(pointWindowNotice(attendance({ rewardPolicy: null }))).toBeNull();
		for (const status of ["LEGACY_GRACE", "WELCOME", "ENDED"] as const)
			expect(
				pointWindowNotice(attendance({ rewardPolicy: policy(status) })),
			).not.toMatch(/50P|57P/);
	});
	test("check-in programs start on the first check-in and name current amounts", () => {
		const program = (
			pointWindow: NonNullable<Attendance["rewardPolicy"]>["pointWindow"],
			welcomeStreakLimit = 2,
		) =>
			attendance({
				promotions: [
					reward({ kind: "daily", amount: 1 }),
					reward({ kind: "weekly", amount: 10 }),
				],
				rewardPolicy: {
					version: "attendance-rewards-v2",
					noticeStartsAt: null,
					noticeActive: false,
					legacyPointsEndsAt: 1,
					welcomePointDays: 15,
					windowStart: "first_check_in",
					welcomeStreakLimit,
					pointWindow,
					program: currentProgram,
				},
			});
		const waiting = program({
			status: "NOT_STARTED",
			cohort: "WELCOME",
			endsAt: null,
		});
		expect(pointWindowNotice(waiting)).toBe(
			"첫 출석부터 15일 · 매일 1P, 7일 연속 10P",
		);
		expect(pointWindowHeadline(waiting)).toBe(
			"출석하면 15일 동안 토스 포인트를 받을 수 있어요.",
		);
		const active = program(
			{ status: "WELCOME", cohort: "WELCOME", endsAt: DAY_EIGHT },
			1,
		);
		expect(pointWindowNotice(active)).toBe(
			"포인트 혜택 12월 7일까지 · 매일 1P, 7일 연속 10P(1회)",
		);
		expect(pointWindowHeadline(active)).toBe(
			"토스 포인트 출석 혜택은 12월 7일까지 받을 수 있어요.",
		);
		const ended = program({
			status: "ENDED",
			cohort: "WELCOME",
			endsAt: DAY_EIGHT,
		});
		expect(pointWindowNotice(ended)).toContain(
			"15일 토스 포인트 출석 혜택 기간이 끝났어요",
		);
		expect(pointWindowHeadline(ended)).toBeNull();
		// Older servers omit windowStart; a NOT_STARTED window is never mislabeled.
		const legacy = attendance({
			rewardPolicy: {
				version: "attendance-rewards-v2",
				noticeStartsAt: 1,
				noticeActive: true,
				legacyPointsEndsAt: 1,
				welcomePointDays: 15,
				pointWindow: { status: "NOT_STARTED", cohort: "WELCOME", endsAt: null },
			},
		});
		expect(pointWindowNotice(legacy)).toBeNull();
		expect(pointWindowHeadline(legacy)).toBeNull();
	});
	test("point buttons use the campaign amount and the stored state", () => {
		expect(promotionButton(reward())).toBe("30P 받기");
		expect(promotionButton(reward({ amount: null, available: false }))).toBe(
			"프로모션 준비 중",
		);
		expect(
			promotionButton(reward({ status: "claim_expired", eligible: false })),
		).toBe("신청 기간이 지났어요");
		expect(promotionButton(reward({ claimId: "c" }))).toBe("지급 상태 확인");
		const blocked = (unavailableReason: Promotion["unavailableReason"]) =>
			promotionButton(
				reward({ available: false, eligible: false, unavailableReason }),
			);
		expect(blocked("budget_exhausted")).toBe("프로모션 예산이 소진됐어요");
		expect(blocked("ended")).toBe("프로모션이 종료됐어요");
		expect(blocked("paused")).toBe("지급을 잠시 쉬고 있어요");
	});
	test("ended windows hide new point cards but keep existing claims", () => {
		const ended = reward({ status: "window_ended", eligible: false });
		expect(
			visiblePointRewards([ended, reward({ ...ended, claimId: "c" })]),
		).toHaveLength(1);
	});
	test("check-in label separates tickets from points", () => {
		const tickets = {
			balance: 0,
			active: true,
			startsAt: 1,
			dailyTickets: 1,
			streakBonusTickets: 3,
			todayGranted: 0,
			lastStreakBonusEndDay: null,
			placements: [],
		};
		expect(
			checkInLabel(
				attendance({
					adSkips: tickets,
					promotions: [reward({ kind: "daily", amount: 1 })],
				}),
			),
		).toBe("출석하고 스킵권 1장 + 1P 받기");
		expect(checkInLabel(attendance({ adSkips: tickets }))).toBe(
			"출석하고 스킵권 1장 받기",
		);
		expect(
			checkInLabel(
				attendance({
					promotions: [
						reward({ kind: "daily", amount: null, available: false }),
					],
				}),
			),
		).toBe("오늘 출석하기");
	});
});
