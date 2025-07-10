import {
	HttpError,
	StatusCodes,
	addCronCallback,
	addPeriodicCallback,
	addRoute,
	jsonHandler,
	query,
	stringHandler,
	transaction,
} from "../trailbase.js";

console.log("=== Trailbase script initialized ===");
console.log("Adding routes...");

/**
 * 현재 날짜를 기준으로 예상되는 최신 회차를 계산합니다.
 * 로또는 매주 토요일 추첨이며, 1회가 2002년 12월 7일에 시작되었습니다.
 */
function calculateExpectedLatestRound(): number {
	const firstDrawDate = new Date("2002-12-07"); // 1회 추첨일
	const now = new Date();

	// 첫 추첨일부터 현재까지의 주 수 계산
	const timeDiff = now.getTime() - firstDrawDate.getTime();
	const weeksDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));

	// 예상 회차 (1회 + 경과한 주 수)
	return 1 + weeksDiff;
}

/**
 * 데이터베이스에서 최신 회차 정보를 조회합니다.
 * lotto_draw_results 테이블에서 가장 최신 회차를 가져옵니다.
 */
async function getLatestLottoRoundFromDB(): Promise<number> {
	try {
		const result = await query(
			`
			SELECT round FROM lotto_draw_results 
			ORDER BY round DESC 
			LIMIT 1
		`,
			[],
		);

		if (result.length > 0) {
			const record = result[0] as unknown as { round: number };
			return record.round;
		}

		// 데이터베이스에 데이터가 없으면 계산된 예상 회차 반환
		console.warn(
			"No lotto draw results found in database, using calculated round",
		);
		return calculateExpectedLatestRound();
	} catch (error) {
		console.error("Error fetching latest lotto round from database:", error);

		// 에러가 발생하면 계산된 예상 회차 반환
		return calculateExpectedLatestRound();
	}
}

addRoute(
	"GET",
	"/scanned",
	stringHandler(async (req) => {
		console.log("Lotto scan GET request received:", req.headers);
		return "Lotto scan GET request received successfully";
	}),
);

console.log("GET /scanned route registered");

addRoute(
	"POST",
	"/scanned",
	jsonHandler(async (req) => {
		try {
			console.log(
				"Lotto scan request received:",
				JSON.stringify(req.body, null, 2),
			);

			// req.body가 문자열인 경우 JSON 파싱
			let parsedBody: unknown;
			if (typeof req.body === "string") {
				try {
					parsedBody = JSON.parse(req.body);
				} catch (parseError) {
					console.error("JSON parse error:", parseError);
					throw new HttpError(StatusCodes.BAD_REQUEST, "Invalid JSON format");
				}
			} else {
				parsedBody = req.body;
			}

			const body = parsedBody as {
				games?: Array<{ round?: number; numbers: number[] }>;
			};
			console.log("Body type:", typeof body);
			console.log("Body keys:", Object.keys(body || {}));

			const games = body?.games;
			console.log("Parsed games:", games);

			if (!games || !Array.isArray(games)) {
				console.error("Invalid games data:", {
					games,
					isArray: Array.isArray(games),
					bodyKeys: Object.keys(body || {}),
					fullBody: body,
				});
				throw new HttpError(StatusCodes.BAD_REQUEST, "Invalid games data");
			}

			// 현재 회차 정보 가져오기 (게임 데이터에서 추출 또는 DB에서 최신 회차)
			let currentRound: number;

			// 게임 데이터에서 회차 정보 추출
			if (games.length > 0 && games[0].round) {
				currentRound = games[0].round;
				console.log("Round from game data:", currentRound);
			} else {
				// 게임 데이터에 회차가 없으면 DB에서 최신 회차 조회
				const latestRoundFromDB = await getLatestLottoRoundFromDB();
				currentRound = latestRoundFromDB;
				console.log("Round from database or fallback:", currentRound);
			}

			// 모든 게임의 번호들을 수집
			const allNumbers: number[] = [];
			for (const game of games) {
				if (game.numbers && Array.isArray(game.numbers)) {
					allNumbers.push(
						...game.numbers.filter((n: number) => n >= 1 && n <= 45),
					);
				}
			}

			console.log("All numbers collected:", allNumbers);
			console.log("Current round:", currentRound);

			// 트랜잭션 시작
			await transaction(async () => {
				console.log("Starting transaction...");

				// 현재 회차의 스캔 카운트 레코드 조회
				const existingRecord = await query(
					`
					SELECT * FROM lotto_draw_scan_counts 
					WHERE round = ?
				`,
					[currentRound],
				);

				console.log("Existing record:", existingRecord);

				// 각 번호별 증가량 계산
				const scanCounts: Record<string, number> = {};
				for (let i = 1; i <= 45; i++) {
					scanCounts[`scan_count_${i}`] = allNumbers.filter(
						(n) => n === i,
					).length;
				}

				console.log("Scan counts calculated:", scanCounts);

				if (existingRecord.length > 0) {
					console.log("Updating existing record...");
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

					console.log("Update fields:", updateFields);
					console.log("Update values:", updateValues);

					if (updateFields.length > 1) {
						// updated_at 외에 다른 필드가 있으면
						const updateQuery = `
							UPDATE lotto_draw_scan_counts 
							SET ${updateFields.join(", ")} 
							WHERE round = ?
						`;

						console.log("Update query:", updateQuery);
						const updateResult = await query(updateQuery, updateValues);
						console.log("Update result:", updateResult);
					}
				} else {
					console.log("Creating new record...");
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
			console.error("스캔 데이터 처리 오류:", error);
			const errorMessage =
				error instanceof Error
					? error.message
					: "스캔 데이터 처리 중 오류가 발생했습니다";
			throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, errorMessage);
		}
	}),
);

console.log("POST /scanned route registered");

addRoute(
	"GET",
	"/test/{table}",
	jsonHandler(async (req) => {
		const table = req.params.table;

		console.log("Scanned GET request received:", JSON.stringify(req.headers));
		return {
			message: "GET request received successfully",
			table,
		};
	}),
);

console.log("GET /test/{table} route registered");

addCronCallback("JS-registered Job", "@hourly", async () => {
	const now = new Date().toISOString();
	console.info(`[${now}] JS-registered cron job reporting for duty 🚀`);
});

console.log("=== All routes and callbacks registered successfully ===");
