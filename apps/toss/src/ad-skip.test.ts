import { describe, expect, test } from "bun:test";
import {
	adSkipChoice,
	adSkipLabel,
	adSkipNotice,
	adSkipRejection,
	attendanceTicketNotice,
} from "./ad-skip";
import type { AdSkipStatus, Attendance } from "./api";

const status = (overrides: Partial<AdSkipStatus> = {}): AdSkipStatus => ({
	balance: 2,
	active: true,
	startsAt: 1,
	dailyTickets: 1,
	streakBonusTickets: 3,
	todayGranted: 0,
	lastStreakBonusEndDay: null,
	placements: ["generation_continue", "custom", "report"],
	...overrides,
});

describe("ad skip choice", () => {
	test("attendance restore never offers a ticket, whatever the balance", () => {
		const choice = adSkipChoice({
			status: status({ balance: 9 }),
			balance: 9,
			blocked: false,
			busy: false,
			placement: "attendance_restore",
		});
		expect(choice.showTicket).toBe(false);
		expect(choice.adEnabled).toBe(true);
	});
	test("an empty wallet keeps the ad and shows 0 left", () => {
		const choice = adSkipChoice({
			status: status({ balance: 0 }),
			balance: 0,
			blocked: false,
			busy: false,
			placement: "custom",
		});
		expect(choice).toMatchObject({
			showTicket: true,
			ticketEnabled: false,
			adEnabled: true,
			reason: "empty",
		});
		expect(adSkipLabel(choice, "만들기")).toBe(
			"광고 스킵권 1장으로 만들기 · 보유 0장",
		);
	});
	test("an unknown result blocks both the ticket and a new ad for that prompt", () => {
		const choice = adSkipChoice({
			status: status(),
			balance: 2,
			blocked: true,
			busy: false,
			placement: "generation_continue",
		});
		expect(choice).toMatchObject({
			ticketEnabled: false,
			adEnabled: false,
			reason: "checking",
		});
	});
	test("before the ticket program starts an empty wallet hides the option", () => {
		const hidden = adSkipChoice({
			status: status({ active: false, balance: 0 }),
			balance: 0,
			blocked: false,
			busy: false,
			placement: "report",
		});
		expect(hidden.showTicket).toBe(false);
		// Older servers send no status: no allowlist, no ticket.
		expect(
			adSkipChoice({
				status: undefined,
				balance: null,
				blocked: false,
				busy: false,
				placement: "report",
			}).showTicket,
		).toBe(false);
		// Tickets already held stay usable while grants are paused.
		expect(
			adSkipChoice({
				status: status({ active: false, balance: 1 }),
				balance: 1,
				blocked: false,
				busy: false,
				placement: "report",
			}).ticketEnabled,
		).toBe(true);
	});
});

describe("ad skip messages", () => {
	test("kit rejections map to Korean without promising a charge", () => {
		expect(adSkipRejection("AD_SKIP_INSUFFICIENT_BALANCE", null)).toContain(
			"없어요",
		);
		expect(
			adSkipRejection(null, new Error("오늘은 번호를 충분히 만들었어요.")),
		).toBe("오늘은 번호를 충분히 만들었어요.");
		expect(adSkipRejection(null, new Error("Ad skip tickets"))).toContain(
			"다시 시도",
		);
	});
	test("receipts describe whether a ticket was used", () => {
		const base = {
			balance: 1,
			context: "",
			createdAt: 1,
			opportunity: null,
			opportunityKey: "g-1",
			placement: "generation_continue",
			receiptId: "r",
			replayed: false,
			requestId: "request-request-1",
		};
		expect(
			adSkipNotice({ ...base, consumed: 1, resolution: "TICKET" }),
		).toContain("남은 스킵권 1장");
		expect(
			adSkipNotice({ ...base, consumed: 0, resolution: "FREE" }),
		).toContain("사용하지 않았어요");
	});
	test("a seventh-day check-in reports daily and streak tickets together", () => {
		const state = {
			day: 100,
			adSkips: status({ todayGranted: 1, lastStreakBonusEndDay: 100 }),
		} as Attendance;
		expect(attendanceTicketNotice(state)).toContain("4장");
		expect(
			attendanceTicketNotice({
				...state,
				adSkips: status({ todayGranted: 1, lastStreakBonusEndDay: 93 }),
			}),
		).toBe("오늘 출석으로 광고 스킵권 1장을 받았어요.");
		expect(
			attendanceTicketNotice({ ...state, adSkips: status({ active: false }) }),
		).toBeNull();
	});
});
