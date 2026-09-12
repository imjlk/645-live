import { parseLottoQR } from "../utils/lotto-parser.js";
import type { ScanRecordPayload } from "./scan-record.js";

export type MemberSyncState = "not_applicable" | "synced" | "pending";

export type QrScanResponse =
	| {
			success: true;
			message: string;
			data: {
				uniqueNumbers: number[];
				gamesCount: number;
				qrData: string;
				scanRecord: ScanRecordPayload;
				memberSyncState: MemberSyncState;
				memberUserId: string | null;
				alreadyScanned: boolean;
			};
	  }
	| { success: false; error: string };

interface QrScanDependencies {
	trailbaseUrl: string;
	fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	buildRecord: (qrData: string) => Promise<ScanRecordPayload>;
	getUserId: () => Promise<string | null>;
	saveMember: (userId: string, record: ScanRecordPayload) => Promise<void>;
}

const MAX_BODY_BYTES = 16_384;

function respond(body: QrScanResponse, status = 200): Response {
	return Response.json(body, {
		status,
		headers: { "Cache-Control": "private, no-store" },
	});
}

function failure(status: number, error: string): Response {
	return respond({ success: false, error }, status);
}

async function readBoundedBody(request: Request): Promise<string | null> {
	if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
		return null;
	}
	const reader = request.body?.getReader();
	if (!reader) return "";
	const decoder = new TextDecoder();
	let bytes = 0;
	let text = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			if (bytes > MAX_BODY_BYTES) {
				await reader.cancel();
				return null;
			}
			text += decoder.decode(value, { stream: true });
		}
		return text + decoder.decode();
	} finally {
		reader.releaseLock();
	}
}

/** QR writes stay server-side; the prerendered scanner only submits a JSON request. */
export async function handleQrScanRequest(
	request: Request,
	dependencies: QrScanDependencies,
): Promise<Response> {
	const origin = request.headers.get("origin");
	if (
		(origin && origin !== new URL(request.url).origin) ||
		request.headers.get("sec-fetch-site") === "cross-site"
	) {
		return failure(403, "이 사이트에서 다시 QR을 확인해주세요.");
	}
	if (
		request.headers.get("content-type")?.split(";")[0].trim() !==
		"application/json"
	) {
		return failure(415, "JSON 형식으로 QR 데이터를 보내주세요.");
	}

	let qrData: unknown;
	try {
		const body = await readBoundedBody(request);
		if (body === null) return failure(413, "QR 요청 데이터가 너무 큽니다.");
		const input: unknown = JSON.parse(body);
		qrData =
			input && typeof input === "object"
				? (input as { qrData?: unknown }).qrData
				: undefined;
	} catch {
		return failure(400, "유효하지 않은 요청 형식입니다.");
	}
	if (!qrData || typeof qrData !== "string") {
		return failure(400, "QR 데이터가 제공되지 않았습니다.");
	}
	if (qrData.length > 5000) {
		return failure(400, "QR 데이터가 너무 깁니다.");
	}
	if (!/^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/.test(qrData)) {
		return failure(400, "유효하지 않은 QR 데이터 형식입니다.");
	}
	const games = parseLottoQR(qrData);
	if (
		!games?.length ||
		games.length > 20 ||
		games.some(
			(game) => game.numbers.length !== 6 || new Set(game.numbers).size !== 6,
		)
	) {
		return failure(400, "유효한 로또 QR 코드가 아닙니다.");
	}
	if (
		!/^https?:\/\/[a-zA-Z0-9\-.]+(:[0-9]+)?$/.test(dependencies.trailbaseUrl)
	) {
		return failure(500, "서버 설정 오류가 발생했습니다.");
	}

	try {
		// Session identity is authoritative; the optional header detects a stale account UI.
		const userId = await dependencies.getUserId();
		const expectedMember = request.headers.get("x-645-member-id");
		if (expectedMember !== null && expectedMember !== (userId ?? "")) {
			return failure(
				409,
				"로그인 계정이 변경됐습니다. 계정을 확인한 뒤 다시 스캔해주세요.",
			);
		}
		const scanRecord = await dependencies.buildRecord(qrData);
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15_000);
		let upstream: Response;
		let result: { success?: boolean; isDuplicate?: boolean };
		try {
			upstream = await dependencies.fetch(
				`${dependencies.trailbaseUrl}/scanned`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ games }),
					signal: controller.signal,
				},
			);
			result = await upstream.json();
		} finally {
			clearTimeout(timeout);
		}
		const alreadyScanned =
			upstream.status === 409 || result?.isDuplicate === true;
		if (
			(!upstream.ok && !alreadyScanned) ||
			(!result?.success && !alreadyScanned)
		) {
			return failure(
				502,
				"스캔을 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
			);
		}

		let memberSyncState: MemberSyncState = "not_applicable";
		if (userId) {
			try {
				await dependencies.saveMember(userId, scanRecord);
				memberSyncState = "synced";
			} catch {
				// The browser keeps the record and retries member synchronization.
				memberSyncState = "pending";
				console.error(
					"회원 스캔 저장 실패: 브라우저에서 동기화를 재시도합니다.",
				);
			}
		}
		return respond({
			success: true,
			message: alreadyScanned
				? "이미 저장된 티켓을 다시 확인했습니다."
				: "스캔이 성공적으로 처리되었습니다.",
			data: {
				uniqueNumbers: Array.from(
					new Set(games.flatMap((game) => game.numbers)),
				).sort((a, b) => a - b),
				gamesCount: games.length,
				qrData,
				scanRecord,
				memberSyncState,
				memberUserId: userId,
				alreadyScanned,
			},
		});
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return failure(504, "요청 시간이 초과되었습니다. 다시 시도해주세요.");
		}
		// Do not log the QR URL or member data.
		console.error("QR 스캔 처리 실패");
		return failure(500, "스캔 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
	}
}
