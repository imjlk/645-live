/**
 * 로또 당첨점 업데이트 유틸리티 함수들 (Deno/V8 환경용)
 */

import { query } from "./trailbase-compat";

// 당첨점 정보 타입
export type WinningStore = {
	round: number;
	store_name: string;
	address: string;
	win_type: "1등" | "2등";
	selection_type?: "자동" | "수동"; // 1등만 해당
};

type WinningStoreApiItem = {
	shpNm?: string;
	shpAddr?: string;
	wnShpRnk?: number | string;
	atmtPsvYnTxt?: string | null;
};

type WinningStoreApiResponse = {
	data?: {
		list?: WinningStoreApiItem[];
	};
};

const WINNING_STORE_API_URL =
	"https://www.dhlottery.co.kr/wnprchsplcsrch/selectLtWnShp.do";

function normalizeText(value: unknown): string {
	if (typeof value !== "string") {
		return "";
	}
	return value.replace(/\s+/g, " ").trim();
}

function toWinType(value: unknown): "1등" | "2등" | null {
	const rank = typeof value === "number" ? value : Number.parseInt(String(value), 10);
	if (rank === 1) {
		return "1등";
	}
	if (rank === 2) {
		return "2등";
	}
	return null;
}

function toSelectionType(value: unknown): "자동" | "수동" | undefined {
	const text = normalizeText(value);
	if (text.includes("자동")) {
		return "자동";
	}
	if (text.includes("수동")) {
		return "수동";
	}
	return undefined;
}

/**
 * 특정 회차의 당첨점 정보를 가져옵니다.
 */
export async function fetchWinningStores(
	round: number,
): Promise<WinningStore[]> {
	try {
		console.log(`🏪 회차 ${round} 당첨점 정보 조회 시작...`);

		const url = `${WINNING_STORE_API_URL}?srchWnShpRnk=all&srchLtEpsd=${Math.floor(round)}&srchShpLctn=&_=${Date.now()}`;
		const response = await fetch(url, {
			headers: {
				Accept: "application/json,text/plain,*/*",
			},
		});

		if (!response.ok) {
			console.error(`❌ 당첨점 API 요청 실패: ${response.status} ${response.statusText}`);
			return [];
		}

		const responseText = await response.text();
		const contentType = response.headers.get("content-type") || "";
		if (!contentType.toLowerCase().includes("application/json")) {
			console.warn(`⚠️ 당첨점 API 응답이 JSON 형식이 아닙니다: ${contentType}`);
			console.warn(`⚠️ 응답 내용(앞부분): ${responseText.substring(0, 300)}...`);
			return [];
		}

		const payload = JSON.parse(responseText) as WinningStoreApiResponse;
		const list = payload.data?.list ?? [];
		const allStores: WinningStore[] = [];

		for (const item of list) {
			const winType = toWinType(item.wnShpRnk);
			if (!winType) {
				continue;
			}

			const store_name = normalizeText(item.shpNm);
			const address = normalizeText(item.shpAddr);
			if (!store_name || !address) {
				continue;
			}

			allStores.push({
				round,
				store_name,
				address,
				win_type: winType,
				selection_type: winType === "1등" ? toSelectionType(item.atmtPsvYnTxt) : undefined,
			});
		}

		console.log(
			`✅ 회차 ${round} 당첨점 조회 완료: 총 ${allStores.length}개 (1등: ${allStores.filter((s) => s.win_type === "1등").length}개, 2등: ${allStores.filter((s) => s.win_type === "2등").length}개)`,
		);
		return allStores;
	} catch (error) {
		console.error(`❌ 회차 ${round} 당첨점 조회 중 오류:`, error);
		return [];
	}
}

/**
 * 당첨점 정보를 데이터베이스에 저장합니다.
 */
export async function saveWinningStores(
	stores: WinningStore[],
): Promise<boolean> {
	try {
		if (stores.length === 0) {
			console.log("💾 저장할 당첨점 정보가 없습니다.");
			return true;
		}

		console.log(`💾 당첨점 정보 ${stores.length}개 저장 중...`);

		for (const store of stores) {
			// 기존 레코드 확인 (중복 방지)
			const existingRecord = await query(
				"SELECT COUNT(*) as count FROM lotto_winning_stores WHERE round = ? AND store_name = ? AND win_type = ?",
				[store.round, store.store_name, store.win_type],
			);

			let count: number;
			if (Array.isArray(existingRecord[0])) {
				count = existingRecord[0][0] as number;
			} else {
				const countResult = existingRecord[0] as unknown as { count: number };
				count = countResult.count;
			}

			if (count > 0) {
				console.log(`⏭️ 이미 존재: ${store.store_name} (${store.win_type})`);
				continue;
			}

			// 새 레코드 삽입
			await query(
				`INSERT INTO lotto_winning_stores 
				 (round, store_name, address, win_type, selection_type)
				 VALUES (?, ?, ?, ?, ?)`,
				[
					store.round,
					store.store_name,
					store.address,
					store.win_type,
					store.selection_type || null,
				],
			);

			console.log(`✅ 저장됨: ${store.store_name} (${store.win_type})`);
		}

		console.log("✅ 당첨점 정보 저장 완료");
		return true;
	} catch (error) {
		console.error("❌ 당첨점 정보 저장 중 오류:", error);
		return false;
	}
}

/**
 * 데이터베이스에서 최신 회차 정보를 조회합니다.
 */
export async function getLatestRoundFromWinningStores(): Promise<number> {
	try {
		console.log("🔍 당첨점 DB에서 최신 회차 조회 중...");

		const result = await query(
			"SELECT MAX(round) as max_round FROM lotto_winning_stores",
			[],
		);

		if (result.length > 0) {
			const record = result[0];

			// Trailbase의 다양한 응답 형식 처리
			let roundValue: unknown;
			if (Array.isArray(record)) {
				roundValue = record[0];
			} else if (record && typeof record === "object") {
				const recordObj = record as Record<string, unknown>;
				roundValue = recordObj.max_round || recordObj[0];
			}

			if (typeof roundValue === "number" && Number.isInteger(roundValue)) {
				console.log(`📈 당첨점 DB 최신 회차: ${roundValue}`);
				return roundValue;
			}
		}

		console.log("📈 당첨점 DB에 회차 정보가 없습니다. 기본값 0 반환");
		return 0;
	} catch (error) {
		console.error("❌ 당첨점 최신 회차 조회 오류:", error);
		return 0;
	}
}

/**
 * 로또 추첨 결과 DB에서 최신 회차를 조회합니다.
 */
export async function getLatestRoundFromDrawResults(): Promise<number> {
	try {
		console.log("🔍 추첨 결과 DB에서 최신 회차 조회 중...");

		const result = await query(
			"SELECT MAX(round) as max_round FROM lotto_draw_results",
			[],
		);

		if (result.length > 0) {
			const record = result[0];

			// Trailbase의 다양한 응답 형식 처리
			let roundValue: unknown;
			if (Array.isArray(record)) {
				roundValue = record[0];
			} else if (record && typeof record === "object") {
				const recordObj = record as Record<string, unknown>;
				roundValue = recordObj.max_round || recordObj[0];
			}

			if (typeof roundValue === "number" && Number.isInteger(roundValue)) {
				console.log(`📈 추첨 결과 DB 최신 회차: ${roundValue}`);
				return roundValue;
			}
		}

		console.log("📈 추첨 결과 DB에 회차 정보가 없습니다. 기본값 0 반환");
		return 0;
	} catch (error) {
		console.error("❌ 추첨 결과 최신 회차 조회 오류:", error);
		return 0;
	}
}

/**
 * 특정 회차의 당첨점 정보를 수집하고 저장합니다.
 */
export async function collectAndSaveWinningStores(
	round: number,
): Promise<void> {
	try {
		console.log(`🎯 회차 ${round} 당첨점 수집 시작...`);

		const stores = await fetchWinningStores(round);
		if (stores.length === 0) {
			console.warn(`⚠️ 회차 ${round}의 당첨점 정보를 찾을 수 없습니다.`);
			throw new Error(`회차 ${round} 당첨점 정보 없음`);
		}

		const success = await saveWinningStores(stores);
		if (success) {
			console.log(`🎉 회차 ${round} 당첨점 수집 완료!`);
			// TODO: fetch API 호출 - 당첨점 업데이트 완료 알림
			// await notifyWinningStoresUpdate(round, stores);
		} else {
			throw new Error(`회차 ${round} 당첨점 저장 실패`);
		}
	} catch (error) {
		console.error(`❌ 회차 ${round} 당첨점 수집 중 오류:`, error);
		throw error;
	}
}

/**
 * 누락된 당첨점 정보를 확인하고 업데이트합니다.
 */
export async function updateMissingWinningStores(): Promise<void> {
	console.log("🔄 누락된 당첨점 정보 업데이트 확인 중...");

	try {
		// 1. 추첨 결과 DB와 당첨점 DB의 최신 회차 비교
		const latestDrawRound = await getLatestRoundFromDrawResults();
		const latestStoreRound = await getLatestRoundFromWinningStores();

		console.log(`📊 추첨 결과 최신 회차: ${latestDrawRound}`);
		console.log(`📊 당첨점 최신 회차: ${latestStoreRound}`);

		if (latestDrawRound <= latestStoreRound) {
			console.log("✅ 당첨점 정보가 최신 상태입니다.");
			return;
		}

		// 2. 누락된 회차들을 순차적으로 업데이트
		const missingRounds: number[] = [];
		for (let round = latestStoreRound + 1; round <= latestDrawRound; round++) {
			missingRounds.push(round);
		}

		console.log(`🎯 누락된 회차: ${missingRounds.join(", ")}`);

		for (const round of missingRounds) {
			try {
				await collectAndSaveWinningStores(round);
				
				// 요청 간격 조절 (너무 빠른 요청 방지)
				if (round < latestDrawRound) {
					console.log("⏳ 5초 대기 중...");
					await new Promise((resolve) => setTimeout(resolve, 5000));
				}
			} catch (error) {
				console.error(`❌ 회차 ${round} 당첨점 업데이트 실패:`, error);
				// 개별 회차 실패시에도 계속 진행
			}
		}

		console.log("✅ 누락된 당첨점 정보 업데이트 완료");
	} catch (error) {
		console.error("❌ 당첨점 정보 업데이트 중 오류:", error);
		throw error;
	}
}

/**
 * 당첨점 업데이트 실행 (내부 재시도 로직 포함)
 */
export async function executeWinningStoreUpdate(): Promise<void> {
	const maxRetries = 3;
	const retryDelayMs = 5 * 60 * 1000; // 5분

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const now = new Date().toISOString();
		try {
			console.info(
				`[${now}] 🏪 당첨점 업데이트 실행 (시도 ${attempt}/${maxRetries})`,
			);
			await updateMissingWinningStores();
			console.info(`[${now}] ✅ 당첨점 업데이트 성공 (시도 ${attempt})`);
			return;
		} catch (error) {
			console.error(`[${now}] ❌ 당첨점 업데이트 실패 (시도 ${attempt}):`, error);
			if (attempt < maxRetries) {
				console.info(`[${now}] ⏳ 5분 후 재시도...`);
				await new Promise((res) => setTimeout(res, retryDelayMs));
			} else {
				console.error(
					`[${now}] ❌ 당첨점 업데이트 최종 실패 (최대 재시도 횟수 초과)`,
				);
				console.error(`[${now}] 📧 관리자에게 알림이 필요합니다.`);
			}
		}
	}
}

/**
 * TODO: 당첨점 업데이트 완료 알림 함수
 * @param round 회차 번호
 * @param stores 당첨점 정보 배열
 */
// async function notifyWinningStoresUpdate(round: number, stores: WinningStore[]): Promise<void> {
//   try {
//     const response = await fetch('/api/notify/winning-stores-update', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ 
//         round, 
//         storeCount: stores.length,
//         firstPlaceCount: stores.filter(s => s.win_type === '1등').length,
//         secondPlaceCount: stores.filter(s => s.win_type === '2등').length,
//         timestamp: new Date().toISOString() 
//       })
//     });
//     if (!response.ok) console.error('당첨점 업데이트 알림 실패:', response.status);
//   } catch (error) {
//     console.error('당첨점 업데이트 알림 오류:', error);
//   }
// }
