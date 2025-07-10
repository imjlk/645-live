export interface LottoGameData {
	round: number;
	numbers: number[];
}

export interface LottoParseResult {
	drawNumber: number;
	lotteryGames: number[][];
}

/**
 * dhlottery.co.kr URL에서 로또 게임 데이터를 파싱합니다.
 * 예: http://m.dhlottery.co.kr/?v=1064q152434353839q061327303743...
 */
export function parseDhlotteryURL(url: string): LottoParseResult | null {
	try {
		// URL 길이 및 형식 검증
		if (url.length > 2000) {
			console.error("URL이 너무 깁니다");
			return null;
		}

		// 기본 URL 형식 검증
		if (!url.includes("dhlottery.co.kr") || !url.includes("?v=")) {
			return null;
		}

		const urlParams = new URLSearchParams(url.split("?")[1]);
		const queryValue = urlParams.get("v") || "";

		// 쿼리 값 검증
		if (!queryValue || queryValue.length < 4 || queryValue.length > 1000) {
			return null;
		}

		// 안전한 문자만 허용 (숫자, q만)
		if (!/^[0-9q]+$/.test(queryValue)) {
			return null;
		}

		const drawNumber = Number.parseInt(queryValue.slice(0, 4), 10);

		// 회차 번호 유효성 검증
		if (Number.isNaN(drawNumber) || drawNumber < 1 || drawNumber > 9999) {
			return null;
		}

		const gameStrings = queryValue.split("q");
		gameStrings.shift(); // Remove the first element which contains the draw number

		// 게임 개수 제한 (DoS 방지)
		if (gameStrings.length > 20) {
			console.error("게임 개수가 너무 많습니다");
			return null;
		}

		// Handle the last game string which may contain extra characters
		const lastGameString = gameStrings.pop() || "";
		if (lastGameString) {
			// 길이 검증
			if (lastGameString.length > 50) {
				console.error("게임 문자열이 너무 깁니다");
				return null;
			}
			gameStrings.push(lastGameString.slice(0, 12)); // Take only the first 12 characters
		}

		// Split each game string into pairs of digits
		const lotteryGames = gameStrings.map(
			(gameString) => gameString.match(/.{1,2}/g) || [],
		);

		// Convert string arrays to number arrays
		const numberGames = lotteryGames.map((game) =>
			game.map((num) => Number.parseInt(num, 10)),
		);

		return { drawNumber, lotteryGames: numberGames };
	} catch (error) {
		console.error("dhlottery URL 파싱 오류:", error);
		return null;
	}
}

/**
 * nlotto.co.kr URL에서 로또 게임 데이터를 파싱합니다.
 * 예: http://qr.nlotto.co.kr/?v=0747m011821252728m020710112628m030609172528...
 */
export function parseNlotteryURL(url: string): LottoParseResult | null {
	try {
		// URL 길이 및 형식 검증
		if (url.length > 2000) {
			console.error("URL이 너무 깁니다");
			return null;
		}

		// 기본 URL 형식 검증
		if (!url.includes("nlotto.co.kr") || !url.includes("?v=")) {
			return null;
		}

		const urlParams = new URLSearchParams(url.split("?")[1]);
		const queryValue = urlParams.get("v") || "";

		// 쿼리 값 검증
		if (!queryValue || queryValue.length < 4 || queryValue.length > 1000) {
			return null;
		}

		// 안전한 문자만 허용 (숫자, m만)
		if (!/^[0-9m]+$/.test(queryValue)) {
			return null;
		}

		const drawNumber = Number.parseInt(queryValue.slice(0, 4), 10);

		// 회차 번호 유효성 검증
		if (Number.isNaN(drawNumber) || drawNumber < 1 || drawNumber > 9999) {
			return null;
		}

		const gameStrings = queryValue.split("m");
		gameStrings.shift(); // Remove the first element which contains the draw number

		// 게임 개수 제한 (DoS 방지)
		if (gameStrings.length > 20) {
			console.error("게임 개수가 너무 많습니다");
			return null;
		}

		// Handle the last game string which may contain extra characters
		const lastGameString = gameStrings.pop() || "";
		if (lastGameString) {
			// 길이 검증
			if (lastGameString.length > 50) {
				console.error("게임 문자열이 너무 깁니다");
				return null;
			}
			gameStrings.push(lastGameString.slice(0, 12)); // Take only the first 12 characters
		}

		// Split each game string into pairs of digits
		const lotteryGames = gameStrings.map(
			(gameString) => gameString.match(/.{1,2}/g) || [],
		);

		// Convert string arrays to number arrays
		const numberGames = lotteryGames.map((game) =>
			game.map((num) => Number.parseInt(num, 10)),
		);

		return { drawNumber, lotteryGames: numberGames };
	} catch (error) {
		console.error("nlottery URL 파싱 오류:", error);
		return null;
	}
}

/**
 * 파싱된 로또 데이터를 LottoGameData 배열로 변환합니다.
 */
export function convertToLottoGames(
	parseResult: LottoParseResult,
): LottoGameData[] {
	const games: LottoGameData[] = [];

	for (const game of parseResult.lotteryGames) {
		const numbers = game.filter((n) => n >= 1 && n <= 45);

		if (numbers.length === 6) {
			games.push({
				round: parseResult.drawNumber || 1,
				numbers: numbers.sort((a, b) => a - b),
			});
		}
	}

	return games;
}

/**
 * QR 코드 데이터를 파싱하여 로또 게임 데이터를 반환합니다.
 * 다양한 QR 코드 형식을 지원합니다.
 */
export function parseLottoQR(qrData: string): LottoGameData[] | null {
	try {
		// 입력값 길이 제한
		if (qrData.length > 5000) {
			console.error("QR 데이터가 너무 깁니다");
			return null;
		}

		console.log(
			"Parsing QR data:",
			qrData.slice(0, 100) + (qrData.length > 100 ? "..." : ""),
		);

		// dhlottery.co.kr URL 형식 파싱
		if (qrData.includes("dhlottery.co.kr")) {
			const parseResult = parseDhlotteryURL(qrData);
			if (parseResult) {
				return convertToLottoGames(parseResult);
			}
		}

		// nlotto.co.kr URL 형식 파싱
		if (qrData.includes("nlotto.co.kr")) {
			const parseResult = parseNlotteryURL(qrData);
			if (parseResult) {
				return convertToLottoGames(parseResult);
			}
		}

		// 기존 URL 파라미터 방식 파싱 시도 (예: v=1.0,g=1,n=01,02,03,04,05,06;...)
		if (qrData.includes("=") && qrData.includes(",")) {
			return parseParameterFormat(qrData);
		}

		// 단순 숫자 문자열 파싱 시도 (예: q021825303444q050812313445...)
		if (qrData.match(/^[0-9q]+$/) && qrData.length <= 1000) {
			return parseSimpleNumberString(qrData);
		}

		return null;
	} catch (error) {
		console.error("QR 코드 파싱 오류:", error);
		return null;
	}
}

/**
 * URL 파라미터 형식의 QR 코드를 파싱합니다.
 * 예: v=1.0,g=1,n=01,02,03,04,05,06;...
 */
function parseParameterFormat(qrData: string): LottoGameData[] | null {
	try {
		const games: LottoGameData[] = [];
		const round = 1; // 기본값

		// 게임 개수 찾기
		const gameCountMatch = qrData.match(/g=(\d+)/);
		const gameCount = gameCountMatch
			? Number.parseInt(gameCountMatch[1], 10)
			: 1;

		// 번호 부분 찾기
		const numbersMatch = qrData.match(/n=([0-9,;]+)/);
		if (numbersMatch) {
			const numbersStr = numbersMatch[1];
			const gameNumbers = numbersStr.split(";");

			for (let i = 0; i < Math.min(gameCount, gameNumbers.length); i++) {
				const numbers = gameNumbers[i]
					.split(",")
					.map((n) => Number.parseInt(n.trim(), 10))
					.filter((n) => n >= 1 && n <= 45);
				if (numbers.length === 6) {
					games.push({ round, numbers: numbers.sort((a, b) => a - b) });
				}
			}
		}

		return games.length > 0 ? games : null;
	} catch (error) {
		console.error("파라미터 형식 파싱 오류:", error);
		return null;
	}
}

/**
 * 단순 숫자 문자열을 파싱합니다.
 * 예: q021825303444q050812313445...
 */
function parseSimpleNumberString(qrData: string): LottoGameData[] | null {
	try {
		// q로 구분된 게임들 파싱
		const gameStrings = qrData.split("q").filter((s) => s.length > 0);

		// 게임 개수 제한
		if (gameStrings.length > 20) {
			console.error("게임 개수가 너무 많습니다");
			return null;
		}

		const games: LottoGameData[] = [];

		for (const gameString of gameStrings) {
			// 12자리 숫자를 2자리씩 나누어 6개 번호 추출
			if (gameString.length >= 12) {
				const numbers = [];
				for (let i = 0; i < 12; i += 2) {
					const num = Number.parseInt(gameString.slice(i, i + 2), 10);
					if (num >= 1 && num <= 45) {
						numbers.push(num);
					}
				}

				if (numbers.length === 6) {
					games.push({
						round: 1, // 기본값
						numbers: numbers.sort((a, b) => a - b),
					});
				}
			}
		}

		return games.length > 0 ? games : null;
	} catch (error) {
		console.error("단순 숫자 문자열 파싱 오류:", error);
		return null;
	}
}
