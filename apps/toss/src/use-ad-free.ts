import { IAP } from "@apps-in-toss/web-framework";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createAdFreeStore, restoreAdFree } from "./ad-free";
import type { Api } from "./api";
import { adTelemetry } from "./telemetry";

export function useAdFree(
	api: Api,
	userId: string | undefined,
	sku: string | null | undefined,
	foreground: boolean,
) {
	const store = useMemo(
		() =>
			createAdFreeStore({
				enabled: Boolean(userId && sku),
				metric: (event, flowId, outcome) =>
					adTelemetry.track(
						event,
						{
							placement: "ad_free_purchase",
							policy: "purchase-v1",
							flowId,
							entryPoint: "settings",
							format: "non_consumable",
						},
						outcome,
					),
				restore: (verify) => restoreAdFree(IAP, sku ?? "", verify),
				price: async () => {
					if (!IAP.createOneTimePurchaseOrder.isSupported()) return "";
					const catalog = await IAP.getProductItemList();
					return (
						catalog.products.find(
							(p) => p.sku === sku && p.type === "NON_CONSUMABLE",
						)?.displayAmount ?? ""
					);
				},
				verify: async (orderId) =>
					(
						await api.request<{ active: boolean }>(
							"/api/app/v1/iap/ad-free/verify",
							{ orderId },
						)
					).active === true,
				purchase: (grant) =>
					api.purchase({
						sku: sku ?? "",
						processProductGrant: ({ orderId }) => grant(orderId),
					}),
			}),
		[api, userId, sku],
	);
	const state = useSyncExternalStore(store.subscribe, store.read);
	useEffect(() => store.cancel, [store]);
	useEffect(() => {
		if (!foreground || !store.enabled) return;
		void store.run("refresh");
		const timer = setInterval(() => void store.run("refresh"), 5 * 60_000);
		return () => clearInterval(timer);
	}, [foreground, store]);
	return {
		...state,
		enabled: store.enabled,
		purchase: () => store.run("purchase"),
		restore: () => store.run("restore"),
	};
}
