/**
 * PWA 성능 모니터링 및 최적화 유틸리티
 * - Web Vitals 측정
 * - PWA 기능 감지
 * - 성능 메트릭 수집
 */

interface PWAMetrics {
	isInstalled: boolean;
	isOnline: boolean;
	serviceWorkerStatus: 'none' | 'installing' | 'installed' | 'activating' | 'activated' | 'redundant';
	cacheHitRate: number;
	lastUpdateCheck: Date | null;
	installPromptShown: boolean;
	notifications: {
		permission: NotificationPermission;
		supported: boolean;
	};
	performance: {
		loadTime: number;
		cacheLoadTime: number;
		networkLoadTime: number;
	};
}

class PWAPerformanceMonitor {
	private metrics: PWAMetrics;
	private cacheHits = 0;
	private cacheMisses = 0;
	private startTime = performance.now();

	constructor() {
		this.metrics = this.initializeMetrics();
		this.setupEventListeners();
		this.startPerformanceMonitoring();
	}

	private initializeMetrics(): PWAMetrics {
		return {
			isInstalled: this.checkIfInstalled(),
			isOnline: navigator.onLine,
			serviceWorkerStatus: 'none',
			cacheHitRate: 0,
			lastUpdateCheck: null,
			installPromptShown: false,
			notifications: {
				permission: 'default',
				supported: 'Notification' in window && 'serviceWorker' in navigator
			},
			performance: {
				loadTime: 0,
				cacheLoadTime: 0,
				networkLoadTime: 0
			}
		};
	}

	private checkIfInstalled(): boolean {
		// Standalone 모드 확인 (Android Chrome)
		if (window.matchMedia('(display-mode: standalone)').matches) {
			return true;
		}

		// iOS Safari standalone 모드 확인
		if ((window.navigator as any).standalone === true) {
			return true;
		}

		return false;
	}

	private setupEventListeners(): void {
		// 온라인/오프라인 상태 모니터링
		window.addEventListener('online', () => {
			this.metrics.isOnline = true;
			this.logEvent('network_status_changed', { online: true });
		});

		window.addEventListener('offline', () => {
			this.metrics.isOnline = false;
			this.logEvent('network_status_changed', { online: false });
		});

		// Service Worker 상태 모니터링
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.ready.then(registration => {
				this.metrics.serviceWorkerStatus = 'activated';
				this.monitorServiceWorker(registration);
			});
		}

		// 알림 권한 모니터링
		if ('Notification' in window) {
			this.metrics.notifications.permission = Notification.permission;
		}

		// beforeinstallprompt 이벤트 모니터링
		window.addEventListener('beforeinstallprompt', () => {
			this.metrics.installPromptShown = true;
			this.logEvent('install_prompt_shown');
		});

		// PWA 설치 완료 모니터링
		window.addEventListener('appinstalled', () => {
			this.metrics.isInstalled = true;
			this.logEvent('pwa_installed');
		});
	}

	private monitorServiceWorker(registration: ServiceWorkerRegistration): void {
		// Service Worker 업데이트 감지
		registration.addEventListener('updatefound', () => {
			this.metrics.lastUpdateCheck = new Date();
			this.logEvent('service_worker_update_found');
		});

		// 주기적 업데이트 확인 설정 (5분마다)
		setInterval(() => {
			registration.update().then(() => {
				this.metrics.lastUpdateCheck = new Date();
			}).catch(console.error);
		}, 5 * 60 * 1000);
	}

	private startPerformanceMonitoring(): void {
		// Page Load 성능 측정
		window.addEventListener('load', () => {
			const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
			if (navigation) {
				this.metrics.performance.loadTime = navigation.loadEventEnd - navigation.fetchStart;
				this.logEvent('page_load_performance', {
					loadTime: this.metrics.performance.loadTime,
					domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
					firstContentfulPaint: this.getFirstContentfulPaint()
				});
			}
		});

		// Web Vitals 모니터링 (가능한 경우)
		this.monitorWebVitals();

		// 캐시 성능 모니터링
		this.monitorCachePerformance();
	}

	private getFirstContentfulPaint(): number {
		const entries = performance.getEntriesByType('paint') as PerformanceEntry[];
		const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
		return fcpEntry ? fcpEntry.startTime : 0;
	}

	private monitorWebVitals(): void {
		// Largest Contentful Paint
		if ('PerformanceObserver' in window) {
			try {
				const lcpObserver = new PerformanceObserver((list) => {
					const entries = list.getEntries();
					const lastEntry = entries[entries.length - 1] as any;
					this.logEvent('web_vital_lcp', { value: lastEntry.startTime });
				});
				lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

				// First Input Delay
				const fidObserver = new PerformanceObserver((list) => {
					const entries = list.getEntries();
					entries.forEach((entry: any) => {
						this.logEvent('web_vital_fid', { value: entry.processingStart - entry.startTime });
					});
				});
				fidObserver.observe({ entryTypes: ['first-input'] });

				// Cumulative Layout Shift
				let clsValue = 0;
				const clsObserver = new PerformanceObserver((list) => {
					const entries = list.getEntries();
					entries.forEach((entry: any) => {
						if (!entry.hadRecentInput) {
							clsValue += entry.value;
						}
					});
					this.logEvent('web_vital_cls', { value: clsValue });
				});
				clsObserver.observe({ entryTypes: ['layout-shift'] });
			} catch (error) {
				console.warn('Web Vitals 모니터링 설정 실패:', error);
			}
		}
	}

	private monitorCachePerformance(): void {
		// Fetch 이벤트 가로채기로 캐시 성능 측정
		const originalFetch = window.fetch;
		window.fetch = async (...args) => {
			const startTime = performance.now();
			try {
				const response = await originalFetch(...args);
				const endTime = performance.now();
				const duration = endTime - startTime;

				// 캐시에서 온 응답인지 확인 (정확하지 않지만 추정)
				if (duration < 50) { // 50ms 이하면 캐시로 간주
					this.cacheHits++;
					this.metrics.performance.cacheLoadTime = duration;
				} else {
					this.cacheMisses++;
					this.metrics.performance.networkLoadTime = duration;
				}

				this.updateCacheHitRate();
				return response;
			} catch (error) {
				this.cacheMisses++;
				this.updateCacheHitRate();
				throw error;
			}
		};
	}

	private updateCacheHitRate(): void {
		const total = this.cacheHits + this.cacheMisses;
		this.metrics.cacheHitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
	}

	private logEvent(eventName: string, data?: any): void {
		// 성능 로그를 콘솔 또는 분석 서비스로 전송
		const eventData = {
			timestamp: new Date().toISOString(),
			event: eventName,
			data,
			metrics: this.getMetrics()
		};

		// 개발 환경에서는 콘솔에 출력
		if (!import.meta.env.PROD) {
		}

		// 프로덕션에서는 분석 서비스로 전송 (예: Google Analytics, Microsoft Clarity)
		if (import.meta.env.PROD && window.gtag) {
			window.gtag('event', eventName, {
				custom_parameter_1: JSON.stringify(data)
			});
		}
	}

	// 공개 메소드들
	public getMetrics(): PWAMetrics {
		return { ...this.metrics };
	}

	public checkCacheStatus(): Promise<{ [key: string]: number }> {
		return caches.keys().then(cacheNames => {
			const promises = cacheNames.map(async name => {
				const cache = await caches.open(name);
				const keys = await cache.keys();
				return { name, count: keys.length };
			});

			return Promise.all(promises).then(results => {
				const status: { [key: string]: number } = {};
				results.forEach(result => {
					status[result.name] = result.count;
				});
				return status;
			});
		});
	}

	public clearOldCaches(): Promise<void> {
		return caches.keys().then(cacheNames => {
			const oldCaches = cacheNames.filter(name => 
				!name.includes('v1.0.0') // 현재 버전이 아닌 캐시 삭제
			);

			return Promise.all(
				oldCaches.map(name => caches.delete(name))
			).then(() => {
				this.logEvent('old_caches_cleared', { count: oldCaches.length });
			});
		});
	}

	public requestNotificationPermission(): Promise<NotificationPermission> {
		if (!('Notification' in window)) {
			return Promise.resolve('denied');
		}

		return Notification.requestPermission().then(permission => {
			this.metrics.notifications.permission = permission;
			this.logEvent('notification_permission_requested', { permission });
			return permission;
		});
	}

	public generatePerformanceReport(): string {
		const metrics = this.getMetrics();
		const uptime = performance.now() - this.startTime;

		return `
=== 645.live PWA 성능 보고서 ===
설치 상태: ${metrics.isInstalled ? '설치됨' : '미설치'}
온라인 상태: ${metrics.isOnline ? '온라인' : '오프라인'}
Service Worker: ${metrics.serviceWorkerStatus}
캐시 적중률: ${metrics.cacheHitRate.toFixed(1)}%
페이지 로드 시간: ${metrics.performance.loadTime.toFixed(0)}ms
캐시 평균 응답 시간: ${metrics.performance.cacheLoadTime.toFixed(0)}ms
네트워크 평균 응답 시간: ${metrics.performance.networkLoadTime.toFixed(0)}ms
세션 시간: ${(uptime / 1000 / 60).toFixed(1)}분
알림 권한: ${metrics.notifications.permission}
마지막 업데이트 확인: ${metrics.lastUpdateCheck?.toLocaleString() || '없음'}
		`.trim();
	}
}

// 전역 인스턴스 생성
let performanceMonitor: PWAPerformanceMonitor | null = null;

export function initPWAPerformanceMonitor(): PWAPerformanceMonitor {
	if (!performanceMonitor && typeof window !== 'undefined') {
		performanceMonitor = new PWAPerformanceMonitor();
	}
	return performanceMonitor!;
}

export function getPWAMetrics(): PWAMetrics | null {
	return performanceMonitor?.getMetrics() || null;
}

export { type PWAMetrics };