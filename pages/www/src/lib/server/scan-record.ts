import type {
	MyScanResultStatus,
	MyScanUpsertInput,
} from "@645/shared";
import {
	deriveScanResultStatus,
	generateScanSummary,
	generateTicketHash,
} from "$lib/utils/qr-scan-history.js";
import {
	calculateExpectedLatestRound,
	getLottoNumbersFromAPI,
} from "$lib/utils/lotto-common.js";
import { parseLottoQR } from "$lib/utils/lotto-parser.js";

export interface WinningResult {
	isWinner: boolean;
	grade: string;
	matchCount: number;
	bonusMatch: boolean;
	prize: string;
	message: string;
}

export interface ScanRecordPayload extends MyScanUpsertInput {
	isWinner: boolean;
	isUnreleased: boolean;
	winningResults: WinningResult[];
}

function checkLottoWinning(
	userNumbers: number[],
	winningNumbers: number[],
	bonusNumber: number,
	firstPrizeAmount?: number,
): WinningResult {
	const matchCount = userNumbers.filter((num) =>
		winningNumbers.includes(num),
	).length;
	const bonusMatch = userNumbers.includes(bonusNumber);

	let grade = "";
	let prize = "";
	let message = "";
	let hasWin = false;

	if (matchCount === 6) {
		grade = "1등";
		prize = firstPrizeAmount ? `${firstPrizeAmount.toLocaleString()}원` : "";
		message = "🎉🎉🎉 1등 당첨!!! 대박!!! 🎉🎉🎉";
		hasWin = true;
	} else if (matchCount === 5 && bonusMatch) {
		grade = "2등";
		message = "🎉🎉 2등 당첨!! 축하합니다! 🎉🎉";
		hasWin = true;
	} else if (matchCount === 5) {
		grade = "3등";
		message = "🎉 3등 당첨! 축하합니다! 🎉";
		hasWin = true;
	} else if (matchCount === 4) {
		grade = "4등";
		message = "🎊 4등 당첨! 🎊";
		hasWin = true;
	} else if (matchCount === 3) {
		grade = "5등";
		message = "🎈 5등 당첨! 🎈";
		hasWin = true;
	}

	return {
		isWinner: hasWin,
		grade,
		matchCount,
		bonusMatch,
		prize,
		message,
	};
}

function getHighestWinningGrade(
	winningResults: WinningResult[],
): string | undefined {
	const winners = winningResults.filter((result) => result.isWinner);
	if (winners.length === 0) {
		return undefined;
	}

	const gradeOrder: Record<string, number> = {
		"1등": 1,
		"2등": 2,
		"3등": 3,
		"4등": 4,
		"5등": 5,
	};

	return winners.reduce((highest, current) => {
		if (!highest) {
			return current.grade;
		}

		return gradeOrder[current.grade] < gradeOrder[highest]
			? current.grade
			: highest;
	}, "" as string);
}

export async function buildScanRecordPayload(
	qrData: string,
	scannedAt = new Date(),
): Promise<ScanRecordPayload> {
	const games = parseLottoQR(qrData);
	if (!games || games.length === 0) {
		throw new Error("유효한 로또 QR 코드가 아닙니다.");
	}

	const scannedAtIso = scannedAt.toISOString();
	const qrRound = games[0]?.round;
	const gamesCount = games.length;

	let resultStatus: MyScanResultStatus = "unknown";
	let winningGrade: string | null = null;
	let winningResults: WinningResult[] = [];
	let isWinner = false;
	let isUnreleased = false;
	let round = qrRound ?? calculateExpectedLatestRound();
	let lastCheckedAt: string | null = scannedAtIso;

	if (qrRound) {
		try {
			const winningData = await getLottoNumbersFromAPI(qrRound);

			if (
				!winningData ||
				(winningData.drwtNo1 === 0 &&
					winningData.drwtNo2 === 0 &&
					winningData.drwtNo3 === 0)
			) {
				isUnreleased = true;
				lastCheckedAt = null;
			} else {
				const winningNumbers = [
					winningData.drwtNo1,
					winningData.drwtNo2,
					winningData.drwtNo3,
					winningData.drwtNo4,
					winningData.drwtNo5,
					winningData.drwtNo6,
				];

				winningResults = games.map((game) =>
					checkLottoWinning(
						game.numbers,
						winningNumbers,
						winningData.bnusNo,
						winningData.firstWinamnt,
					),
				);
				isWinner = winningResults.some((result) => result.isWinner);
				winningGrade = getHighestWinningGrade(winningResults) ?? null;
			}
		} catch (error) {
			console.error("QR 당첨 확인용 데이터 조회 실패:", error);
			lastCheckedAt = null;
		}
	} else {
		lastCheckedAt = null;
	}

	resultStatus = deriveScanResultStatus({
		isWinner,
		isUnreleased,
	});

	return {
		ticketHash: generateTicketHash(qrData, round, gamesCount),
		qrData,
		scannedAt: scannedAtIso,
		round,
		gamesCount,
		resultStatus,
		lastCheckedAt,
		winningGrade,
		summary: generateScanSummary({
			round,
			gamesCount,
			resultStatus,
			winningGrade: winningGrade ?? undefined,
			isWinner,
			isUnreleased,
		}),
		isWinner,
		isUnreleased,
		winningResults,
	};
}
