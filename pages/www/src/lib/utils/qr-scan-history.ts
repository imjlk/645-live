/**
 * QR 스캔 히스토리 관리 유틸리티 (v2 with backwards compatibility)
 */

import { 
	QRScanHistoryManagerImpl, 
	LocalStorageProvider,
	type QRScanHistoryItem as V2QRScanHistoryItem,
	type QRScanHistoryManager as V2QRScanHistoryManager,
	generateScanSummary as v2GenerateScanSummary,
	getRelativeTimeString as v2GetRelativeTimeString
} from './qr-scan-history-v2.js';

// v1 호환 타입 (기존 코드 호환성 위해 유지)
export interface QRScanHistoryItem {
	id: string;
	qrData: string;
	scannedAt: Date;
	round?: number;
	gamesCount?: number;
	isWinner?: boolean;
	winningGrade?: string;
	summary: string;
}

// v1 호환 인터페이스 (동기 방식 유지)
export interface QRScanHistoryManager {
	addScan: (item: Omit<QRScanHistoryItem, 'id' | 'scannedAt'>) => QRScanHistoryItem;
	isDuplicate: (qrData: string) => boolean;
	getHistory: () => QRScanHistoryItem[];
	getRecentScans: (count?: number) => QRScanHistoryItem[];
	clearHistory: () => void;
	removeScan: (id: string) => void;
	getScanById: (id: string) => QRScanHistoryItem | null;
	getTotalScansToday: () => number;
	getWinningScans: () => QRScanHistoryItem[];
}

// v2 매니저 인스턴스 생성
const v2Manager = new QRScanHistoryManagerImpl();

/**
 * v1과 v2 타입 간 변환 유틸리티
 */
function convertV2ToV1(v2Item: V2QRScanHistoryItem): QRScanHistoryItem {
	return {
		id: v2Item.id,
		qrData: v2Item.qrData,
		scannedAt: v2Item.scannedAt,
		round: v2Item.round,
		gamesCount: v2Item.gamesCount,
		isWinner: v2Item.isWinner,
		winningGrade: v2Item.winningGrade,
		summary: v2Item.summary
	};
}

function convertV1ToV2(v1Item: Omit<QRScanHistoryItem, 'id' | 'scannedAt'>): Omit<V2QRScanHistoryItem, 'id' | 'scannedAt'> {
	return {
		qrData: v1Item.qrData,
		round: v1Item.round,
		gamesCount: v1Item.gamesCount,
		isWinner: v1Item.isWinner,
		winningGrade: v1Item.winningGrade,
		summary: v1Item.summary
	};
}

/**
 * v1 호환성 래퍼 - 동기 API를 비동기 v2 위에 구현
 */
function createV1CompatibilityWrapper(): QRScanHistoryManager {
	// 캐시된 데이터 (동기 액세스용)
	let cachedHistory: QRScanHistoryItem[] = [];
	let lastCacheUpdate = 0;
	const CACHE_TTL = 1000; // 1초 캐시

	/**
	 * 캐시 업데이트 (비동기 → 동기 브릿지)
	 */
	async function updateCache(): Promise<void> {
		try {
			const v2Items = await v2Manager.getHistory();
			cachedHistory = v2Items.map(convertV2ToV1);
			lastCacheUpdate = Date.now();
		} catch (error) {
			console.error('캐시 업데이트 실패:', error);
		}
	}

	/**
	 * 캐시된 데이터 가져오기 (필요시 백그라운드 업데이트)
	 */
	function getCachedHistory(): QRScanHistoryItem[] {
		// 캐시가 오래되었으면 백그라운드에서 업데이트
		if (Date.now() - lastCacheUpdate > CACHE_TTL) {
			updateCache(); // 비동기 실행 (결과 기다리지 않음)
		}
		return cachedHistory;
	}

	// 초기 캐시 로드
	updateCache();

	return {
		/**
		 * 새 스캔 추가
		 */
		addScan(item: Omit<QRScanHistoryItem, 'id' | 'scannedAt'>): QRScanHistoryItem {
			const v2Item = convertV1ToV2(item);
			
			// 비동기 호출을 동기처럼 처리 (임시 결과 반환)
			const tempItem: QRScanHistoryItem = {
				...item,
				id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				scannedAt: new Date()
			};

			// 백그라운드에서 v2 매니저에 추가하고 캐시 업데이트
			v2Manager.addScan(v2Item).then(result => {
				// 성공 시 캐시 업데이트
				updateCache();
			}).catch(error => {
				console.error('v2 매니저 addScan 실패:', error);
			});

			// 즉시 캐시에 추가
			cachedHistory.unshift(tempItem);
			return tempItem;
		},

		/**
		 * 중복 스캔 확인
		 */
		isDuplicate(qrData: string): boolean {
			// 캐시에서 중복 확인 (빠른 응답)
			const history = getCachedHistory();
			const oneDayAgo = new Date();
			oneDayAgo.setHours(oneDayAgo.getHours() - 24);
			
			// 간단한 해시 비교 (v2와 동일한 로직)
			const generateQRHash = (data: string): string => {
				let hash = 0;
				for (let i = 0; i < data.length; i++) {
					const char = data.charCodeAt(i);
					hash = ((hash << 5) - hash) + char;
					hash = hash & hash;
				}
				return Math.abs(hash).toString(36);
			};

			const qrHash = generateQRHash(qrData);
			const isDupe = history.some(item => {
				const itemHash = generateQRHash(item.qrData);
				return itemHash === qrHash && item.scannedAt > oneDayAgo;
			});

			// 백그라운드에서 v2 매니저에도 확인
			v2Manager.isDuplicate(qrData);

			return isDupe;
		},

		/**
		 * 전체 히스토리 조회
		 */
		getHistory(): QRScanHistoryItem[] {
			return getCachedHistory();
		},

		/**
		 * 최근 스캔 조회
		 */
		getRecentScans(count = 10): QRScanHistoryItem[] {
			const history = getCachedHistory();
			return history.slice(0, count);
		},

		/**
		 * 히스토리 전체 삭제
		 */
		clearHistory(): void {
			// 즉시 캐시 클리어
			cachedHistory = [];
			
			// 백그라운드에서 v2 매니저에서도 삭제
			v2Manager.clearHistory().then(() => {
				updateCache();
			}).catch(error => {
				console.error('v2 매니저 clearHistory 실패:', error);
			});
		},

		/**
		 * 특정 스캔 삭제
		 */
		removeScan(id: string): void {
			// 즉시 캐시에서 삭제
			cachedHistory = cachedHistory.filter(item => item.id !== id);
			
			// 백그라운드에서 v2 매니저에서도 삭제
			v2Manager.removeScan(id).then(() => {
				updateCache();
			}).catch(error => {
				console.error('v2 매니저 removeScan 실패:', error);
			});
		},

		/**
		 * ID로 스캔 조회
		 */
		getScanById(id: string): QRScanHistoryItem | null {
			const history = getCachedHistory();
			return history.find(item => item.id === id) || null;
		},

		/**
		 * 오늘 스캔한 총 개수
		 */
		getTotalScansToday(): number {
			const history = getCachedHistory();
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			
			return history.filter(item => item.scannedAt >= today).length;
		},

		/**
		 * 당첨된 스캔들만 조회
		 */
		getWinningScans(): QRScanHistoryItem[] {
			const history = getCachedHistory();
			return history.filter(item => item.isWinner === true);
		}
	};
}

/**
 * v1 호환 매니저 생성 함수
 */
export function createQRScanHistoryManager(): QRScanHistoryManager {
	return createV1CompatibilityWrapper();
}

/**
 * 기존 v1 데이터 마이그레이션 로직
 */
async function migrateV1Data(): Promise<boolean> {
	try {
		const LEGACY_STORAGE_KEY = 'qr-scan-history';
		
		// 브라우저 환경이 아니면 마이그레이션 건너뛰기
		if (typeof window === 'undefined' || !window.localStorage) {
			return false;
		}

		// 기존 v1 데이터 확인
		const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
		if (!legacyData) {
			return false; // 마이그레이션할 데이터 없음
		}

		try {
			const parsed = JSON.parse(legacyData);
			if (!Array.isArray(parsed) || parsed.length === 0) {
				return false;
			}

			console.log(`🔄 v1 → v2 마이그레이션 시작: ${parsed.length}개 항목`);

			// v2 매니저가 이미 데이터를 가지고 있는지 확인
			const existingData = await v2Manager.getHistory();
			if (existingData.length > 0) {
				console.log('✅ v2 데이터가 이미 존재함 - 마이그레이션 건너뛰기');
				return false;
			}

			// v1 → v2 데이터 변환 및 추가
			let migratedCount = 0;
			for (const item of parsed) {
				try {
					const v1Item = {
						...item,
						scannedAt: new Date(item.scannedAt) // Date 객체로 변환
					};

					// v1 → v2 형식으로 변환
					const v2Item = convertV1ToV2(v1Item);
					await v2Manager.addScan(v2Item);
					migratedCount++;
				} catch (itemError) {
					console.warn('개별 항목 마이그레이션 실패:', itemError);
				}
			}

			console.log(`✅ 마이그레이션 완료: ${migratedCount}/${parsed.length}개 항목`);

			// 마이그레이션 성공 시 기존 데이터를 백업 키로 이동
			const backupKey = `${LEGACY_STORAGE_KEY}-v1-backup-${Date.now()}`;
			localStorage.setItem(backupKey, legacyData);
			localStorage.removeItem(LEGACY_STORAGE_KEY);

			console.log(`📦 기존 데이터를 ${backupKey}로 백업`);
			return true;

		} catch (parseError) {
			console.error('기존 데이터 파싱 실패:', parseError);
			return false;
		}

	} catch (error) {
		console.error('데이터 마이그레이션 실패:', error);
		return false;
	}
}

/**
 * 전역 QR 스캔 히스토리 매니저 인스턴스 (마이그레이션 포함)
 */
const createMigratedManager = (): QRScanHistoryManager => {
	const manager = createV1CompatibilityWrapper();
	
	// 백그라운드에서 마이그레이션 실행
	migrateV1Data().then(migrated => {
		if (migrated) {
			console.log('✅ QR 스캔 히스토리 v1 → v2 마이그레이션 완료');
		}
	}).catch(error => {
		console.error('❌ 마이그레이션 중 오류:', error);
	});

	return manager;
};

export const qrScanHistory = createMigratedManager();

/**
 * v2 매니저에 직접 접근 (고급 사용자용)
 */
export const qrScanHistoryV2 = v2Manager;

/**
 * QR 스캔 결과로부터 요약 텍스트 생성 (v1 호환)
 */
export function generateScanSummary(options: {
	round?: number;
	gamesCount?: number;
	isWinner?: boolean;
	winningGrade?: string;
	isUnreleased?: boolean;
}): string {
	return v2GenerateScanSummary(options);
}

/**
 * 상대적 시간 표시 (v1 호환)
 */
export function getRelativeTimeString(date: Date): string {
	return v2GetRelativeTimeString(date);
}

/**
 * 회원 로그인 시 호출할 함수
 */
export function setCurrentUser(userId: string | null): void {
	v2Manager.setUserId(userId);
	
	if (userId) {
		console.log(`👤 사용자 설정: ${userId}`);
		// 향후 API 프로바이더 활성화 시 사용
		// v2Manager.setPreferredProvider('api');
	} else {
		console.log('👤 비회원 모드로 전환');
		v2Manager.setPreferredProvider('localStorage');
	}
}

/**
 * 수동 동기화 트리거 (회원용)
 */
export async function syncHistory(): Promise<{ success: boolean; error?: string }> {
	if (!v2Manager.getUserId()) {
		return { success: false, error: '로그인이 필요합니다' };
	}

	return await v2Manager.sync();
}