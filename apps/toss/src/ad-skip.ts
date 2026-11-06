import {
	type AdSkipChoice,
	type AdSkipRedemptionReceipt,
	resolveAdSkipChoice,
} from "@trailbase-apps-in-toss-kit/ait-web/ad-skip";
import type { AdPlacement, AdSkipStatus, Attendance } from "./api";

/**
 * Button state for one ad prompt. Before the ticket program starts, an empty wallet
 * shows no ticket option at all; an attendance restore never shows one.
 */
export function adSkipChoice({
	status,
	balance,
	blocked,
	busy,
	placement,
}: {
	status: AdSkipStatus | undefined;
	balance: number | null;
	blocked: boolean;
	busy: boolean;
	placement: AdPlacement;
}): AdSkipChoice {
	const choice = resolveAdSkipChoice({
		allowedPlacements: status?.placements ?? [],
		balance: balance ?? status?.balance ?? null,
		blocked,
		busy,
		placement,
	});
	const visible = !!status?.active || (choice.balance ?? 0) > 0;
	return visible
		? choice
		: { ...choice, showTicket: false, ticketEnabled: false };
}

export function adSkipLabel(choice: AdSkipChoice, action: string) {
	if (choice.reason === "checking") return "스킵권 사용 결과 확인 중";
	if (choice.reason === "loading") return "스킵권 확인 중";
	return `광고 스킵권 1장으로 ${action} · 보유 ${choice.balance ?? 0}장`;
}

const MESSAGES: Record<string, string> = {
	AD_SKIP_INSUFFICIENT_BALANCE: "사용할 수 있는 광고 스킵권이 없어요.",
	AD_SKIP_PLACEMENT_NOT_ALLOWED: "이 기능에는 광고 스킵권을 사용할 수 없어요.",
	AD_SKIP_REQUEST_CONFLICT:
		"이전 스킵권 요청과 내용이 달라요. 화면을 닫고 다시 시도해 주세요.",
	AD_SKIP_OPPORTUNITY_STALE:
		"이미 처리된 광고 안내예요. 화면을 새로고침한 뒤 다시 시도해 주세요.",
	INVALID_AD_SKIP_REQUEST: "스킵권 요청을 확인하지 못했어요.",
	AD_SKIP_INVALID_REQUEST: "스킵권 요청을 확인하지 못했어요.",
	AD_SKIP_INVALID_RESPONSE:
		"스킵권 사용 결과를 확인하지 못했어요. 잠시 후 다시 확인해 주세요.",
};

/** A definitive rejection never charged a ticket. */
export function adSkipRejection(code: string | null, error: unknown) {
	if (code && MESSAGES[code]) return MESSAGES[code];
	// The app's own errors (for example a daily generation limit) are Korean.
	return error instanceof Error && /[가-힣]/.test(error.message)
		? error.message
		: "광고 스킵권을 사용하지 못했어요. 다시 시도해 주세요.";
}

export const AD_SKIP_UNKNOWN =
	"스킵권 사용 결과를 확인하고 있어요. 잠시 후 다시 시도하면 같은 요청으로 확인해요.";

export function adSkipNotice(receipt: AdSkipRedemptionReceipt) {
	if (receipt.resolution === "TICKET")
		return `광고 스킵권 1장을 사용했어요. 남은 스킵권 ${receipt.balance}장`;
	if (receipt.resolution === "FREE")
		return "지금은 광고 없이 바로 이어서 이용해요. 스킵권은 사용하지 않았어요.";
	return "이미 처리된 광고예요. 스킵권은 사용하지 않았어요.";
}

/** Check-in feedback; tickets never depend on the point claim that may follow. */
export function attendanceTicketNotice(state: Attendance) {
	const skips = state.adSkips;
	if (!skips?.active || skips.todayGranted < 1) return null;
	const bonus = skips.lastStreakBonusEndDay === state.day;
	return bonus
		? `7일 연속 출석까지 완성해 오늘 광고 스킵권 ${skips.todayGranted + skips.streakBonusTickets}장을 받았어요.`
		: `오늘 출석으로 광고 스킵권 ${skips.todayGranted}장을 받았어요.`;
}
