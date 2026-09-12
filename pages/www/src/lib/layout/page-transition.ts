import { onNavigate } from "$app/navigation";

export const preparePageTransition = () => {
	onNavigate((navigation) => {
		if (
			!document.startViewTransition ||
			matchMedia("(prefers-reduced-motion: reduce)").matches
		)
			return;
		return new Promise<void>((resolve) => {
			const transition = document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
			// Resizing or a new navigation may skip the animation while navigation succeeds.
			void transition.ready.catch(() => {});
			void transition.finished.catch(() => {});
		});
	});
};
