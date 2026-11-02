import type { Attendance, Promotion } from "./api";

const KST = 9 * 3_600_000;
const DAY = 86_400_000;

/** An exclusive end shown as the last KST day (or minute) it still includes. */
export function kstEndLabel(endsAt: number) {
	const local = new Date(endsAt + KST);
	if ((endsAt + KST) % DAY === 0) {
		const last = new Date(endsAt + KST - DAY);
		return `${last.getUTCMonth() + 1}월 ${last.getUTCDate()}일까지`;
	}
	const hh = String(local.getUTCHours()).padStart(2, "0");
	const mm = String(local.getUTCMinutes()).padStart(2, "0");
	return `${local.getUTCMonth() + 1}월 ${local.getUTCDate()}일 ${hh}:${mm} 전까지`;
}

/** An inclusive KST start shown as a day (or minute). */
export function kstStartLabel(at: number) {
	const local = new Date(at + KST);
	const day = `${local.getUTCMonth() + 1}월 ${local.getUTCDate()}일`;
	if ((at + KST) % DAY === 0) return `${day}부터`;
	const hh = String(local.getUTCHours()).padStart(2, "0");
	const mm = String(local.getUTCMinutes()).padStart(2, "0");
	return `${day} ${hh}:${mm}부터`;
}

/** Point copy follows the server's window; tickets are described separately. */
export function pointWindowNotice(state: Attendance | null | undefined) {
	const policy = state?.rewardPolicy;
	if (!policy) return null;
	const window = policy.pointWindow;
	const skips = state?.adSkips;
	const tickets =
		skips && (skips.active || skips.startsAt)
			? `${skips.active ? "지금부터" : kstStartLabel(skips.startsAt ?? 0)} 출석하면 광고 스킵권 ${skips.dailyTickets}장, 7일 연속 출석을 완성하면 추가 ${skips.streakBonusTickets}장을 받아요.`
			: null;
	if (window.status === "ENDED")
		return `토스 포인트 출석 이벤트는 끝났어요. 이미 신청한 포인트는 이전 혜택 내역에서 확인할 수 있어요. 출석 스킵권은 계속 받을 수 있어요.`;
	if (window.status === "WELCOME")
		return `처음 ${policy.welcomePointDays}일 토스 포인트 추가 혜택 · ${kstEndLabel(window.endsAt)}`;
	return policy.noticeActive
		? [
				`출석 혜택이 바뀌어요. 토스 포인트 출석 혜택은 ${kstEndLabel(window.endsAt)} 제공돼요.`,
				tickets,
				"이미 조건을 채운 포인트는 각 혜택의 신청 기한까지 아래에서 신청할 수 있고, 지급 결과는 이전 혜택 내역에서 확인할 수 있어요. 지금까지 모은 출석 도장은 유지돼요.",
			]
				.filter(Boolean)
				.join(" ")
		: null;
}

/** A one-line pointer for the main screen while the points change is announced. */
export function pointWindowHeadline(state: Attendance | null | undefined) {
	const policy = state?.rewardPolicy;
	if (!policy || policy.pointWindow.status !== "LEGACY_GRACE") return null;
	return policy.noticeActive
		? `토스 포인트 출석 혜택은 ${kstEndLabel(policy.pointWindow.endsAt)} 제공돼요.`
		: null;
}

/** Only rewards a user can still act on or check are shown as point cards. */
export function visiblePointRewards(promotions: Promotion[]) {
	return promotions.filter((p) => p.claimId || p.status !== "window_ended");
}

export function promotionButton(reward: Promotion) {
	if (reward.claimId) return "지급 상태 확인";
	if (reward.status === "claim_expired") return "신청 기간이 지났어요";
	if (reward.unavailableReason === "budget_exhausted")
		return "프로모션 예산이 소진됐어요";
	if (reward.unavailableReason === "ended") return "프로모션이 종료됐어요";
	if (reward.unavailableReason === "paused") return "지급을 잠시 쉬고 있어요";
	if (!reward.available || reward.amount === null) return "프로모션 준비 중";
	if (!reward.eligible) return "출석 조건을 채워 주세요";
	return `${reward.amount}P 받기`;
}

export function checkInLabel(state: Attendance) {
	if (state.checkedIn) return "오늘 출석 완료";
	const daily = state.promotions.find((p) => p.kind === "daily");
	const points =
		daily?.available && daily.amount !== null ? `${daily.amount}P` : null;
	const tickets = state.adSkips?.active
		? `스킵권 ${state.adSkips.dailyTickets}장`
		: null;
	if (tickets && points) return `출석하고 ${tickets} + ${points} 받기`;
	if (tickets || points) return `출석하고 ${tickets ?? points} 받기`;
	return "오늘 출석하기";
}
