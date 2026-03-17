<!--
  PWA 업데이트 알림 컴포넌트
  - Service Worker 업데이트 감지
  - 사용자에게 새 버전 알림
  - 원활한 업데이트 프로세스 제공
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/environment";

	let showUpdatePrompt = $state(false);
	let updateAvailable = $state(false);
	let registration: ServiceWorkerRegistration | null = $state(null);

	onMount(() => {
		if (!browser || !("serviceWorker" in navigator)) return;

		const checkForUpdates = async () => {
			try {
				const reg = await navigator.serviceWorker.getRegistration();
				if (!reg) return;

				registration = reg;

				// 새 Service Worker가 대기 중인지 확인
				if (reg.waiting) {
					updateAvailable = true;
					showUpdatePrompt = true;
					return;
				}

				// 새 Service Worker 설치 감지
				reg.addEventListener("updatefound", () => {
					const newWorker = reg.installing;
					if (!newWorker) return;

					newWorker.addEventListener("statechange", () => {
						if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
							updateAvailable = true;
							showUpdatePrompt = true;
						}
					});
				});

				// 새 Service Worker가 제어권을 가져갔을 때
				navigator.serviceWorker.addEventListener("controllerchange", () => {
					if (updateAvailable) {
						window.location.reload();
					}
				});

				// 주기적으로 업데이트 확인 (5분마다)
				setInterval(() => {
					reg.update().catch(console.error);
				}, 5 * 60 * 1000);

			} catch (error) {
				console.error("Service Worker 업데이트 확인 실패:", error);
			}
		};

		checkForUpdates();

		// 페이지 포커스 시 업데이트 확인
		const handleFocus = () => {
			if (registration) {
				registration.update().catch(console.error);
			}
		};

		window.addEventListener("focus", handleFocus);

		return () => {
			window.removeEventListener("focus", handleFocus);
		};
	});

	const handleUpdate = () => {
		if (!registration?.waiting) return;

		// 대기 중인 Service Worker에게 스킵 메시지 전송
		registration.waiting.postMessage({ type: "SKIP_WAITING" });

		showUpdatePrompt = false;
		
		// 잠시 후 페이지 새로고침
		setTimeout(() => {
			window.location.reload();
		}, 500);
	};

	const handleDismiss = () => {
		showUpdatePrompt = false;
		
		// 1시간 후 다시 표시되도록 설정
		setTimeout(() => {
			if (updateAvailable) {
				showUpdatePrompt = true;
			}
		}, 60 * 60 * 1000);
	};
</script>

{#if showUpdatePrompt && updateAvailable}
	<div class="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
		<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow-lg p-4">
			<div class="flex items-start gap-3">
				<div class="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</div>
				
				<div class="flex-1 min-w-0">
					<h3 class="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
						새 버전 업데이트
					</h3>
					<p class="text-xs text-blue-700 dark:text-blue-200 mb-3">
						새로운 기능과 개선사항이 포함된 업데이트가 있습니다
					</p>
					
					<div class="flex gap-2">
						<button
							type="button"
							onclick={handleUpdate}
							class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
						>
							지금 업데이트
						</button>
						
						<button
							type="button"
							onclick={handleDismiss}
							class="px-3 py-2 text-xs text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 transition-colors"
						>
							나중에
						</button>
					</div>
				</div>
				
				<button
					type="button"
					onclick={handleDismiss}
					aria-label="업데이트 안내 닫기"
					class="flex-shrink-0 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}
