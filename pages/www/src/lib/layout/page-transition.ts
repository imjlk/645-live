import { onNavigate } from "$app/navigation";

export const preparePageTransition = () => {
	onNavigate(async (navigation) => {
		if (!document.startViewTransition) {
			return;
		}

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
				// Give DOM time to mount new components before transition finishes
				await new Promise((r) => setTimeout(r, 16));
			});
		});
	});
};
