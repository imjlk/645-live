import { TRAILBASE_URL } from "$env/static/private";
import { createMyScansService } from "$lib/server/my-scans";
import { buildScanRecordPayload } from "$lib/server/scan-record";
import type { BallNumber } from "$lib/modules/lotto/types";
import { getLatestLottoRoundFromAPI } from "$lib/utils/lotto-common.js";
import { parseLottoQR } from "$lib/utils/lotto-parser.js";
import { fail } from "@sveltejs/kit";
import { initClient } from "trailbase";
import type { Actions, PageServerLoad } from "./$types";

// Trailbase 클라이언트 초기화 (서버 환경)
const client = initClient(TRAILBASE_URL || "http://localhost:4000");
const api = client.records("numbers");

function getUniqueNumbers(games: ReturnType<typeof parseLottoQR>): number[] {
	if (!games) {
		return [];
	}

	return Array.from(
		new Set(games.flatMap((game) => game.numbers)),
	).sort((a, b) => a - b);
}

export const load: PageServerLoad = async () => {
	try {
		// Get latest round information
		const latestRoundInfo = await getLatestLottoRoundFromAPI();
		const latestRound = latestRoundInfo?.drwNo || null;

		const promises = Array.from({ length: 45 }, (_, index) => {
			const ballNumber = index + 1;
			return api.read(ballNumber).catch(
				() =>
					({
						id: ballNumber,
						value: 0,
					}) as BallNumber,
			);
		});

		const numbers = await Promise.all(promises);
		return {
			numbers,
			latestRound,
		};
	} catch (error) {
		console.error("Failed to load initial lotto data:", error);
		return {
			numbers: [] as BallNumber[],
			latestRound: null,
		};
	}
};

export const actions: Actions = {
	scan: async ({ request, fetch, locals }) => {
		try {
			const formData = await request.formData();
			const qrData = formData.get("qrData");

			// 입력값 기본 검증
			if (!qrData || typeof qrData !== "string") {
				return fail(400, { error: "QR 데이터가 제공되지 않았습니다." });
			}

			// QR 데이터 길이 제한 (보안: DoS 방지)
			if (qrData.length > 5000) {
				return fail(400, { error: "QR 데이터가 너무 깁니다." });
			}

			// QR 데이터 문자 검증 (기본적인 안전 문자만 허용)
			if (!/^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/.test(qrData)) {
				return fail(400, { error: "유효하지 않은 QR 데이터 형식입니다." });
			}

			// QR 코드 파싱 로직 (유틸리티 함수 사용)
			const games = parseLottoQR(qrData);

			if (!games || games.length === 0) {
				return fail(400, { error: "유효한 로또 QR 코드가 아닙니다." });
			}

			// TrailBase 집계와 당첨 상태 계산은 서로 독립적이라 먼저 병렬로 시작합니다.
			const scanRecordPromise = buildScanRecordPayload(qrData);
			const authSessionPromise = locals.auth
				? locals.auth.api.getSession({
						headers: request.headers,
					})
				: Promise.resolve(null);

			// 트레일베이스 /scanned 라우트로 POST 요청 (타임아웃 추가)
			const trailbaseUrl = TRAILBASE_URL || "http://localhost:4000";

			// URL 검증
			if (!trailbaseUrl.match(/^https?:\/\/[a-zA-Z0-9\-.]+(:[0-9]+)?$/)) {
				console.error("Invalid TRAILBASE_URL:", trailbaseUrl);
				return fail(500, { error: "서버 설정 오류가 발생했습니다." });
			}

			// 타임아웃 설정
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초

			const response = await fetch(`${trailbaseUrl}/scanned`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ games }),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			const result = (await response.json()) as {
				success: boolean;
				message?: string;
				isDuplicate?: boolean;
				data?: {
					uniqueNumbers: number[];
					gamesCount: number;
				};
			};

			const isTrailbaseDuplicate = response.status === 409 || result.isDuplicate;

			if (!response.ok && !isTrailbaseDuplicate) {
				void scanRecordPromise.catch(() => {});
				void authSessionPromise.catch(() => {});
				return fail(500, { error: `서버 오류: ${response.status}` });
			}

			if (result.success || isTrailbaseDuplicate) {
				const [scanRecord, authSession] = await Promise.all([
					scanRecordPromise,
					authSessionPromise,
				]);
				let memberSyncState: "not_applicable" | "synced" | "pending" =
					"not_applicable";

				const userId =
					authSession?.user?.id && typeof authSession.user.id === "string"
						? authSession.user.id
						: null;

				if (userId) {
					try {
						const myScansService = createMyScansService(locals.db);
						await myScansService.upsertPending(userId, [scanRecord]);
						memberSyncState = "synced";
					} catch (memberSaveError) {
						console.error("회원 스캔 저장 실패:", memberSaveError);
						memberSyncState = "pending";
					}
				}

				return {
					success: true,
					message: isTrailbaseDuplicate
						? "이미 저장된 티켓을 다시 확인했습니다."
						: "스캔이 성공적으로 처리되었습니다.",
					data: {
						uniqueNumbers: result.data?.uniqueNumbers || getUniqueNumbers(games),
						gamesCount: result.data?.gamesCount || games.length || 0,
						qrData,
						scanRecord,
						memberSyncState,
						alreadyScanned: isTrailbaseDuplicate,
					},
				};
			}

			return fail(500, {
				error: result.message || "스캔 처리에 실패했습니다.",
			});
		} catch (error) {
			// 보안: 에러 정보 노출 최소화
			console.error("QR 스캔 처리 오류:", error);

			if (error instanceof Error && error.name === "AbortError") {
				return fail(500, { error: "요청 시간이 초과되었습니다." });
			}

			return fail(500, { error: "스캔 처리 중 오류가 발생했습니다." });
		}
	},
};
