/**
 * 로또 당첨점 조회 CLI 유틸리티 함수들
 */

import { Database } from "bun:sqlite";
import { join } from "node:path";

// 당첨점 정보 타입
export type WinningStore = {
	round: number;
	store_name: string;
	address: string;
	win_type: "1등" | "2등";
	selection_type?: "자동" | "수동"; // 1등만 해당
};

// 데이터베이스 연결
let db: Database | null = null;

function getDatabase(): Database {
	if (!db) {
		const dbPath = join(__dirname, "./data/main.db");
		db = new Database(dbPath);
	}
	return db;
}

// SQLite 직접 쿼리 함수
async function executeQuery(
	sql: string,
	params: (string | number | null)[] = [],
): Promise<unknown[]> {
	const database = getDatabase();
	const stmt = database.prepare(sql);

	if (sql.trim().toLowerCase().startsWith("select")) {
		const results = stmt.all(...params);
		return Array.isArray(results) ? results : [results];
	}

	stmt.run(...params);
	return [];
}

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

		const firstWinHtml = await fetchEucKrPage(firstWinUrl);

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

			const html = await fetchEucKrPage(pageUrl);

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
			// 새 레코드 삽입
			await executeQuery(
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
			return;
		}

		const success = await saveWinningStores(stores);
		if (success) {
			console.log(`🎉 회차 ${round} 당첨점 수집 완료!`);
		} else {
			throw new Error(`회차 ${round} 당첨점 저장 실패`);
		}
	} catch (error) {
		console.error(`❌ 회차 ${round} 당첨점 수집 중 오류:`, error);
		throw error;
	}
}

/**
 * 범위 내 모든 회차의 당첨점 정보를 수집합니다.
 */
export async function collectWinningStoresRange(
	startRound: number,
	endRound: number,
): Promise<void> {
	try {
		console.log(`🎯 회차 ${startRound}~${endRound} 당첨점 일괄 수집 시작...`);

		for (let round = startRound; round <= endRound; round++) {
			try {
				await collectAndSaveWinningStores(round);

				// 다음 회차 처리 전 대기 (서버 부하 방지)
				if (round < endRound) {
					console.log("⏳ 1초 대기 중...");
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			} catch (error) {
				console.error(`❌ 회차 ${round} 처리 실패:`, error);
				// 개별 회차 실패 시에도 다음 회차 계속 처리
			}
		}

		console.log(`🎉 회차 ${startRound}~${endRound} 당첨점 일괄 수집 완료!`);
	} catch (error) {
		console.error("❌ 당첨점 일괄 수집 중 오류:", error);
		throw error;
	}
}

// 텍스트 정리 함수 (간단한 정리만 수행)
function cleanText(text: string): string {
	return text
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

// curl을 사용해서 EUC-KR 페이지를 UTF-8로 변환해서 가져오는 함수
async function fetchEucKrPage(url: string): Promise<string> {
	const { spawn } = await import("node:child_process");

	return new Promise((resolve, reject) => {
		const curl = spawn("curl", [
			"-s",
			url,
			"-H",
			"User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			"-H",
			"Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
			"-H",
			"Accept-Language: ko-KR,ko;q=0.9,en;q=0.8",
			"-H",
			"Cache-Control: no-cache",
			"-H",
			"Pragma: no-cache",
		]);

		const iconv = spawn("iconv", ["-f", "euc-kr", "-t", "utf-8"]);

		let output = "";
		let error = "";

		curl.stdout.pipe(iconv.stdin);

		iconv.stdout.on("data", (data) => {
			output += data.toString();
		});

		iconv.stderr.on("data", (data) => {
			error += data.toString();
		});

		iconv.on("close", (code) => {
			if (code === 0) {
				resolve(output);
			} else {
				reject(new Error(`iconv failed: ${error}`));
			}
		});

		curl.on("error", reject);
		iconv.on("error", reject);
	});
}

// CLI 실행을 위한 main 함수
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log("Usage:");
		console.log(
			"  bun import-top-store.ts <draw_no>              # 특정 회차 임포트",
		);
		console.log(
			"  bun import-top-store.ts <start> <end>          # 범위 임포트",
		);
		console.log(
			"  bun import-top-store.ts latest                 # 최신 회차 임포트",
		);
		return;
	}

	try {
		if (args[0] === "test") {
			console.log("테스트 모드는 제거되었습니다.");
			return;
		}

		if (args[0] === "latest") {
			// 최신 회차 가져오기
			const results = await executeQuery(
				"SELECT MAX(round) as max_round FROM lotto_draw_results",
			);
			const latestRound = (results[0] as { max_round: number }).max_round;

			if (!latestRound) {
				console.error("최신 회차를 찾을 수 없습니다.");
				return;
			}

			console.log(`최신 회차 ${latestRound}의 당첨점을 가져옵니다...`);
			await collectAndSaveWinningStores(latestRound);
		} else if (args.length === 1) {
			// 단일 회차
			const drawNo = Number.parseInt(args[0]);
			if (Number.isNaN(drawNo)) {
				console.error("회차 번호는 숫자여야 합니다.");
				return;
			}

			console.log(`${drawNo}회차 당첨점을 가져옵니다...`);
			await collectAndSaveWinningStores(drawNo);
		} else if (args.length === 2) {
			// 범위 임포트
			const start = Number.parseInt(args[0]);
			const end = Number.parseInt(args[1]);

			if (Number.isNaN(start) || Number.isNaN(end)) {
				console.error("시작과 끝 회차는 모두 숫자여야 합니다.");
				return;
			}

			if (start > end) {
				console.error("시작 회차가 끝 회차보다 클 수 없습니다.");
				return;
			}

			console.log(`${start}회차부터 ${end}회차까지 당첨점을 가져옵니다...`);
			for (let drawNo = start; drawNo <= end; drawNo++) {
				console.log(`${drawNo}회차 처리 중...`);
				await collectAndSaveWinningStores(drawNo);

				// API 요청 간격 조절 (1초 대기)
				if (drawNo < end) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}
		} else {
			console.error("잘못된 인수입니다. --help로 사용법을 확인하세요.");
		}
	} catch (error) {
		console.error("실행 중 오류 발생:", error);
	}
}

// CLI에서 직접 실행될 때만 main 함수 호출
if (import.meta.main) {
	main();
}
