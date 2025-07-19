/**
 * 전역 스트림 관리 스토어
 * lotto_draw_scan_counts 테이블의 실시간 업데이트를 앱 전체에서 공유
 */

import { env } from "$env/dynamic/public";
import { writable } from "svelte/store";
import {
	type Client,
	type Event as TrailbaseEvent,
	initClient,
} from "trailbase";

// 스캔 카운트 레코드 타입
export interface LottoDrawScanCount {
	round: number;
	scan_count_1: number;
	scan_count_2: number;
	scan_count_3: number;
	scan_count_4: number;
	scan_count_5: number;
	scan_count_6: number;
	scan_count_7: number;
	scan_count_8: number;
	scan_count_9: number;
	scan_count_10: number;
	scan_count_11: number;
	scan_count_12: number;
	scan_count_13: number;
	scan_count_14: number;
	scan_count_15: number;
	scan_count_16: number;
	scan_count_17: number;
	scan_count_18: number;
	scan_count_19: number;
	scan_count_20: number;
	scan_count_21: number;
	scan_count_22: number;
	scan_count_23: number;
	scan_count_24: number;
	scan_count_25: number;
	scan_count_26: number;
	scan_count_27: number;
	scan_count_28: number;
	scan_count_29: number;
	scan_count_30: number;
	scan_count_31: number;
	scan_count_32: number;
	scan_count_33: number;
	scan_count_34: number;
	scan_count_35: number;
	scan_count_36: number;
	scan_count_37: number;
	scan_count_38: number;
	scan_count_39: number;
	scan_count_40: number;
	scan_count_41: number;
	scan_count_42: number;
	scan_count_43: number;
	scan_count_44: number;
	scan_count_45: number;
	total_scans: number;
	updated_at: string;
}

// 구독자 콜백 타입
type SubscriberCallback = (data: LottoDrawScanCount) => void;

// 전역 스트림 관리 클래스
class GlobalStreamManager {
	private client: Client | null = null;
	private api: ReturnType<Client["records"]> | null = null;
	private stream: ReadableStream<TrailbaseEvent> | null = null;
	private reader: ReadableStreamDefaultReader<TrailbaseEvent> | null = null;
	private isReading = false;
	private isStarting = false; // 스트림 시작 중인지 추적
	private subscribers = new Map<string, SubscriberCallback>();

	constructor() {
		// 브라우저 환경에서만 초기화
		if (typeof window !== "undefined") {
			this.client = initClient(
				env.PUBLIC_TRAILBASE_URL || "http://localhost:4000",
			);
			this.api = this.client.records("lotto_draw_scan_counts");
		}
	}

	// 구독자 추가
	subscribe(id: string, callback: SubscriberCallback): () => void {
		this.subscribers.set(id, callback);

		// 첫 구독자이거나 스트림이 없는 경우 스트림 시작
		if (this.subscribers.size === 1 && !this.isReading && !this.isStarting) {
			this.startStream();
		}

		// 구독 해제 함수 반환
		return () => {
			this.subscribers.delete(id);

			// 잠시 대기 후 구독자가 없으면 스트림 정리 (페이지 전환 시 짧은 틈 허용)
			setTimeout(() => {
				if (this.subscribers.size === 0 && this.isReading) {
					this.cleanup();
				}
			}, 100); // 100ms 지연
		};
	}

	// 스트림 시작
	private async startStream() {
		if (this.isReading || this.isStarting || !this.api) {
			return;
		}

		this.isStarting = true;

		try {
			this.stream = await this.api.subscribe("*");

			if (this.stream) {
				this.reader = this.stream.getReader();
				this.isReading = true;
				this.isStarting = false;
				this.readStreamData();
			}
		} catch (err) {
			this.isStarting = false;
		}
	}

	// 스트림 데이터 읽기
	private async readStreamData() {
		if (!this.reader) return;

		try {
			while (this.isReading) {
				const { done, value } = await this.reader.read();

				if (done) {
					break;
				}

				// 업데이트 이벤트 처리
				if (value && "Update" in value) {
					const scanData = value.Update as unknown as LottoDrawScanCount;

					// 모든 구독자에게 데이터 전달
					for (const callback of this.subscribers.values()) {
						try {
							callback(scanData);
						} catch (err) {
							// Silently handle callback errors
						}
					}
				}
			}
		} catch (err) {
			// Silently handle stream reading errors
		} finally {
			if (this.isReading) {
				await this.cleanup();
			}
		}
	}

	// 스트림 정리
	private async cleanup() {
		this.isReading = false;
		this.isStarting = false;

		if (this.reader) {
			try {
				await this.reader.cancel();
			} catch (err) {
				// Silently handle cancellation errors
			}
			this.reader = null;
		}
		this.stream = null;
	}

	// 강제 재연결 (디버깅용)
	async reconnect() {
		await this.cleanup();
		if (this.subscribers.size > 0) {
			this.startStream();
		}
	}

	// API 접근 (직접 데이터 조회용)
	getApi() {
		return this.api;
	}

	// 안전한 스캔 데이터 조회 (404 에러 방지)
	async getScanDataSafely(round: number): Promise<LottoDrawScanCount | null> {
		if (!this.api) return null;

		try {
			const scanData = (await this.api.read(
				round.toString(),
			)) as unknown as LottoDrawScanCount;
			return scanData;
		} catch (err: unknown) {
			// 404나 다른 에러 시 null 반환 (로그는 남기지 않음)
			const error = err as { status?: number; message?: string };
			if (
				error?.status === 404 ||
				error?.message?.includes("404") ||
				error?.message?.includes("Not Found")
			) {
				return null;
			}
			// Silently handle other errors
			return null;
		}
	}

	// 최신 스캔 데이터 조회
	async getLatestScanData(): Promise<LottoDrawScanCount | null> {
		if (!this.api) return null;

		try {
			const response = await this.api.list({
				order: ["-round"], // Sort by round descending to get latest
				pagination: { limit: 1 },
			});

			if (response.records.length > 0) {
				return response.records[0] as unknown as LottoDrawScanCount;
			}
			return null;
		} catch (err) {
			return null;
		}
	}
}

// 전역 인스턴스 생성
export const globalStreamManager = new GlobalStreamManager();

// 편의 함수들
export const streamStore = writable<LottoDrawScanCount | null>(null);

// 스트림 구독 헬퍼 함수
export function subscribeToScanCountUpdates(
	id: string,
	callback: SubscriberCallback,
) {
	return globalStreamManager.subscribe(id, callback);
}

// API 접근 헬퍼 함수
export function getScanCountApi() {
	return globalStreamManager.getApi();
}

// 안전한 스캔 데이터 조회 헬퍼 함수
export function getScanDataSafely(round: number) {
	return globalStreamManager.getScanDataSafely(round);
}

// 최신 스캔 데이터 조회 헬퍼 함수
export function getLatestScanData() {
	return globalStreamManager.getLatestScanData();
}
