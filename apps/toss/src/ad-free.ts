import type { IAP } from "@apps-in-toss/web-framework";
import type { AdConfig } from "./api";

type Store = {
	[K in
		| "getPendingOrders"
		| "getCompletedOrRefundedOrders"
		| "completeProductGrant"]: (
		...args: Parameters<(typeof IAP)[K]>
	) => ReturnType<(typeof IAP)[K]>;
};
export type VerifyOrder = (id: string) => Promise<boolean>;

// Obtain every receipt from the current native account. No stored browser flag
// or caller-supplied account ID can restore a purchase.
export async function restoreAdFree(
	store: Store,
	sku: string,
	verify: VerifyOrder,
) {
	const pending = await store.getPendingOrders();
	const orders = new Map<string, "PENDING" | "COMPLETED" | "REFUNDED">();
	for (const row of pending.orders) {
		if (row.sku === sku) orders.set(row.orderId, "PENDING");
	}
	const cursors = new Set<string>();
	let key: string | undefined;
	for (;;) {
		const page = await store.getCompletedOrRefundedOrders(key ? { key } : {});
		for (const row of page.orders) {
			if (row.sku === sku && orders.get(row.orderId) !== "REFUNDED")
				orders.set(row.orderId, row.status);
		}
		if (!page.hasNext) break;
		if (!page.nextKey || cursors.has(page.nextKey))
			throw new Error("구매 내역을 다시 확인해 주세요.");
		key = page.nextKey;
		cursors.add(key);
	}
	// The native history has already revoked these receipts. Record provider
	// refunds independently so old orders cannot delay or invalidate a repurchase.
	for (const [orderId, status] of orders) {
		if (status === "REFUNDED") void verify(orderId).catch(() => {});
	}
	const candidates = Array.from(orders).filter(
		([, status]) => status !== "REFUNDED",
	);
	const results = await Promise.allSettled(
		candidates.map(async ([orderId, status]) => {
			if (!(await verify(orderId))) return false;
			if (
				status === "PENDING" &&
				!(await store.completeProductGrant({ params: { orderId } }))
			)
				throw new Error("결제는 완료됐어요. 구매 복원을 다시 눌러 주세요.");
			return true;
		}),
	);
	if (results.some((result) => result.status === "fulfilled" && result.value))
		return true;
	const failed = results.find((result) => result.status === "rejected");
	if (failed?.status === "rejected") throw failed.reason;
	return false;
}

export function withoutPurchasedAds(config: AdConfig | null) {
	if (!config) return null;
	return {
		...config,
		bannerGroupId: null,
		bannerGroups: { card: null, inline: null },
		feedInlineGroupIds: [],
		generationAdRequired: false,
		placements: config.placements.map((p) =>
			p.placement === "generation_continue" ? { ...p, enabled: false } : p,
		),
	};
}

const RESTORE_ERROR =
	"구매 내역을 확인하지 못했어요. 잠시 후 구매 복원을 눌러 주세요.";
type StoreAction = "refresh" | "restore" | "purchase";
type StoreDependencies = {
	enabled: boolean;
	restore: (verify: VerifyOrder) => Promise<boolean>;
	price: () => Promise<string>;
	verify: VerifyOrder;
	purchase: (grant: VerifyOrder) => Promise<unknown>;
};

function bounded<T>(work: Promise<T>, ms: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout>;
	return Promise.race([
		work,
		new Promise<never>((_, reject) => {
			timer = setTimeout(() => reject(new Error(RESTORE_ERROR)), ms);
		}),
	]).finally(() => clearTimeout(timer));
}

export function createAdFreeStore(deps: StoreDependencies) {
	const listeners = new Set<() => void>();
	let state = {
		owned: false,
		checked: false,
		busy: false,
		price: "",
		message: "",
	};
	let version = 0;
	// Grace is in memory and scoped to this account and SKU. An authoritative
	// empty/refunded history clears access immediately, even within the grace.
	let lastVerifiedPurchase = 0;
	const verifiedGraceMs = 15 * 60_000;
	const update = (changes: Partial<typeof state>) => {
		state = { ...state, ...changes };
		for (const fn of listeners) fn();
	};
	return {
		enabled: deps.enabled,
		read: () => state,
		subscribe(fn: () => void) {
			listeners.add(fn);
			return () => {
				listeners.delete(fn);
			};
		},
		cancel() {
			version++;
			update({ busy: false });
		},
		async run(action: StoreAction) {
			if (!deps.enabled || state.busy) return;
			const id = ++version;
			const check = () => {
				if (id !== version) throw new Error(RESTORE_ERROR);
			};
			const verify = async (orderId: string) => {
				check();
				const active = await deps.verify(orderId);
				check();
				return active;
			};
			update({ busy: true, message: "" });

			try {
				const owned = await bounded(deps.restore(verify), 25_000);
				check();
				lastVerifiedPurchase = owned ? Date.now() : 0;
				update({ owned, checked: true });
				if (owned) {
					if (action !== "refresh")
						update({ message: "광고 제거가 적용됐어요." });
					return;
				}
				if (action === "restore")
					update({ message: "복원할 광고 제거 구매가 없어요." });
				const price = await bounded(deps.price(), 8_000);
				check();
				update({ price });
				if (action !== "purchase" || !price) return;
				await deps.purchase(verify);
				check();
				lastVerifiedPurchase = Date.now();
				update({ owned: true, message: "배너와 번호 생성 광고를 제거했어요." });
			} catch {
				if (id === version)
					update({
						checked: true,
						owned:
							state.owned &&
							Date.now() - lastVerifiedPurchase < verifiedGraceMs,
						price: "",
						message:
							action === "purchase"
								? "결제 결과를 확인해 주세요. 이미 결제했다면 구매 복원으로 다시 적용할 수 있어요."
								: RESTORE_ERROR,
					});
			} finally {
				if (id === version) {
					version++;
					update({ busy: false });
				}
			}
		},
	};
}
