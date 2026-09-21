import { expect, test } from "bun:test";
import { promotionFeedback } from "./promotion-feedback";

test("only pending payouts promise automatic checking in both claim flows", () => {
	for (const checkedIn of [true, false]) {
		for (const status of [
			"failed",
			"cancelled",
			"needs_review",
			"unknown",
			"success",
			"recorded",
			"already_claimed",
		]) {
			expect(promotionFeedback({ status, amount: 1 }, checkedIn)).not.toContain(
				"자동으로",
			);
		}
		expect(
			promotionFeedback({ status: "pending", amount: 1 }, checkedIn),
		).toContain("자동으로");
		expect(
			promotionFeedback({ status: "failed", amount: 1 }, checkedIn),
		).toContain("support@645.live");
		expect(
			promotionFeedback({ status: "cancelled", amount: 1 }, checkedIn),
		).toContain("완료되지 않았어요");
	}
});
