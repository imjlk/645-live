import { describe, expect, test } from "bun:test";
import type { Attendance, Promotion } from "./api";
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
