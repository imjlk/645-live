import { env } from "$env/dynamic/private";
import type { BallNumber } from "$lib/modules/lotto/types";
import { parseLottoQR } from "$lib/utils/lotto-parser.js";
import { fail } from "@sveltejs/kit";
import { Client } from "trailbase";
import type { Actions, PageServerLoad } from "./$types";

// Trailbase 클라이언트 초기화 (서버 환경)
const client = Client.init(env.TRAILBASE_URL || "http://localhost:4000");
const api = client.records("numbers");

export const load: PageServerLoad = async () => {
	try {
		const promises = Array.from({ length: 45 }, (_, index) => {
			const ballNumber = index + 1;
			return api.read<BallNumber>(ballNumber).catch(
				() =>
					({
						id: ballNumber,
						value: 0,
					}) as BallNumber,
			);
		});

		const numbers = await Promise.all(promises);
		return { numbers };
	} catch (error) {
		console.error("Failed to load initial lotto data:", error);
		return { numbers: [] as BallNumber[] };
	}
};

export const actions: Actions = {
	scan: async ({ request, fetch }) => {
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

			// 트레일베이스 /scanned 라우트로 POST 요청 (타임아웃 추가)
			const trailbaseUrl = env.TRAILBASE_URL || "http://localhost:4000";

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

			if (!response.ok) {
				return fail(500, { error: `서버 오류: ${response.status}` });
			}

			const result = (await response.json()) as {
				success: boolean;
				message?: string;
				data?: {
					uniqueNumbers: number[];
					gamesCount: number;
				};
			};

			if (result.success) {
				return {
					success: true,
					message: "스캔이 성공적으로 처리되었습니다.",
					data: {
						uniqueNumbers: result.data?.uniqueNumbers || [],
						gamesCount: result.data?.gamesCount || 0,
						qrData,
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
