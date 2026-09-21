/** Only pending payouts are automatically reconciled by the attendance sheet. */
export function promotionFeedback(
	result: { status: string; amount: number },
	checkedIn = false,
) {
	const prefix = checkedIn ? "출석 완료! " : "";
	switch (result.status) {
		case "success":
		case "recorded":
			return `${prefix}${result.amount}P를 받았어요.`;
		case "pending":
			return `${prefix}포인트 적립 결과를 자동으로 확인하고 있어요.`;
		case "already_claimed":
			return `${prefix}이미 받은 혜택이에요.`;
		case "failed":
		case "needs_review":
			return `${prefix}지급 확인에 도움이 필요해요. support@645.live로 문의해 주세요.`;
		default:
			return `${prefix}포인트 적립이 완료되지 않았어요. 출석 혜택의 지급 상태를 다시 확인해 주세요.`;
	}
}
