import assert from "node:assert/strict";
import {
	type AdSkipRedemptionRequest,
	createAdSkipRedemptionController,
	normalizeAdSkipRedemptionReceipt,
} from "@trailbase-apps-in-toss-kit/ait-web/ad-skip";

// Called only against the disposable attendance smoke server and synthetic user.
const [, , base, rawHeaders] = process.argv;
const headers = {
	...JSON.parse(rawHeaders),
	"Content-Type": "application/json",
};
const post = async (path: string, body: unknown) => {
	const response = await fetch(`${base}${path}`, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});
	const data = await response.json();
	assert.equal(response.status, 200, JSON.stringify(data));
	return data;
};
const before = await post("/api/app/v1/attendance/status", {
	experiment: "generation-cadence-v4",
});
assert(before.adSkips.balance >= 1);
const storage = new Map<string, string>();
const requests: AdSkipRedemptionRequest[] = [];
const controller = createAdSkipRedemptionController({
	storageKey: "fixture.skip",
	storage: {
		getItem: async (key) => storage.get(key) ?? null,
		setItem: async (key, value) => {
			storage.set(key, value);
		},
	},
	retryDelayMs: 0,
	redeem: async (body) => {
		assert.deepEqual(Object.keys(body).sort(), [
			"context",
			"opportunityKey",
			"placement",
			"requestId",
		]);
		requests.push(body);
		const result = await post("/api/app/v1/ad-skips/redeem", body);
		// Lose the first committed response and exercise the real HTTP retry.
		if (requests.length === 1) throw new TypeError("fixture lost response");
		return normalizeAdSkipRedemptionReceipt(result, body);
	},
});
const outcome = await controller.redeem({
	placement: "generation_continue",
	opportunityKey: "fixture:skip-contract",
});
assert.equal(outcome.status, "resolved");
if (outcome.status !== "resolved") throw new Error("redemption did not settle");
assert.equal(outcome.receipt.resolution, "TICKET");
assert.equal(outcome.receipt.consumed, 1);
assert.equal(outcome.receipt.replayed, true);
assert.equal(outcome.receipt.balance, before.adSkips.balance - 1);
assert.equal(requests.length, 2);
assert.equal(requests[0].requestId, requests[1].requestId);
const legacy = await post("/api/app/v1/ad-skips/redeem", {
	...requests[0],
	createdAt: 1,
});
assert.equal(legacy.receiptId, outcome.receipt.receiptId);
assert.equal(legacy.balance, outcome.receipt.balance);
assert.equal(legacy.replayed, true);
assert(legacy.createdAt > 1); // A client timestamp never becomes the receipt time.
const after = await post("/api/app/v1/attendance/status", {
	experiment: "generation-cadence-v4",
});
assert.equal(after.adSkips.balance, before.adSkips.balance - 1);
console.log(
	"real ad skip transport, lost response replay, legacy body and single debit passed",
);
