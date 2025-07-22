import { onNavigate } from "$app/navigation";

export const preparePageTransition = () => {
	onNavigate(async (navigation) => {
		if (!document.startViewTransition) {
			return;
		}

		return new Promise((resolve) => {
			// 페이지 전환 시작 시 모바일 네비게이션 숨김 애니메이션
			const mobileNav = document.querySelector('nav[aria-label*="모바일"]');
			if (mobileNav) {
				mobileNav.classList.add('nav-hide');
			}

			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
				// Give DOM time to mount new components before transition finishes
				await new Promise((r) => setTimeout(r, 16));
			}).finished.finally(() => {
				// 페이지 전환 완료 후 모바일 네비게이션 다시 표시
				setTimeout(() => {
					if (mobileNav) {
						mobileNav.classList.remove('nav-hide');
						mobileNav.classList.add('nav-show');
						// 애니메이션 완료 후 클래스 정리
						setTimeout(() => {
							mobileNav.classList.remove('nav-show');
						}, 300);
					}
				}, 50);
			});
		});
	});
};
