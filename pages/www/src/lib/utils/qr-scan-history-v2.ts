/**
 * QR 스캔 히스토리 관리 유틸리티 (확장 가능한 버전)
 * 
 * 설계 원칙:
 * 1. Storage Provider 패턴으로 다양한 저장소 지원
 * 2. 회원/비회원 모드 지원
 * 3. 동기화 전략 지원
 * 4. 오프라인 우선 접근법
 */

import { browser } from "$app/environment";

// ===== 기본 타입 정의 =====

export interface QRScanHistoryItem {
	id: string;
	qrData: string;
	scannedAt: Date;
	round?: number;
	gamesCount?: number;
	isWinner?: boolean;
	winningGrade?: string;
	summary: string;
	// 확장 필드들
	userId?: string; // 회원 ID
	syncStatus?: 'local' | 'synced' | 'pending' | 'failed';
	lastSyncAt?: Date;
	metadata?: Record<string, any>; // 추가 메타데이터
}

export interface QRScanHistoryFilter {
	userId?: string;
	dateRange?: { start: Date; end: Date };
	isWinner?: boolean;
	rounds?: number[];
	syncStatus?: QRScanHistoryItem['syncStatus'];
	limit?: number;
	offset?: number;
}

export interface QRScanHistoryStats {
	totalScans: number;
	todayScans: number;
	winningScans: number;
	uniqueRounds: number;
	lastScanAt?: Date;
}

// ===== Storage Provider 인터페이스 =====

export interface QRScanStorageProvider {
	name: string;
	isAvailable(): boolean;
	
	// 기본 CRUD 작업
	getItems(filter?: QRScanHistoryFilter): Promise<QRScanHistoryItem[]>;
	addItem(item: Omit<QRScanHistoryItem, 'id' | 'scannedAt'>): Promise<QRScanHistoryItem>;
	updateItem(id: string, updates: Partial<QRScanHistoryItem>): Promise<boolean>;
	removeItem(id: string): Promise<boolean>;
	clearAll(userId?: string): Promise<boolean>;
	
	// 중복 확인
	isDuplicate(qrData: string, userId?: string): Promise<boolean>;
	
	// 통계
	getStats(userId?: string): Promise<QRScanHistoryStats>;
	
	// 동기화 관련 (선택적)
	markForSync?(id: string): Promise<boolean>;
	getPendingSync?(userId?: string): Promise<QRScanHistoryItem[]>;
}

// ===== 동기화 전략 인터페이스 =====

export interface QRScanSyncStrategy {
	name: string;
	canSync(): boolean;
	
	// 로컬 → 원격 동기화
	uploadPending(items: QRScanHistoryItem[]): Promise<{ success: string[]; failed: string[] }>;
	
	// 원격 → 로컬 동기화  
	downloadRemote(userId: string, lastSyncAt?: Date): Promise<QRScanHistoryItem[]>;
	
	// 충돌 해결
	resolveConflicts?(local: QRScanHistoryItem[], remote: QRScanHistoryItem[]): Promise<QRScanHistoryItem[]>;
}

// ===== 통합 매니저 인터페이스 =====

export interface QRScanHistoryManager {
	// 기본 히스토리 관리
	addScan(item: Omit<QRScanHistoryItem, 'id' | 'scannedAt'>): Promise<QRScanHistoryItem>;
	isDuplicate(qrData: string): Promise<boolean>;
	getHistory(filter?: QRScanHistoryFilter): Promise<QRScanHistoryItem[]>;
	getRecentScans(count?: number): Promise<QRScanHistoryItem[]>;
	clearHistory(): Promise<boolean>;
	removeScan(id: string): Promise<boolean>;
	getScanById(id: string): Promise<QRScanHistoryItem | null>;
	getStats(): Promise<QRScanHistoryStats>;
	getTotalScansToday(): Promise<number>;
	
	// 회원 관리
	setUserId(userId: string | null): void;
	getUserId(): string | null;
	
	// 동기화 관리
	sync(): Promise<{ success: boolean; error?: string }>;
	setSyncStrategy(strategy: QRScanSyncStrategy): void;
	
	// 스토리지 제공자 관리
	addStorageProvider(provider: QRScanStorageProvider): void;
	setPreferredProvider(name: string): void;
	getAvailableProviders(): string[];
}

// ===== LocalStorage Provider 구현 =====

export class LocalStorageProvider implements QRScanStorageProvider {
	name = 'localStorage';
	private storageKey = 'qr-scan-history';
	private maxItems = 100;

	isAvailable(): boolean {
		return browser && typeof localStorage !== 'undefined';
	}

	private async loadFromStorage(): Promise<QRScanHistoryItem[]> {
		if (!this.isAvailable()) return [];
		
		try {
			const stored = localStorage.getItem(this.storageKey);
			if (!stored) return [];
			
			const parsed = JSON.parse(stored);
			return parsed.map((item: any) => ({
				...item,
				scannedAt: new Date(item.scannedAt),
				lastSyncAt: item.lastSyncAt ? new Date(item.lastSyncAt) : undefined
			})).sort((a: QRScanHistoryItem, b: QRScanHistoryItem) => 
				b.scannedAt.getTime() - a.scannedAt.getTime()
			);
		} catch (error) {
			console.error('LocalStorage 로드 실패:', error);
			return [];
		}
	}

	private async saveToStorage(items: QRScanHistoryItem[]): Promise<void> {
		if (!this.isAvailable()) return;
		
		try {
			const limitedItems = items.slice(0, this.maxItems);
			localStorage.setItem(this.storageKey, JSON.stringify(limitedItems));
		} catch (error) {
			console.error('LocalStorage 저장 실패:', error);
		}
	}

	async getItems(filter?: QRScanHistoryFilter): Promise<QRScanHistoryItem[]> {
		const items = await this.loadFromStorage();
		
		if (!filter) return items;
		
		let filtered = items;
		
		if (filter.userId) {
			filtered = filtered.filter(item => item.userId === filter.userId);
		}
		
		if (filter.dateRange) {
			filtered = filtered.filter(item => 
				item.scannedAt >= filter.dateRange!.start && 
				item.scannedAt <= filter.dateRange!.end
			);
		}
		
		if (filter.isWinner !== undefined) {
			filtered = filtered.filter(item => item.isWinner === filter.isWinner);
		}
		
		if (filter.rounds) {
			filtered = filtered.filter(item => 
				item.round && filter.rounds!.includes(item.round)
			);
		}
		
		if (filter.syncStatus) {
			filtered = filtered.filter(item => item.syncStatus === filter.syncStatus);
		}
		
		if (filter.offset) {
			filtered = filtered.slice(filter.offset);
		}
		
		if (filter.limit) {
			filtered = filtered.slice(0, filter.limit);
		}
		
		return filtered;
	}

	async addItem(item: Omit<QRScanHistoryItem, 'id' | 'scannedAt'>): Promise<QRScanHistoryItem> {
		const items = await this.loadFromStorage();
		
		const newItem: QRScanHistoryItem = {
			...item,
			id: this.generateId(),
			scannedAt: new Date(),
			syncStatus: 'local'
		};
		
		items.unshift(newItem);
		await this.saveToStorage(items);
		
		return newItem;
	}

	async updateItem(id: string, updates: Partial<QRScanHistoryItem>): Promise<boolean> {
		const items = await this.loadFromStorage();
		const index = items.findIndex(item => item.id === id);
		
		if (index === -1) return false;
		
		items[index] = { ...items[index], ...updates };
		await this.saveToStorage(items);
		
		return true;
	}

	async removeItem(id: string): Promise<boolean> {
		const items = await this.loadFromStorage();
		const filtered = items.filter(item => item.id !== id);
		
		if (filtered.length === items.length) return false;
		
		await this.saveToStorage(filtered);
		return true;
	}

	async clearAll(userId?: string): Promise<boolean> {
		if (userId) {
			const items = await this.loadFromStorage();
			const filtered = items.filter(item => item.userId !== userId);
			await this.saveToStorage(filtered);
		} else {
			if (this.isAvailable()) {
				localStorage.removeItem(this.storageKey);
			}
		}
		return true;
	}

	async isDuplicate(qrData: string, userId?: string): Promise<boolean> {
		const items = await this.loadFromStorage();
		const oneWeekAgo = new Date();
		oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
		
		return items.some(item => {
			const matchesUser = userId ? item.userId === userId : true;
			return item.qrData === qrData && item.scannedAt > oneWeekAgo && matchesUser;
		});
	}

	async getStats(userId?: string): Promise<QRScanHistoryStats> {
		const items = await this.getItems(userId ? { userId } : undefined);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		
		const todayItems = items.filter(item => item.scannedAt >= today);
		const winningItems = items.filter(item => item.isWinner);
		const uniqueRounds = new Set(items.map(item => item.round).filter(Boolean)).size;
		
		return {
			totalScans: items.length,
			todayScans: todayItems.length,
			winningScans: winningItems.length,
			uniqueRounds,
			lastScanAt: items.length > 0 ? items[0].scannedAt : undefined
		};
	}

	async markForSync(id: string): Promise<boolean> {
		return this.updateItem(id, { syncStatus: 'pending' });
	}

	async getPendingSync(userId?: string): Promise<QRScanHistoryItem[]> {
		return this.getItems({ 
			syncStatus: 'pending',
			userId
		});
	}

	private generateId(): string {
		return `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateQRHash(qrData: string): string {
		let hash = 0;
		for (let i = 0; i < qrData.length; i++) {
			const char = qrData.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return Math.abs(hash).toString(36);
	}
}

// ===== API/Database Provider (미래 구현용 스켈레톤) =====

export class ApiStorageProvider implements QRScanStorageProvider {
	name = 'api';
	
	constructor(private apiEndpoint: string, private authToken?: string) {}

	isAvailable(): boolean {
		return browser && !!this.authToken;
	}

	async getItems(filter?: QRScanHistoryFilter): Promise<QRScanHistoryItem[]> {
		// TODO: API 호출 구현
		throw new Error('API Provider 구현 예정');
	}

	async addItem(item: Omit<QRScanHistoryItem, 'id' | 'scannedAt'>): Promise<QRScanHistoryItem> {
		// TODO: API 호출 구현
		throw new Error('API Provider 구현 예정');
	}

	async updateItem(id: string, updates: Partial<QRScanHistoryItem>): Promise<boolean> {
		// TODO: API 호출 구현
		throw new Error('API Provider 구현 예정');
	}

	async removeItem(id: string): Promise<boolean> {
		// TODO: API 호출 구현
		throw new Error('API Provider 구현 예정');
	}

	async clearAll(userId?: string): Promise<boolean> {
		// TODO: API 호출 구현
		throw new Error('API Provider 구현 예정');
	}

	async isDuplicate(qrData: string, userId?: string): Promise<boolean> {
		// TODO: API 호출 구현
		throw new Error('API Provider 구현 예정');
	}

	async getStats(userId?: string): Promise<QRScanHistoryStats> {
		// TODO: API 호출 구현
		throw new Error('API Provider 구현 예정');
	}
}

// ===== 통합 매니저 구현 =====

export class QRScanHistoryManagerImpl implements QRScanHistoryManager {
	private providers: Map<string, QRScanStorageProvider> = new Map();
	private preferredProvider: string = 'localStorage';
	private currentUserId: string | null = null;
	private syncStrategy?: QRScanSyncStrategy;

	constructor() {
		// 기본 LocalStorage 프로바이더 추가
		this.addStorageProvider(new LocalStorageProvider());
	}

	// === Storage Provider 관리 ===

	addStorageProvider(provider: QRScanStorageProvider): void {
		this.providers.set(provider.name, provider);
	}

	setPreferredProvider(name: string): void {
		if (this.providers.has(name)) {
			this.preferredProvider = name;
		}
	}

	getAvailableProviders(): string[] {
		return Array.from(this.providers.keys()).filter(name => 
			this.providers.get(name)?.isAvailable()
		);
	}

	private getCurrentProvider(): QRScanStorageProvider {
		const provider = this.providers.get(this.preferredProvider);
		if (provider?.isAvailable()) {
			return provider;
		}
		
		// 폴백: 사용 가능한 첫 번째 프로바이더
		for (const [, p] of this.providers) {
			if (p.isAvailable()) {
				return p;
			}
		}
		
		throw new Error('사용 가능한 스토리지 프로바이더가 없습니다');
	}

	// === 사용자 관리 ===

	setUserId(userId: string | null): void {
		this.currentUserId = userId;
	}

	getUserId(): string | null {
		return this.currentUserId;
	}

	// === 기본 히스토리 관리 ===

	async addScan(item: Omit<QRScanHistoryItem, 'id' | 'scannedAt'>): Promise<QRScanHistoryItem> {
		const provider = this.getCurrentProvider();
		
		// 중복 검사 (URL/QR 데이터 기준)
		const isDupe = await provider.isDuplicate(item.qrData, this.currentUserId || undefined);
		if (isDupe) {
			throw new Error('이미 스캔한 QR 코드입니다');
		}
		
		const itemWithUser = {
			...item,
			userId: this.currentUserId || undefined
		};
		
		const result = await provider.addItem(itemWithUser);
		
		// 회원이고 동기화 전략이 있으면 동기화 마킹
		if (this.currentUserId && this.syncStrategy && provider.markForSync) {
			await provider.markForSync(result.id);
		}
		
		return result;
	}

	async isDuplicate(qrData: string): Promise<boolean> {
		const provider = this.getCurrentProvider();
		return provider.isDuplicate(qrData, this.currentUserId || undefined);
	}

	async getHistory(filter?: QRScanHistoryFilter): Promise<QRScanHistoryItem[]> {
		const provider = this.getCurrentProvider();
		const userFilter = {
			...filter,
			userId: this.currentUserId || filter?.userId
		};
		return provider.getItems(userFilter);
	}

	async getRecentScans(count = 10): Promise<QRScanHistoryItem[]> {
		return this.getHistory({ limit: count });
	}

	async clearHistory(): Promise<boolean> {
		const provider = this.getCurrentProvider();
		return provider.clearAll(this.currentUserId || undefined);
	}

	async removeScan(id: string): Promise<boolean> {
		const provider = this.getCurrentProvider();
		return provider.removeItem(id);
	}

	async getScanById(id: string): Promise<QRScanHistoryItem | null> {
		const items = await this.getHistory();
		return items.find(item => item.id === id) || null;
	}

	async getStats(): Promise<QRScanHistoryStats> {
		const provider = this.getCurrentProvider();
		return provider.getStats(this.currentUserId || undefined);
	}

	async getTotalScansToday(): Promise<number> {
		const stats = await this.getStats();
		return stats.todayScans;
	}

	// === 동기화 관리 ===

	setSyncStrategy(strategy: QRScanSyncStrategy): void {
		this.syncStrategy = strategy;
	}

	async sync(): Promise<{ success: boolean; error?: string }> {
		if (!this.syncStrategy || !this.currentUserId) {
			return { success: false, error: '동기화 전략 또는 사용자 ID가 없습니다' };
		}

		if (!this.syncStrategy.canSync()) {
			return { success: false, error: '동기화를 수행할 수 없습니다' };
		}

		try {
			const provider = this.getCurrentProvider();
			
			// 1. 로컬 → 원격 동기화
			if (provider.getPendingSync) {
				const pendingItems = await provider.getPendingSync(this.currentUserId);
				if (pendingItems.length > 0) {
					const uploadResult = await this.syncStrategy.uploadPending(pendingItems);
					
					// 성공한 항목들을 synced로 마킹
					for (const id of uploadResult.success) {
						await provider.updateItem(id, { 
							syncStatus: 'synced', 
							lastSyncAt: new Date() 
						});
					}
					
					// 실패한 항목들을 failed로 마킹
					for (const id of uploadResult.failed) {
						await provider.updateItem(id, { syncStatus: 'failed' });
					}
				}
			}
			
			// 2. 원격 → 로컬 동기화
			const stats = await this.getStats();
			const remoteItems = await this.syncStrategy.downloadRemote(
				this.currentUserId, 
				stats.lastScanAt
			);
			
			// 원격에서 가져온 항목들을 로컬에 추가
			for (const remoteItem of remoteItems) {
				await provider.addItem({
					...remoteItem,
					syncStatus: 'synced'
				});
			}
			
			return { success: true };
		} catch (error) {
			console.error('동기화 실패:', error);
			return { 
				success: false, 
				error: error instanceof Error ? error.message : '알 수 없는 오류' 
			};
		}
	}
}

// ===== 유틸리티 함수들 =====

export function generateScanSummary(options: {
	round?: number;
	gamesCount?: number;
	isWinner?: boolean;
	winningGrade?: string;
	isUnreleased?: boolean;
}): string {
	const { round, gamesCount, isWinner, winningGrade, isUnreleased } = options;
	
	if (isUnreleased) {
		return `${round}회차 ${gamesCount}게임 (미발표)`;
	}
	
	if (isWinner && winningGrade) {
		return `${round}회차 ${gamesCount}게임 (${winningGrade} 당첨!)`;
	}
	
	if (round && gamesCount) {
		return `${round}회차 ${gamesCount}게임 (당첨없음)`;
	}
	
	return `QR 스캔 완료 (${gamesCount || 0}게임)`;
}

export function getRelativeTimeString(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSeconds < 60) {
		return '방금';
	} else if (diffMinutes < 60) {
		return `${diffMinutes}분 전`;
	} else if (diffHours < 24) {
		return `${diffHours}시간 전`;
	} else if (diffDays < 7) {
		return `${diffDays}일 전`;
	} else {
		return date.toLocaleDateString('ko-KR', {
			month: 'short',
			day: 'numeric'
		});
	}
}

// ===== 전역 인스턴스 (기존 호환성 유지) =====

export const qrScanHistory = new QRScanHistoryManagerImpl();