import { expect, test } from "bun:test";
import { WebAdapterError } from "@trailbase-apps-in-toss-kit/ait-web";
import {
	createAdFreeStore,
	restoreAdFree,
	withoutPurchasedAds,
} from "./ad-free";
import type { AdConfig } from "./api";

const sku = "ad-free";
const order = (
	orderId: string,
	status: "COMPLETED" | "REFUNDED",
	product = sku,
) => ({ orderId, sku: product, status, date: "" });
function history(pages: ReturnType<typeof order>[][], pending: string[] = []) {
	const completed: string[] = [];
	const calls: (string | null | undefined)[] = [];
	return {
		completed,
		calls,
		getPendingOrders: async () => ({
			orders: pending.map((orderId) => ({
				orderId,
				sku,
				paymentCompletedDate: "",
			})),
		}),
		getCompletedOrRefundedOrders: async ({
			key,
		}: {
			key?: string | null;
		} = {}) => {
			calls.push(key);
			const i = Number(key ?? 0);
			return {
				orders: pages[i],
				hasNext: i + 1 < pages.length,
				nextKey: String(i + 1),
			};
		},
		completeProductGrant: async ({
			params,
		}: {
			params: { orderId: string };
		}) => {
			completed.push(params.orderId);
			return true;
		},
	};
}
test("restores pending only after server grant; scans every page and filters SKU", async () => {
	const store = history(
		[[order("other", "COMPLETED", "other")], [order("returned", "REFUNDED")]],
		["pending", "returned"],
	);
	const seen: string[] = [];
	expect(
		await restoreAdFree(store, sku, async (id) => {
			seen.push(id);
			return id === "pending";
		}),
	).toBe(true);
	expect(store.calls).toEqual([undefined, "1"]);
	expect(store.completed).toEqual(["pending"]);
	expect(seen.sort()).toEqual(["pending", "returned"]);
});
test("a refund overrides stale completion, including after restart and a later repurchase", async () => {
	const pages = [[order("old", "REFUNDED")], [order("old", "COMPLETED")]];
	expect(await restoreAdFree(history(pages), sku, async () => true)).toBe(
		false,
	);
	expect(
		await restoreAdFree(
			history([[order("old", "COMPLETED")]]),
			sku,
			async () => false,
		),
	).toBe(false);
	expect(
		await restoreAdFree(
			history([...pages, [order("new", "COMPLETED")]]),
			sku,
			async (id) => id === "new",
		),
	).toBe(true);
	expect(await restoreAdFree(history([[]]), sku, async () => true)).toBe(false);
});
test("restore failures leave pending orders retryable without acknowledging unverified payments", async () => {
	const store = history([[]], ["pending"]);
	await expect(
		restoreAdFree(store, sku, async () => {
			throw new Error("offline");
		}),
	).rejects.toThrow();
	expect(store.completed).toEqual([]);
	await expect(
		restoreAdFree(
			{ ...store, completeProductGrant: async () => false },
			sku,
			async () => true,
		),
	).rejects.toThrow();
	const looping = {
		...store,
		getCompletedOrRefundedOrders: async () => ({
			orders: [],
			hasNext: true,
			nextKey: "same",
		}),
	};
	await expect(restoreAdFree(looping, sku, async () => true)).rejects.toThrow();
});
test("one checkout, then recheck on restore or purchase; no checkout for owned or unlisted SKU", async () => {
	let paid = false;
	let price = "2,200원";
	let count = 0;
	const store = createAdFreeStore({
		enabled: true,
		restore: async () => paid,
		price: async () => price,
		verify: async () => true,
		purchase: async (grant) => {
			count++;
			paid = await grant("new");
		},
	});
	await Promise.all([store.run("purchase"), store.run("purchase")]);
	expect(store.read().owned).toBe(true);
	await store.run("purchase");
	expect(count).toBe(1);
	paid = false;
	price = "";
	await store.run("purchase");
	expect(count).toBe(1);
	expect(store.read().owned).toBe(false);
});
test("an account change during verification prevents late grants and acknowledgements", async () => {
	let resolve!: (value: boolean) => void;
	const response = new Promise<boolean>((done) => {
		resolve = done;
	});
	let grants = 0;
	const store = createAdFreeStore({
		enabled: true,
		restore: async (verify) => {
			if (await verify("old")) grants++;
			return true;
		},
		verify: () => response,
		price: async () => "",
		purchase: async () => {},
	});
	const flight = store.run("restore");
	store.cancel();
	resolve(true);
	await flight;
	expect(grants).toBe(0);
	expect(store.read().owned).toBe(false);
});
test("removes banner fallback, feed inventory and generation placement only", () => {
	const config: AdConfig = {
		testMode: false,
		passes: {},
		bannerGroupId: "fallback",
		bannerGroups: { card: "card", inline: "inline" },
		feedInlineGroupIds: ["feed"],
		generationAdRequired: true,
		serverTime: 0,
		placements: (
			["generation_continue", "report", "custom", "attendance_restore"] as const
		).map((placement) => ({
			placement,
			enabled: true,
			passDurationMs: 0,
			rewardedWeight: 100,
			rewardedGroupId: "r",
			interstitialGroupId: null,
		})),
	};
	const paid = withoutPurchasedAds(config);
	expect(paid?.bannerGroupId).toBeNull();
	expect(paid?.bannerGroups).toEqual({ card: null, inline: null });
	expect(paid?.feedInlineGroupIds).toEqual([]);
	expect(paid?.generationAdRequired).toBe(false);
	expect(paid?.placements.map((p) => p.enabled)).toEqual([
		false,
		true,
		true,
		true,
	]);
	expect(config.placements.every((p) => p.enabled)).toBe(true);
});

test("a stalled refund and a failed older receipt do not block a verified repurchase", async () => {
	let release!: (value: boolean) => void;
	const slow = new Promise<boolean>((resolve) => {
		release = resolve;
	});
	const store = history([
		[
			order("refunded", "REFUNDED"),
			order("old", "COMPLETED"),
			order("new", "COMPLETED"),
		],
	]);
	try {
		expect(
			await restoreAdFree(store, sku, async (id) => {
				if (id === "refunded") return slow;
				if (id === "old") throw new Error("unavailable");
				return true;
			}),
		).toBe(true);
	} finally {
		release(false);
	}
});
test("network failure preserves a verified purchase in this session; a confirmed refund clears it", async () => {
	let verdict: boolean | null = true;
	const store = createAdFreeStore({
		enabled: true,
		restore: async () => {
			if (verdict === null) throw new Error("offline");
			return verdict;
		},
		verify: async () => true,
		price: async () => "",
		purchase: async () => {},
	});
	await store.run("refresh");
	verdict = null;
	await store.run("refresh");
	expect(store.read().owned).toBe(true);
	verdict = false;
	await store.run("refresh");
	expect(store.read().owned).toBe(false);
});

test("canceling checkout retains the price and clears busy state without a payment error", async () => {
	let canceled = true;
	let grants = 0;
	const store = createAdFreeStore({
		enabled: true,
		restore: async () => false,
		price: async () => "11,990원",
		verify: async () => {
			grants++;
			return true;
		},
		purchase: async (grant) => {
			if (canceled) throw new WebAdapterError("USER_CANCELED", "purchase");
			await grant("new");
		},
	});
	await store.run("purchase");
	expect(store.read()).toEqual({
		owned: false,
		checked: true,
		busy: false,
		price: "11,990원",
		message: "",
	});
	expect(grants).toBe(0);
	canceled = false;
	await store.run("purchase");
	expect(store.read().owned).toBe(true);
	expect(grants).toBe(1);
});

test("purchase metrics separate checkout, cancellation, verified success and restoration", async () => {
	const events: Array<[string, string, string, string]> = [];
	let mode = "cancel";
	const store = createAdFreeStore({
		enabled: true,
		restore: async () => mode === "owned",
		price: async () => "11,990원",
		verify: async () => true,
		metric: (...event) => {
			events.push(event);
		},
		purchase: async (grant) => {
			if (mode === "cancel")
				throw new WebAdapterError("USER_CANCELED", "purchase");
			if (mode === "unverified") return;
			await grant("receipt-never-logged");
		},
	});
	const attendancePurchase = store.run("purchase", "attendance");
	await store.run("purchase", "settings");
	await attendancePurchase;
	expect(events.map((e) => e[0])).toEqual([
		"purchase_entered",
		"purchase_opened",
		"purchase_canceled",
	]);
	expect(new Set(events.map((e) => e[1])).size).toBe(1);
	expect(new Set(events.map((e) => e[3]))).toEqual(new Set(["attendance"]));
	events.length = 0;
	mode = "success";
	await store.run("purchase");
	expect(new Set(events.map((e) => e[3]))).toEqual(new Set(["settings"]));
	expect(events.map((e) => e[0])).toEqual([
		"purchase_entered",
		"purchase_opened",
		"purchase_succeeded",
	]);
	expect(JSON.stringify(events)).not.toContain("receipt-never-logged");
	events.length = 0;
	mode = "owned";
	await store.run("restore");
	expect(events).toEqual([]);
	mode = "unverified";
	await store.run("purchase");
	expect(store.read().owned).toBe(false);
	expect(events.map((e) => e[0])).toEqual([
		"purchase_entered",
		"purchase_opened",
		"purchase_failed",
	]);
});
