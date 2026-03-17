/**
 * 로또 관련 유틸리티 함수들
 */

import { HttpError, StatusCodes, query, transaction } from "./trailbase.js";

// 로또 API 응답 타입
export type LottoApiResponse = {
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
export type LottoDrawResult = {
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

type LottoNewApiItem = {
	ltEpsd?: number | string;
	ltRflYmd?: string;
	tm1WnNo?: number | string;
	tm2WnNo?: number | string;
	tm3WnNo?: number | string;
	tm4WnNo?: number | string;
	tm5WnNo?: number | string;
	tm6WnNo?: number | string;
	bnsWnNo?: number | string;
	rnk1WnNope?: number | string;
	rnk1WnAmt?: number | string;
	rnk1SumWnAmt?: number | string;
	rlvtEpsdSumNtslAmt?: number | string;
};

type LottoNewApiResponse = {
	data?: {
		list?: LottoNewApiItem[];
	};
};

function toSafeInt(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return 0;
}

function toIsoDate(value: unknown): string {
	const text = typeof value === "string" ? value.trim() : "";
	if (/^\d{8}$/.test(text)) {
		return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
		return text;
	}
	return "1970-01-01";
}

/**
 * 현재 날짜를 기준으로 예상되는 최신 회차를 계산합니다.
 * 로또는 매주 토요일 추첨이며, 1회가 2002년 12월 7일에 시작되었습니다.
 */
export function calculateExpectedLatestRound(): number {
	const firstDrawDate = new Date("2002-12-07"); // 1회 추첨일
	const now = new Date();

	// 첫 추첨일부터 현재까지의 주 수 계산
	const timeDiff = now.getTime() - firstDrawDate.getTime();
	const weeksDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));

	// 예상 회차 (1회 + 경과한 주 수)
	return 1 + weeksDiff;
}

/**
 * 입력값이 유효한 로또 회차인지 검증합니다.
 */
export function isValidLottoRound(round: unknown): round is number {
	if (typeof round !== "number" || !Number.isInteger(round)) {
		return false;
	}
	// 로또 회차는 1부터 시작하고, 현재 예상 회차 + 100 이상은 비현실적
	const maxReasonableRound = calculateExpectedLatestRound() + 10;
	return round >= 1 && round <= maxReasonableRound;
}

/**
 * 입력값이 유효한 로또 번호인지 검증합니다.
 */
export function isValidLottoNumber(num: unknown): num is number {
	if (typeof num !== "number" || !Number.isInteger(num)) {
		return false;
	}
	return num >= 1 && num <= 45;
}

/**
 * 입력 데이터를 안전하게 정제합니다.
 */
export function sanitizeGameData(
	games: unknown[],
): Array<{ round?: number; numbers: number[] }> {
	if (!Array.isArray(games)) {
		throw new Error("Invalid games data format");
	}

	return games.map((game: unknown) => {
		if (!game || typeof game !== "object") {
			throw new Error("Invalid game object");
		}

		const gameObj = game as Record<string, unknown>;
		const sanitizedGame: { round?: number; numbers: number[] } = {
			numbers: [],
		};

		// round 검증 (선택적)
		if (gameObj.round !== undefined) {
			if (isValidLottoRound(gameObj.round)) {
				sanitizedGame.round = gameObj.round;
			}
			// 유효하지 않은 round는 무시 (undefined로 처리)
		}

		// numbers 검증 (필수)
		if (!Array.isArray(gameObj.numbers)) {
			throw new Error("Game numbers must be an array");
		}

		// 유효한 번호만 필터링
		sanitizedGame.numbers = gameObj.numbers
			.filter(isValidLottoNumber)
			.slice(0, 6); // 최대 6개 번호만 허용

		if (sanitizedGame.numbers.length === 0) {
			throw new Error("No valid lotto numbers found in game");
		}

		return sanitizedGame;
	});
}

/**
 * 로또 API에서 특정 회차의 당첨 정보를 가져옵니다.
 */
export async function fetchLottoDrawResult(
	round: number,
): Promise<LottoDrawResult | null> {
	try {
		// 입력 검증
		if (!isValidLottoRound(round)) {
			console.error(`❌ 유효하지 않은 회차: ${round}`);
			return null;
		}

		console.log(`🔄 회차 ${round} 정보를 가져오는 중...`);

		// URL 인젝션 방지: 숫자만 허용
		const safeRound = Math.floor(Number(round));
		const url = `https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do?srchDir=center&srchLtEpsd=${safeRound}&_=${Date.now()}`;

		// 타임아웃 설정 (10초)
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000);

		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				Accept: "application/json,text/plain,*/*",
			},
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			console.error(
				`❌ API 요청 실패: ${response.status} ${response.statusText}`,
			);
			return null;
		}

		// Content-Type 검증
		const contentType = response.headers.get("content-type") || "";
		console.log(`📋 응답 Content-Type: ${contentType}`);

		const responseText = await response.text();
		if (!contentType.toLowerCase().includes("application/json")) {
			console.warn(`⚠️ 응답이 JSON 형식이 아닙니다: ${contentType}`);
			console.warn(`⚠️ 응답 내용(앞부분): ${responseText.substring(0, 300)}...`);
			return null;
		}

		const payload = JSON.parse(responseText) as LottoNewApiResponse;
		const list = payload.data?.list ?? [];
		const item = list.find(
			(candidate) => toSafeInt(candidate.ltEpsd) === safeRound,
		);

		if (!item) {
			console.warn(`⚠️ 회차 ${safeRound} 데이터가 API 응답에 없습니다.`);
			return null;
		}

		const normalized: LottoApiResponse = {
			totSellamnt: toSafeInt(item.rlvtEpsdSumNtslAmt),
			returnValue: "success",
			drwNoDate: toIsoDate(item.ltRflYmd),
			firstWinamnt: toSafeInt(item.rnk1WnAmt),
			drwtNo6: toSafeInt(item.tm6WnNo),
			drwtNo4: toSafeInt(item.tm4WnNo),
			firstPrzwnerCo: toSafeInt(item.rnk1WnNope),
			drwtNo5: toSafeInt(item.tm5WnNo),
			bnusNo: toSafeInt(item.bnsWnNo),
			firstAccumamnt: toSafeInt(item.rnk1SumWnAmt),
			drwNo: toSafeInt(item.ltEpsd),
			drwtNo2: toSafeInt(item.tm2WnNo),
			drwtNo3: toSafeInt(item.tm3WnNo),
			drwtNo1: toSafeInt(item.tm1WnNo),
		};

		return processLottoApiResponse(normalized, round, safeRound);
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			console.error(`❌ 회차 ${round} API 호출 타임아웃`);
		} else {
			console.error(`❌ 회차 ${round} API 호출 오류:`, error);
		}
		return null;
	}
}

/**
 * LottoApiResponse 파싱 및 검증 함수
 */
export function processLottoApiResponse(
	data: LottoApiResponse,
	round: number,
	safeRound: number,
): LottoDrawResult | null {
	// 기본 검증
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		console.error("❌ 응답 데이터가 유효한 객체가 아닙니다");
		return null;
	}

	if (typeof data.returnValue !== "string") {
		console.error("❌ returnValue가 문자열이 아닙니다");
		return null;
	}

	if (data.returnValue !== "success") {
		console.warn(`⚠️ 회차 ${round}: ${data.returnValue}`);
		return null;
	}

	// 필수 숫자 필드 검증
	const requiredNumberFields = [
		"drwNo",
		"drwtNo1",
		"drwtNo2",
		"drwtNo3",
		"drwtNo4",
		"drwtNo5",
		"drwtNo6",
		"bnusNo",
	];

	for (const field of requiredNumberFields) {
		const value = data[field as keyof LottoApiResponse];
		if (typeof value !== "number" || !Number.isInteger(value)) {
			console.error(`❌ 필수 숫자 필드 ${field}가 유효하지 않습니다:`, value);
			return null;
		}
	}

	// 날짜 필드 검증
	if (
		typeof data.drwNoDate !== "string" ||
		!/^\d{4}-\d{2}-\d{2}$/.test(data.drwNoDate)
	) {
		console.error("❌ 추첨일 형식이 유효하지 않습니다:", data.drwNoDate);
		return null;
	}

	// 당첨번호 유효성 검증
	const drawNumbers = [
		data.drwtNo1,
		data.drwtNo2,
		data.drwtNo3,
		data.drwtNo4,
		data.drwtNo5,
		data.drwtNo6,
	];
	if (
		!drawNumbers.every(isValidLottoNumber) ||
		!isValidLottoNumber(data.bnusNo)
	) {
		console.error("❌ 당첨번호가 유효하지 않습니다");
		return null;
	}

	// 주요 금액 필드가 0인지 체크 (초기 발표 시 0으로 나오는 경우)
	const criticalAmountFields = [
		{ field: "totSellamnt", name: "총 판매액" },
		{ field: "firstWinamnt", name: "1등 당첨금" },
		{ field: "firstAccumamnt", name: "1등 누적금액" },
	];

	let hasZeroAmounts = false;
	for (const { field, name } of criticalAmountFields) {
		const value = data[field as keyof LottoApiResponse];
		if (typeof value === "number" && value === 0) {
			console.warn(
				`⚠️ ${name}이 0입니다. 아직 최종 결과가 발표되지 않은 것 같습니다.`,
			);
			hasZeroAmounts = true;
		}
	}

	// 회차 일치 검증
	if (data.drwNo !== safeRound) {
		console.warn(
			`⚠️ 응답 회차가 요청 회차와 다릅니다: 요청=${safeRound}, 응답=${data.drwNo}`,
		);
		if (!data.drwNo) {
			console.warn(
				`⚠️ 회차 ${safeRound}의 추첨 결과가 아직 발표되지 않았을 수 있습니다.`,
			);
		}
		return null;
	}

	// 결과 변환
	const numbers = drawNumbers.sort((a, b) => a - b);
	const result = {
		round: data.drwNo,
		draw_date: data.drwNoDate,
		total_sell_amount: Math.max(0, data.totSellamnt || 0),
		first_prize_amount: Math.max(0, data.firstWinamnt || 0),
		first_prize_winner_count: Math.max(0, data.firstPrzwnerCo || 0),
		first_prize_accumulated_amount: Math.max(0, data.firstAccumamnt || 0),
		draw_number_1: numbers[0],
		draw_number_2: numbers[1],
		draw_number_3: numbers[2],
		draw_number_4: numbers[3],
		draw_number_5: numbers[4],
		draw_number_6: numbers[5],
		bonus_number: data.bnusNo,
		hasIncompleteData: hasZeroAmounts, // 0값 포함 여부 플래그 추가
	};

	return result;
}

/**
 * 데이터베이스에서 최신 회차 정보를 조회합니다.
 */
export async function getLatestLottoRoundFromDB(): Promise<number> {
	try {
		console.log("🔍 DB에서 최신 회차 조회 중...");

		const result = await query(
			"SELECT round FROM lotto_draw_results ORDER BY round DESC LIMIT 1",
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
				roundValue =
					recordObj.round ||
					recordObj["0"] ||
					recordObj[Object.keys(recordObj)[0]];
			} else {
				roundValue = record;
			}

			const roundNumber = Number(roundValue);
			if (Number.isNaN(roundNumber)) {
				console.warn("⚠️ DB round 값이 유효하지 않음. 계산된 예상 회차 사용");
				return calculateExpectedLatestRound();
			}

			console.log("✅ DB 최신 회차:", roundNumber);
			return roundNumber;
		}

		// 데이터베이스에 데이터가 없으면 계산된 예상 회차 반환
		console.warn("⚠️ DB에 로또 결과가 없습니다. 계산된 예상 회차를 사용합니다.");
		return calculateExpectedLatestRound();
	} catch (error) {
		console.error("❌ DB에서 최신 회차 조회 중 오류:", error);
		return calculateExpectedLatestRound();
	}
}

/**
 * 로또 결과를 데이터베이스에 삽입합니다.
 */
export async function insertLottoDrawResult(
	data: LottoDrawResult,
): Promise<boolean> {
	try {
		// 입력 데이터 검증
		if (!isValidLottoRound(data.round)) {
			console.error(`❌ 유효하지 않은 회차: ${data.round}`);
			return false;
		}

		// 날짜 형식 검증 (YYYY-MM-DD)
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(data.draw_date)) {
			console.error(`❌ 유효하지 않은 날짜 형식: ${data.draw_date}`);
			return false;
		}

		// 당첨번호 검증
		const drawNumbers = [
			data.draw_number_1,
			data.draw_number_2,
			data.draw_number_3,
			data.draw_number_4,
			data.draw_number_5,
			data.draw_number_6,
		];

		if (
			!drawNumbers.every(isValidLottoNumber) ||
			!isValidLottoNumber(data.bonus_number)
		) {
			console.error(
				"❌ 당첨번호가 유효하지 않습니다:",
				drawNumbers,
				data.bonus_number,
			);
			return false;
		}

		// 중복 번호 검증
		const uniqueNumbers = new Set(drawNumbers);
		if (uniqueNumbers.size !== 6) {
			console.error("❌ 당첨번호에 중복이 있습니다:", drawNumbers);
			return false;
		}

		// 보너스 번호가 당첨번호와 중복되는지 검증
		if (uniqueNumbers.has(data.bonus_number)) {
			console.error(
				"❌ 보너스 번호가 당첨번호와 중복됩니다:",
				data.bonus_number,
			);
			return false;
		}

		// 금액이 음수가 아닌지 검증
		const amounts = [
			data.total_sell_amount,
			data.first_prize_amount,
			data.first_prize_accumulated_amount,
		];
		if (amounts.some((amount) => amount < 0)) {
			console.error("❌ 금액이 유효하지 않습니다:", amounts);
			return false;
		}

		// 당첨자 수가 음수가 아닌지 검증
		if (data.first_prize_winner_count < 0) {
			console.error(
				"❌ 당첨자 수가 유효하지 않습니다:",
				data.first_prize_winner_count,
			);
			return false;
		}

		// 이미 존재하는 회차인지 확인
		const existingRecord = await query(
			"SELECT COUNT(*) as count FROM lotto_draw_results WHERE round = ?",
			[data.round],
		);

		// Trailbase 응답 형식에 맞춰 처리
		let count: number;
		if (Array.isArray(existingRecord[0])) {
			count = existingRecord[0][0] as number;
		} else {
			const countResult = existingRecord[0] as unknown as { count: number };
			count = countResult.count;
		}

		if (count > 0) {
			console.log(`🔄 회차 ${data.round}는 이미 존재합니다. 업데이트합니다.`);
			// 기존 레코드 업데이트
			await query(
				`
				UPDATE lotto_draw_results SET 
					draw_date = ?, total_sell_amount = ?, first_prize_amount = ?, 
					first_prize_winner_count = ?, first_prize_accumulated_amount = ?,
					draw_number_1 = ?, draw_number_2 = ?, draw_number_3 = ?, 
					draw_number_4 = ?, draw_number_5 = ?, draw_number_6 = ?, bonus_number = ?
				WHERE round = ?
			`,
				[
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
					data.round,
				],
			);
		} else {
			// 새 레코드 삽입
			await query(
				`
				INSERT INTO lotto_draw_results (
					round, draw_date, total_sell_amount, first_prize_amount, 
					first_prize_winner_count, first_prize_accumulated_amount,
					draw_number_1, draw_number_2, draw_number_3, 
					draw_number_4, draw_number_5, draw_number_6, bonus_number
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
				[
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
				],
			);
		}

		console.log(`✅ 회차 ${data.round} 성공적으로 처리됨`);
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

/**
 * 불완전한 데이터(0값 포함)가 있는 최신 회차를 확인합니다.
 */
async function getIncompleteLatestRound(): Promise<number | null> {
	try {
		const latestRoundInDB = await getLatestLottoRoundFromDB();
		// 오래된 회차의 0원 데이터(과거 수집 누락/소스 제약)는 무한 재시도 대상에서 제외
		const minRoundForRetry = Math.max(1, latestRoundInDB - 5);

		const result = await query(
			`SELECT round FROM lotto_draw_results 
			 WHERE round >= ?
			   AND (
			     total_sell_amount = 0
			     OR first_prize_amount = 0
			     OR first_prize_accumulated_amount = 0
			   )
			 ORDER BY round DESC LIMIT 1`,
			[minRoundForRetry],
		);

		if (result.length > 0) {
			const record = result[0];
			let roundValue: unknown;
			if (Array.isArray(record)) {
				roundValue = record[0];
			} else if (record && typeof record === "object") {
				const recordObj = record as Record<string, unknown>;
				roundValue = recordObj.round || recordObj[0];
			}

			if (typeof roundValue === "number" && Number.isInteger(roundValue)) {
				return roundValue;
			}
		}
		return null;
	} catch (error) {
		console.error("❌ 불완전한 회차 조회 오류:", error);
		return null;
	}
}

/**
 * 최신 로또 회차 결과를 확인하고 데이터베이스에 업데이트합니다.
 */
export async function updateLatestLottoRound(): Promise<void> {
	console.log("🔄 최신 로또 회차 업데이트 확인 중...");

	// 1. 먼저 불완전한 데이터가 있는 최신 회차 확인
	const incompleteRound = await getIncompleteLatestRound();
	if (incompleteRound) {
		console.log(
			`🔍 불완전한 데이터가 있는 회차 ${incompleteRound}를 먼저 업데이트합니다.`,
		);

		const drawResult = await fetchLottoDrawResult(incompleteRound);
		if (drawResult) {
			console.log(`🎉 회차 ${incompleteRound} 갱신된 결과를 찾았습니다!`);
			const success = await insertLottoDrawResult(drawResult);

			if (success) {
				if (drawResult.hasIncompleteData) {
					console.log(
						`⚠️ 회차 ${incompleteRound} 업데이트했지만 여전히 일부 금액이 0입니다. 재시도합니다.`,
					);
					// TODO: fetch API 호출 - 0값으로 업데이트된 경우 알림
					// await notifyIncompleteDataUpdate(incompleteRound, drawResult);
					throw new Error(`회차 ${incompleteRound} 여전히 불완전한 데이터`);
				}
				console.log(`✅ 회차 ${incompleteRound} 완전한 데이터로 업데이트 완료`);
				// TODO: fetch API 호출 - 완전한 데이터로 업데이트 완료 알림
				// await notifyCompleteDataUpdate(incompleteRound, drawResult);
				return; // 불완전한 회차 업데이트 완료시 종료
			}
			throw new Error(`회차 ${incompleteRound} DB 업데이트 실패`);
		}
		console.log(
			`ℹ️ 회차 ${incompleteRound}의 완전한 결과가 아직 없습니다. 재시도합니다.`,
		);
		throw new Error(`회차 ${incompleteRound} 완전한 데이터 미수신`);
	}

	// 2. 불완전한 데이터가 없으면 새로운 회차 확인
	const latestRoundInDB = await getLatestLottoRoundFromDB();
	console.log(`📈 DB 최신 회차: ${latestRoundInDB}`);

	const nextRound = latestRoundInDB + 1;
	console.log(`🎯 확인할 회차: ${nextRound}`);

	const drawResult = await fetchLottoDrawResult(nextRound);

	if (drawResult) {
		console.log(`🎉 회차 ${nextRound} 결과를 찾았습니다!`);
		const success = await insertLottoDrawResult(drawResult);

		if (success) {
			// 불완전한 데이터가 있으면 재시도를 위해 에러 발생
			if (drawResult.hasIncompleteData) {
				console.log(
					`⚠️ 회차 ${nextRound} 저장 완료했지만 일부 금액이 0입니다. 재시도합니다.`,
				);
				// TODO: fetch API 호출 - 새 회차 0값으로 첫 저장된 경우 알림
				// await notifyNewRoundIncompleteData(nextRound, drawResult);
				throw new Error(`회차 ${nextRound} 불완전한 데이터`);
			}
			console.log(`✅ 회차 ${nextRound} 업데이트 완료`);
			// TODO: fetch API 호출 - 새 회차 완전한 데이터로 저장 완료 알림
			// await notifyNewRoundCompleteData(nextRound, drawResult);
		} else {
			throw new Error(`회차 ${nextRound} DB 삽입 실패`);
		}
	} else {
		console.log(
			`ℹ️ 회차 ${nextRound}의 결과가 아직 발표되지 않았거나 찾을 수 없습니다. 1분 후 재시도합니다.`,
		);
		throw new Error(`회차 ${nextRound} 결과 미발표/미수신`);
	}
}

/**
 * TODO: 불완전한 데이터 업데이트 알림 함수
 * @param round 회차 번호
 * @param data 로또 추첨 결과 데이터
 */
// async function notifyIncompleteDataUpdate(round: number, data: LottoDrawResult): Promise<void> {
//   try {
//     const response = await fetch('/api/notify/incomplete-update', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ round, data, timestamp: new Date().toISOString() })
//     });
//     if (!response.ok) console.error('불완전 데이터 업데이트 알림 실패:', response.status);
//   } catch (error) {
//     console.error('불완전 데이터 업데이트 알림 오류:', error);
//   }
// }

/**
 * TODO: 완전한 데이터 업데이트 완료 알림 함수
 * @param round 회차 번호
 * @param data 로또 추첨 결과 데이터
 */
// async function notifyCompleteDataUpdate(round: number, data: LottoDrawResult): Promise<void> {
//   try {
//     const response = await fetch('/api/notify/complete-update', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ round, data, timestamp: new Date().toISOString() })
//     });
//     if (!response.ok) console.error('완전 데이터 업데이트 알림 실패:', response.status);
//   } catch (error) {
//     console.error('완전 데이터 업데이트 알림 오류:', error);
//   }
// }

/**
 * TODO: 새 회차 불완전 데이터 첫 저장 알림 함수
 * @param round 회차 번호
 * @param data 로또 추첨 결과 데이터
 */
// async function notifyNewRoundIncompleteData(round: number, data: LottoDrawResult): Promise<void> {
//   try {
//     const response = await fetch('/api/notify/new-round-incomplete', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ round, data, timestamp: new Date().toISOString() })
//     });
//     if (!response.ok) console.error('새 회차 불완전 데이터 알림 실패:', response.status);
//   } catch (error) {
//     console.error('새 회차 불완전 데이터 알림 오류:', error);
//   }
// }

/**
 * TODO: 새 회차 완전한 데이터 저장 완료 알림 함수
 * @param round 회차 번호
 * @param data 로또 추첨 결과 데이터
 */
// async function notifyNewRoundCompleteData(round: number, data: LottoDrawResult): Promise<void> {
//   try {
//     const response = await fetch('/api/notify/new-round-complete', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ round, data, timestamp: new Date().toISOString() })
//     });
//     if (!response.ok) console.error('새 회차 완전 데이터 알림 실패:', response.status);
//   } catch (error) {
//     console.error('새 회차 완전 데이터 알림 오류:', error);
//   }
// }

/**
 * 로또 업데이트 실행 (내부 재시도 로직 포함)
 */
export async function executeLottoUpdate(): Promise<void> {
	const maxRetries = 20;
	const retryDelayMs = 60 * 1000; // 1분
	let lastError: unknown = null;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const now = new Date().toISOString();
		try {
			console.info(
				`[${now}] 🎲 로또 업데이트 실행 (시도 ${attempt}/${maxRetries})`,
			);
			await updateLatestLottoRound();
			console.info(`[${now}] ✅ 로또 업데이트 성공 (시도 ${attempt})`);
			return;
		} catch (error) {
			lastError = error;
			console.error(`[${now}] ❌ 로또 업데이트 실패 (시도 ${attempt}):`, error);
			if (attempt < maxRetries) {
				console.info(`[${now}] ⏳ 1분 후 재시도...`);
				await new Promise((res) => setTimeout(res, retryDelayMs));
			} else {
				console.error(
					`[${now}] ❌ 로또 업데이트 최종 실패 (최대 재시도 횟수 초과)`,
				);
				console.error(`[${now}] 📧 관리자에게 알림이 필요합니다.`);
			}
		}
	}

	throw lastError instanceof Error
		? lastError
		: new Error("로또 업데이트가 최대 재시도 횟수를 초과했습니다.");
}

/**
 * 스캔된 로또 게임 데이터를 처리합니다.
 */
export async function processScannedLottoData(req: { body: unknown }) {
	try {
		// req.body가 문자열인 경우 JSON 파싱
		let parsedBody: unknown;
		if (typeof req.body === "string") {
			try {
				parsedBody = JSON.parse(req.body);
			} catch (parseError) {
				console.error("JSON parse error");
				throw new HttpError(StatusCodes.BAD_REQUEST, "Invalid JSON format");
			}
		} else {
			parsedBody = req.body;
		}

		// 기본 구조 검증
		if (!parsedBody || typeof parsedBody !== "object") {
			throw new HttpError(StatusCodes.BAD_REQUEST, "Invalid request body");
		}

		const body = parsedBody as Record<string, unknown>;
		const rawGames = body?.games;

		if (!Array.isArray(rawGames)) {
			throw new HttpError(StatusCodes.BAD_REQUEST, "Invalid games data format");
		}

		if (rawGames.length === 0) {
			throw new HttpError(StatusCodes.BAD_REQUEST, "No games provided");
		}

		if (rawGames.length > 20) {
			// 최대 20게임 제한
			throw new HttpError(StatusCodes.BAD_REQUEST, "Too many games (max 20)");
		}

		// 입력 데이터 정제 및 검증
		let games: Array<{ round?: number; numbers: number[] }>;
		try {
			games = sanitizeGameData(rawGames);
		} catch (sanitizeError) {
			const errorMsg =
				sanitizeError instanceof Error
					? sanitizeError.message
					: "Invalid game data";
			throw new HttpError(StatusCodes.BAD_REQUEST, errorMsg);
		}

		// 현재 회차 정보 가져오기 (게임 데이터에서 추출 또는 DB에서 최신 회차)
		let currentRound: number;

		// 게임 데이터에서 회차 정보 추출
		const gameWithRound = games.find((game) => game.round !== undefined);
		if (gameWithRound?.round) {
			currentRound = gameWithRound.round;
		} else {
			// 게임 데이터에 회차가 없으면 DB에서 최신 회차 조회
			const latestRoundFromDB = await getLatestLottoRoundFromDB();
			currentRound = latestRoundFromDB;
		}

		// 최종 회차 검증
		if (!isValidLottoRound(currentRound)) {
			throw new HttpError(StatusCodes.BAD_REQUEST, "Invalid round number");
		}

		// 모든 게임의 번호들을 수집 (이미 정제된 데이터)
		const allNumbers: number[] = [];
		for (const game of games) {
			allNumbers.push(...game.numbers);
		}

		// 트랜잭션 시작
		await transaction(async () => {
			// 현재 회차의 스캔 카운트 레코드 조회
			const existingRecord = await query(
				`
				SELECT * FROM lotto_draw_scan_counts 
				WHERE round = ?
			`,
				[currentRound],
			);

			// 각 번호별 증가량 계산
			const scanCounts: Record<string, number> = {};
			for (let i = 1; i <= 45; i++) {
				scanCounts[`scan_count_${i}`] = allNumbers.filter(
					(n) => n === i,
				).length;
			}

			if (existingRecord.length > 0) {
				// 기존 레코드 업데이트
				const updateFields: string[] = [];
				const updateValues: (number | string)[] = [];

				for (let i = 1; i <= 45; i++) {
					const fieldName = `scan_count_${i}`;
					const increment = scanCounts[fieldName];
					if (increment > 0) {
						updateFields.push(`${fieldName} = ${fieldName} + ?`);
						updateValues.push(increment);
					}
				}

				// 총 스캔 횟수 업데이트 (QR 코드 스캔 1회)
				updateFields.push("total_scans = total_scans + ?");
				updateValues.push(1);

				updateFields.push("updated_at = CURRENT_TIMESTAMP");
				updateValues.push(currentRound);

				if (updateFields.length > 1) {
					// updated_at 외에 다른 필드가 있으면
					const updateQuery = `
						UPDATE lotto_draw_scan_counts 
						SET ${updateFields.join(", ")} 
						WHERE round = ?
					`;

					await query(updateQuery, updateValues);
				}
			} else {
				// 새 레코드 생성
				const fields: string[] = ["round"];
				const values: (number | string)[] = [currentRound];
				const placeholders: string[] = ["?"];

				for (let i = 1; i <= 45; i++) {
					const fieldName = `scan_count_${i}`;
					fields.push(fieldName);
					values.push(scanCounts[fieldName]);
					placeholders.push("?");
				}

				fields.push("total_scans");
				values.push(1); // QR 코드 스캔 1회
				placeholders.push("?");

				fields.push("updated_at");
				values.push(new Date().toISOString());
				placeholders.push("?");

				const insertQuery = `
					INSERT INTO lotto_draw_scan_counts (${fields.join(", ")}) 
					VALUES (${placeholders.join(", ")})
				`;

				await query(insertQuery, values);
			}
		});

		const uniqueNumbers = [...new Set(allNumbers)].sort((a, b) => a - b);

		return {
			success: true,
			message: "스캔 데이터가 성공적으로 업데이트되었습니다",
			data: {
				round: currentRound,
				gamesCount: games.length,
				scanCount: 1, // QR 코드 스캔 횟수
				uniqueNumbers: uniqueNumbers,
				totalNumbers: allNumbers.length,
			},
		};
	} catch (error: unknown) {
		// 보안: 내부 에러 정보 노출 방지
		if (error instanceof HttpError) {
			throw error; // HttpError는 그대로 전달 (클라이언트용 메시지)
		}

		// 예상치 못한 에러는 로그에만 기록하고 일반적인 메시지 반환
		console.error("Unexpected error in scan data processing:", error);
		throw new HttpError(
			StatusCodes.INTERNAL_SERVER_ERROR,
			"스캔 데이터 처리 중 오류가 발생했습니다",
		);
	}
}
