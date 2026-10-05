import type { ShoppingPlacement } from "./shopping-recommendations";
export type ShoppingEvent = "viewed" | "clicked" | "opened" | "open_failed";
export function createShoppingTelemetry(
	send: (event: {
		log_name: string;
		log_type: "event";
		params: {
			placement: ShoppingPlacement;
			product_id: string;
			app_version: string;
		};
	}) => unknown,
	version: string,
) {
	return (
		event: ShoppingEvent,
		placement: ShoppingPlacement,
		productId: string,
	) => {
		if (!/^[a-zA-Z0-9_-]{1,64}$/.test(productId)) return;
		try {
			void Promise.resolve(
				send({
					log_name: `lotto_shopping_${event}`,
					log_type: "event",
					params: {
						placement,
						product_id: productId,
						app_version: version.slice(0, 24),
					},
				}),
			).catch(() => {});
		} catch {
			/* Optional metrics never interrupt navigation. */
		}
	};
}
