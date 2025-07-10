import { Database } from "bun:sqlite";
import { join } from "node:path";

// 로또 API 응답 타입
type LottoApiResponse = {
	totSellamnt: number; // 총 판매금액
	returnValue: string; // 성공/실패 여부
	drwNoDate: string; // 추첨일 (YYYY-MM-DD)
	firstWinamnt: number; // 1등 당첨금액
	drwtNo6: number; // 당첨번호 6
	drwtNo4: number; // 당첨번호 4
	firstPrzwnerCo: number; // 1등 당첨자 수
	drwtNo5: number; // 당첨번호 5
	bnusNo: number; // 보너스 번호
	firstAccumamnt: number; // 1등 누적 당첨금액
	drwNo: number; // 회차
	drwtNo2: number; // 당첨번호 2
	drwtNo3: number; // 당첨번호 3
	drwtNo1: number; // 당첨번호 1
};

// 정규화된 로또 결과 타입
type LottoDrawResult = {
	round: number;
	draw_date: string;
	total_sell_amount: number;
	first_prize_amount: number;
	first_prize_winner_count: number;
	first_prize_accumulated_amount: number;
	draw_number_1: number;
	draw_number_2: number;
	draw_number_3: number;
	draw_number_4: number;
	draw_number_5: number;
	draw_number_6: number;
	bonus_number: number;
};

// 데이터베이스 연결
const dbPath = join(__dirname, "./data/main.db");
const db = new Database(dbPath);

// 로또 API에서 당첨 정보 가져오기
async function getLottoNumbers(
	drwNo: number,
): Promise<LottoApiResponse | null> {
	try {
		console.log(`🔄 회차 ${drwNo} 정보를 가져오는 중...`);

		const response = await fetch(
			`https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`,
		);

		if (!response.ok) {
			console.error(
				`❌ API 요청 실패: ${response.status} ${response.statusText}`,
			);
			return null;
		}

		const data = (await response.json()) as LottoApiResponse;

		if (data.returnValue !== "success") {
			console.warn(`⚠️ 회차 ${drwNo}: ${data.returnValue}`);
			return null;
		}

		return data;
	} catch (error) {
		console.error(`❌ 회차 ${drwNo} API 호출 오류:`, error);
		return null;
	}
}

// API 응답을 DB 삽입용 형태로 변환
function transformLottoData(apiData: LottoApiResponse): LottoDrawResult {
	// 당첨번호들을 정렬
	const numbers = [
		apiData.drwtNo1,
		apiData.drwtNo2,
		apiData.drwtNo3,
		apiData.drwtNo4,
		apiData.drwtNo5,
		apiData.drwtNo6,
	].sort((a, b) => a - b);

	return {
		round: apiData.drwNo,
		draw_date: apiData.drwNoDate,
		total_sell_amount: apiData.totSellamnt,
		first_prize_amount: apiData.firstWinamnt,
		first_prize_winner_count: apiData.firstPrzwnerCo,
		first_prize_accumulated_amount: apiData.firstAccumamnt,
		draw_number_1: numbers[0],
		draw_number_2: numbers[1],
		draw_number_3: numbers[2],
		draw_number_4: numbers[3],
		draw_number_5: numbers[4],
		draw_number_6: numbers[5],
		bonus_number: apiData.bnusNo,
	};
}

// 특정 회차가 이미 DB에 존재하는지 확인
function isRoundExists(round: number): boolean {
	const query = db.prepare(
		"SELECT COUNT(*) as count FROM lotto_draw_results WHERE round = ?",
	);
	const result = query.get(round) as { count: number };
	return result.count > 0;
}

// 로또 결과를 DB에 삽입
function insertLottoResult(data: LottoDrawResult): boolean {
	try {
		// 이미 존재하는 회차인지 확인
		if (isRoundExists(data.round)) {
			console.log(`⏭️ 회차 ${data.round}는 이미 존재합니다. 건너뜁니다.`);
			return true;
		}

		const insertQuery = db.prepare(`
      INSERT INTO lotto_draw_results (
        round, draw_date, total_sell_amount, first_prize_amount, 
        first_prize_winner_count, first_prize_accumulated_amount,
        draw_number_1, draw_number_2, draw_number_3, 
        draw_number_4, draw_number_5, draw_number_6, bonus_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		insertQuery.run(
			data.round,
			data.draw_date,
			data.total_sell_amount,
			data.first_prize_amount,
			data.first_prize_winner_count,
			data.first_prize_accumulated_amount,
			data.draw_number_1,
			data.draw_number_2,
			data.draw_number_3,
			data.draw_number_4,
			data.draw_number_5,
			data.draw_number_6,
			data.bonus_number,
		);

		console.log(`✅ 회차 ${data.round} 성공적으로 삽입됨`);
		console.log(`   📅 추첨일: ${data.draw_date}`);
		console.log(
			`   🎱 당첨번호: ${data.draw_number_1}, ${data.draw_number_2}, ${data.draw_number_3}, ${data.draw_number_4}, ${data.draw_number_5}, ${data.draw_number_6} + ${data.bonus_number}`,
		);
		console.log(
			`   💰 1등 당첨금: ${data.first_prize_amount.toLocaleString()}원 (${data.first_prize_winner_count}명)`,
		);

		return true;
	} catch (error) {
		console.error(`❌ 회차 ${data.round} DB 삽입 오류:`, error);
		return false;
	}
}

// 단일 회차 가져오기 및 삽입
export async function importSingleRound(round: number): Promise<boolean> {
	console.log(`\n🚀 회차 ${round} 가져오기 시작...`);

	const apiData = await getLottoNumbers(round);
	if (!apiData) {
		return false;
	}

	const lottoData = transformLottoData(apiData);
	return insertLottoResult(lottoData);
}

// 범위 회차 가져오기 및 삽입
export async function importRangeRounds(
	startRound: number,
	endRound: number,
): Promise<void> {
	console.log(`\n🎯 회차 ${startRound}부터 ${endRound}까지 가져오기 시작...`);

	let successCount = 0;
	let failCount = 0;

	for (let round = startRound; round <= endRound; round++) {
		const success = await importSingleRound(round);

		if (success) {
			successCount++;
		} else {
			failCount++;
		}

		// API 호출 간격 조절 (1초 대기)
		if (round < endRound) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	console.log("\n📊 완료 요약:");
	console.log(`   ✅ 성공: ${successCount}회차`);
	console.log(`   ❌ 실패: ${failCount}회차`);
	console.log(`   📈 총 처리: ${endRound - startRound + 1}회차`);
}

// 최신 회차 확인 및 업데이트
export async function updateLatestRounds(maxRounds = 5): Promise<void> {
	console.log(`\n🔄 최신 ${maxRounds}회차 업데이트 확인 중...`);

	// 현재 DB에서 가장 최신 회차 찾기
	const latestQuery = db.prepare(
		"SELECT MAX(round) as latest_round FROM lotto_draw_results",
	);
	const result = latestQuery.get() as { latest_round: number | null };

	const startRound = result.latest_round ? result.latest_round + 1 : 1;
	const endRound = startRound + maxRounds - 1;

	if (result.latest_round) {
		console.log(`📈 DB 최신 회차: ${result.latest_round}`);
		console.log(`🎯 확인할 회차 범위: ${startRound} ~ ${endRound}`);
	} else {
		console.log(
			`📭 DB에 데이터가 없습니다. 회차 ${startRound}부터 확인합니다.`,
		);
	}

	await importRangeRounds(startRound, endRound);
}

// CLI 인터페이스
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log(`
🎲 로또 추첨 결과 가져오기 스크립트

사용법:
  bun run import-draw-results.ts <명령어> [옵션]

명령어:
  single <회차>                    # 특정 회차만 가져오기
  range <시작회차> <종료회차>       # 범위 회차 가져오기  
  latest [최대개수]                # 최신 회차들 확인 및 업데이트 (기본값: 5)

예시:
  bun run import-draw-results.ts single 1160
  bun run import-draw-results.ts range 1150 1160
  bun run import-draw-results.ts latest 10
    `);
		return;
	}

	const command = args[0];

	try {
		switch (command) {
			case "single": {
				if (args.length < 2) {
					console.error("❌ 회차 번호를 입력해주세요.");
					return;
				}
				const round = Number.parseInt(args[1]);
				if (Number.isNaN(round) || round < 1) {
					console.error("❌ 올바른 회차 번호를 입력해주세요.");
					return;
				}
				await importSingleRound(round);
				break;
			}

			case "range": {
				if (args.length < 3) {
					console.error("❌ 시작회차와 종료회차를 입력해주세요.");
					return;
				}
				const startRound = Number.parseInt(args[1]);
				const endRound = Number.parseInt(args[2]);
				if (
					Number.isNaN(startRound) ||
					Number.isNaN(endRound) ||
					startRound < 1 ||
					endRound < startRound
				) {
					console.error("❌ 올바른 회차 범위를 입력해주세요.");
					return;
				}
				await importRangeRounds(startRound, endRound);
				break;
			}

			case "latest": {
				const maxRounds = args.length > 1 ? Number.parseInt(args[1]) : 5;
				if (Number.isNaN(maxRounds) || maxRounds < 1) {
					console.error("❌ 올바른 최대 회차 수를 입력해주세요.");
					return;
				}
				await updateLatestRounds(maxRounds);
				break;
			}

			default:
				console.error(`❌ 알 수 없는 명령어: ${command}`);
				return;
		}
	} catch (error) {
		console.error("❌ 실행 중 오류 발생:", error);
	} finally {
		db.close();
	}
}

// 직접 실행 시에만 main 함수 호출
if (import.meta.main) {
	main();
}
