<!--
  PWA 설치 프롬프트 컴포넌트
  - beforeinstallprompt 이벤트 감지
  - 사용자 친화적인 설치 UI 제공
  - 설치 상태 추적
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/environment";

	let showInstallPrompt = $state(false);
	let deferredPrompt: any = $state(null);
	let isInstalled = $state(false);
	let isInstallable = $state(false);

	onMount(() => {
		if (!browser) return;

		// PWA 설치 가능 여부 확인
		const checkInstallability = () => {
			// 이미 설치된 PWA인지 확인 (standalone 모드)
			if (window.matchMedia("(display-mode: standalone)").matches) {
				isInstalled = true;
				return;
			}

			// iOS Safari의 경우
			if ((window.navigator as any).standalone === true) {
				isInstalled = true;
				return;
			}

			// Android Chrome의 beforeinstallprompt 이벤트 리스너
			window.addEventListener("beforeinstallprompt", (e) => {
				e.preventDefault();
				deferredPrompt = e;
				isInstallable = true;
				
				// 처음 방문하거나 이전에 설치를 거부하지 않았다면 프롬프트 표시
				const hasDeclined = localStorage.getItem("pwa-install-declined");
				const installCount = parseInt(localStorage.getItem("pwa-prompt-count") || "0");
				
				if (!hasDeclined && installCount < 3) {
					setTimeout(() => {
						showInstallPrompt = true;
						localStorage.setItem("pwa-prompt-count", (installCount + 1).toString());
					}, 5000); // 5초 후 표시
				}
			});

			// 설치 완료 감지
			window.addEventListener("appinstalled", () => {
				isInstalled = true;
				showInstallPrompt = false;
				localStorage.removeItem("pwa-install-declined");
				localStorage.removeItem("pwa-prompt-count");
			});
		};

		checkInstallability();

		// Service Worker 등록 상태 확인
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.ready.then(() => {
			});
		}

		// 페이지 가시성 변화 감지 (앱이 설치되었는지 재확인)
		document.addEventListener("visibilitychange", () => {
			if (!document.hidden) {
				checkInstallability();
			}
		});
	});

	const handleInstall = async () => {
		if (!deferredPrompt) return;

		try {
			deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;
			
			if (outcome === "accepted") {
			} else {
				localStorage.setItem("pwa-install-declined", "true");
			}
			
			deferredPrompt = null;
			showInstallPrompt = false;
		} catch (error) {
			console.error("PWA 설치 오류:", error);
		}
	};

	const handleDismiss = () => {
		showInstallPrompt = false;
		localStorage.setItem("pwa-install-declined", "true");
	};

	const showManualInstallGuide = () => {
		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
		const message = isIOS
			? "Safari 메뉴 → '홈 화면에 추가'를 선택하여 앱을 설치할 수 있습니다."
			: "브라우저 메뉴에서 '홈 화면에 추가' 또는 '앱 설치'를 선택하세요.";
		
		alert(message);
	};
</script>

{#if showInstallPrompt && !isInstalled}
	<div class="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
		<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4">
			<div class="flex items-start gap-3">
				<div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
					<span class="text-white text-lg">📱</span>
				</div>
				
				<div class="flex-1 min-w-0">
					<h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">
						645.live 앱 설치
					</h3>
					<p class="text-xs text-gray-600 dark:text-gray-300 mb-3">
						홈 화면에 추가하여 더 빠르고 편리하게 이용하세요
					</p>
					
					<div class="flex gap-2">
						{#if isInstallable && deferredPrompt}
							<button
								type="button"
								onclick={handleInstall}
								class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
							>
								설치하기
							</button>
						{:else}
							<button
								type="button"
								onclick={showManualInstallGuide}
								class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
							>
								설치 방법
							</button>
						{/if}
						
						<button
							type="button"
							onclick={handleDismiss}
							class="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
						>
							나중에
						</button>
					</div>
				</div>
				
				<button
					type="button"
					onclick={handleDismiss}
					class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}

{#if isInstalled}
	<!-- 설치된 상태에서 업데이트 알림 등을 표시할 수 있는 공간 -->
	<div class="hidden">
		<!-- 향후 앱 업데이트 알림 컴포넌트 추가 가능 -->
	</div>
{/if}