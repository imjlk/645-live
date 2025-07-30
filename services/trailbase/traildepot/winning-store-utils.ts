/**
 * 로또 당첨점 업데이트 유틸리티 함수들 (Deno/V8 환경용)
 */

import { query } from "./trailbase.js";

// 당첨점 정보 타입
export type WinningStore = {
	round: number;
	store_name: string;
	address: string;
	win_type: "1등" | "2등";
	selection_type?: "자동" | "수동"; // 1등만 해당
};

/**
 * HTML에서 당첨점 정보를 파싱합니다.
 */
function parseWinningStores(
	html: string,
	round: number,
	winType: "1등" | "2등",
): WinningStore[] {
	const stores: WinningStore[] = [];

	try {
		// 인코딩 문제로 한글 텍스트 대신 HTML 구조로 찾기
		// 1등은 첫 번째 group_content, 2등은 두 번째 group_content
		const groupContentRegex =
			/<div class="group_content">[\s\S]*?<table[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/gi;
		const matches: string[] = [];
		let groupMatch: RegExpExecArray | null = groupContentRegex.exec(html);

		while (groupMatch !== null) {
			matches.push(groupMatch[1]);
			groupMatch = groupContentRegex.exec(html);
		}

		let tbodyContent = "";
		if (winType === "1등" && matches.length > 0) {
			tbodyContent = matches[0]; // 첫 번째 테이블 (1등)
		} else if (winType === "2등" && matches.length > 1) {
			tbodyContent = matches[1]; // 두 번째 테이블 (2등)
		}

		if (!tbodyContent) {
			console.log(`⚠️ ${winType} 테이블을 찾을 수 없습니다.`);
			return stores;
		}

		// 테이블 행 추출 (번호가 있는 행만)
		const rowRegex = /<tr[^>]*>\s*<td[^>]*>(\d+)<\/td>([\s\S]*?)<\/tr>/gi;
		let rowMatch = rowRegex.exec(tbodyContent);

		while (rowMatch !== null) {
			const rowNumber = rowMatch[1];
			const rowContent = rowMatch[2];

			// 각 셀의 데이터를 추출
			const cells = rowContent.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
			if (!cells) {
				rowMatch = rowRegex.exec(tbodyContent);
				continue;
			}

			// HTML 태그 제거 및 텍스트 정리
			const cleanHtml = (text: string) =>
				cleanText(
					text
						.replace(/<[^>]*>/g, "")
						.replace(/&nbsp;/g, " ")
						.replace(/\s+/g, " ")
						.trim(),
				);

			let store_name = "";
			let address = "";
			let selection_type: "자동" | "수동" | undefined;

			if (winType === "1등") {
				// 1등: [번호], 상호명, 구분(자동/수동), 소재지, 위치보기
				if (cells.length >= 3) {
					store_name = cleanHtml(cells[0]); // 상호명
					const selectionText = cleanHtml(cells[1]); // 구분
					address = cleanHtml(cells[2]); // 소재지

					selection_type = selectionText.includes("자동")
						? "자동"
						: selectionText.includes("수동")
							? "수동"
							: undefined;
				}
			} else {
				// 2등: [번호], 상호명, 소재지, 위치보기
				if (cells.length >= 2) {
					store_name = cleanHtml(cells[0]); // 상호명
					address = cleanHtml(cells[1]); // 소재지
				}
			}

			// 유효한 데이터인지 확인
			if (
				store_name &&
				address &&
				store_name !== "상호명" &&
				address !== "소재지"
			) {
				stores.push({
					round,
					store_name,
					address,
					win_type: winType,
					selection_type,
				});
			}

			// 다음 매치 찾기
			rowMatch = rowRegex.exec(tbodyContent);
		}

		console.log(`✅ ${winType} 당첨점 ${stores.length}개 파싱 완료`);
		return stores;
	} catch (error) {
		console.error(`❌ HTML 파싱 중 오류 (${winType}):`, error);
		return [];
	}
}

/**
 * 총 페이지 수를 HTML에서 추출합니다.
 */
function extractTotalPages(html: string): number {
	try {
		// #page_box 셀렉터 내에서 페이지 번호 추출
		const pageBoxRegex =
			/<div class="paginate_common" id="page_box">([\s\S]*?)<\/div>/i;
		const pageBoxMatch = html.match(pageBoxRegex);

		if (pageBoxMatch) {
			const pageBoxContent = pageBoxMatch[1];

			// 페이지 링크에서 최대 페이지 번호 찾기
			const pageNumberRegex = /onclick="selfSubmit\((\d+)\)"/g;
			const numbers: number[] = [];
			let match: RegExpExecArray | null = pageNumberRegex.exec(pageBoxContent);

			while (match !== null) {
				numbers.push(Number.parseInt(match[1], 10));
				match = pageNumberRegex.exec(pageBoxContent);
			}

			// 현재 페이지도 확인 (<strong>숫자</strong> 형태)
			const currentPageRegex = /<strong>(\d+)<\/strong>/;
			const currentMatch = pageBoxContent.match(currentPageRegex);
			if (currentMatch) {
				numbers.push(Number.parseInt(currentMatch[1], 10));
			}

			if (numbers.length > 0) {
				const maxPage = Math.max(...numbers);
				console.log(
					`🔍 페이지 번호들 발견: ${numbers.join(", ")}, 최대: ${maxPage}`,
				);
				return maxPage;
			}
		}

		// 기존 방법으로 폴백
		const pageRegex = /총\s*(\d+)\s*페이지/i;
		const fallbackMatch = html.match(pageRegex);
		if (fallbackMatch) {
			return Number.parseInt(fallbackMatch[1], 10);
		}

		// 다른 패턴으로 시도
		const lastPageRegex = /nowPage=(\d+)[^>]*>(?:마지막|끝|\d+)<\/a>/gi;
		let maxPage = 1;
		let pageMatch: RegExpExecArray | null = lastPageRegex.exec(html);
		while (pageMatch !== null) {
			const pageNum = Number.parseInt(pageMatch[1], 10);
			if (pageNum > maxPage) {
				maxPage = pageNum;
			}
			pageMatch = lastPageRegex.exec(html);
		}

		return maxPage;
	} catch (error) {
		console.error("❌ 총 페이지 수 추출 중 오류:", error);
		return 1;
	}
}

/**
 * Deno/V8 환경에서 EUC-KR 페이지를 가져옵니다 (fetch 방식)
 * 참고: EUC-KR 인코딩 처리 제한으로 일부 한글이 깨질 수 있음
 */
async function fetchEucKrPageDeno(url: string): Promise<string> {
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
				"Cache-Control": "no-cache",
				"Pragma": "no-cache",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		// EUC-KR을 UTF-8로 변환 시도 (완전하지 않음)
		const arrayBuffer = await response.arrayBuffer();
		const uint8Array = new Uint8Array(arrayBuffer);
		
		// 기본 UTF-8 디코딩 시도
		const decoder = new TextDecoder('utf-8', { fatal: false });
		const text = decoder.decode(uint8Array);
		
		return text;
	} catch (error) {
		console.error(`❌ 페이지 가져오기 실패 (${url}):`, error);
		throw error;
	}
}

/**
 * 특정 회차의 당첨점 정보를 가져옵니다.
 */
export async function fetchWinningStores(
	round: number,
): Promise<WinningStore[]> {
	try {
		console.log(`🏪 회차 ${round} 당첨점 정보 조회 시작...`);

		const allStores: WinningStore[] = [];

		// 1등 당첨점 조회 (첫 페이지만)
		console.log(`🥇 ${round}회차 1등 당첨점 조회 중...`);
		const firstWinUrl = `https://dhlottery.co.kr/store.do?method=topStore&pageGubun=L645&drwNo=${round}&nowPage=1`;

		const firstWinHtml = await fetchEucKrPageDeno(firstWinUrl);

		const firstWinStores = parseWinningStores(firstWinHtml, round, "1등");
		allStores.push(...firstWinStores);

		// 2등 당첨점 조회 (모든 페이지)
		console.log(`🥈 ${round}회차 2등 당첨점 조회 중...`);

		let currentPage = 1;
		let totalPages = 1;
		let hasMorePages = true;

		while (hasMorePages && currentPage <= totalPages) {
			console.log(
				`📄 2등 당첨점 ${currentPage}/${totalPages} 페이지 조회 중...`,
			);

			// 기본 URL에서 페이지만 변경 (rank 파라미터 제거)
			const pageUrl = `https://dhlottery.co.kr/store.do?method=topStore&pageGubun=L645&drwNo=${round}&nowPage=${currentPage}`;

			const html = await fetchEucKrPageDeno(pageUrl);

			// 첫 페이지에서 총 페이지 수 확인
			if (currentPage === 1) {
				totalPages = extractTotalPages(html);
				console.log(`📊 총 ${totalPages} 페이지 확인됨`);
			}

			const secondWinStores = parseWinningStores(html, round, "2등");
			allStores.push(...secondWinStores);

			// 다음 페이지로
			currentPage++;
			hasMorePages = currentPage <= totalPages;

			// 요청 간격 조절 (너무 빠른 요청 방지)
			if (hasMorePages) {
				await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 대기
			}
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

// 텍스트 정리 함수 (간단한 정리만 수행)
function cleanText(text: string): string {
	return text
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}