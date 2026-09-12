import { describe, expect, it, mock } from "bun:test";
import {
	handleQrScanRequest,
	type QrScanResponse,
} from "../../lib/server/qr-scan-service";
import type { ScanRecordPayload } from "../../lib/server/scan-record";

const qrData = "http://m.dhlottery.co.kr/?v=1240q010203040506";
const record: ScanRecordPayload = {
	ticketHash: "test-ticket",
	qrData,
	scannedAt: "2026-09-12T10:00:00.000Z",
	round: 1240,
	gamesCount: 1,
	resultStatus: "unknown",
	lastCheckedAt: null,
	winningGrade: null,
	claimStartAt: null,
	claimDeadlineAt: null,
	summary: "1240회차 1게임 (결과 확인 필요)",
	isWinner: false,
	isUnreleased: false,
	isExpired: false,
	winningResults: [],
};

function dependencies() {
	return {
		trailbaseUrl: "https://trail.example.test",
		fetch: mock(async () => Response.json({ success: true })),
		buildRecord: mock(async () => record),
		getUserId: mock(async (): Promise<string | null> => null),
		saveMember: mock(async () => {}),
	};
}

function request(
	body: unknown = { qrData },
	headers: Record<string, string> = {},
) {
	return new Request("https://645.example.test/api/qr-scan", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Origin: "https://645.example.test",
			...headers,
		},
		body: JSON.stringify(body),
	});
}

async function readResponse(response: Response) {
	return (await response.json()) as {
		success: boolean;
		data?: Extract<QrScanResponse, { success: true }>["data"];
		error?: string;
	};
}

describe("QR JSON API", () => {
	it("rejects a stale or anonymous expected owner before record lookup or writes", async () => {
		for (const expected of ["old-user", ""]) {
			const deps = dependencies();
			deps.getUserId.mockImplementation(async () => "current-user");
			const response = await handleQrScanRequest(
				request({ qrData }, { "x-645-member-id": expected }),
				deps,
			);
			expect(response.status).toBe(409);
			expect(deps.buildRecord).not.toHaveBeenCalled();
			expect(deps.fetch).not.toHaveBeenCalled();
			expect(deps.saveMember).not.toHaveBeenCalled();
		}
	});
	for (const [label, input] of [
		["missing QR", {}],
		["non-string QR", { qrData: [] }],
		["oversized QR", { qrData: "a".repeat(5001) }],
		["invalid characters", { qrData: "<script>alert(1)</script>" }],
		["non-ticket text", { qrData: "https://example.test/" }],
		["duplicate numbers", { qrData: "q010101010101" }],
	] as const) {
		it(`rejects ${label} without reads or writes`, async () => {
			const deps = dependencies();
			const response = await handleQrScanRequest(request(input), deps);
			expect(response.status).toBe(400);
			expect(response.headers.get("Cache-Control")).toBe("private, no-store");
			expect(deps.fetch).not.toHaveBeenCalled();
			expect(deps.buildRecord).not.toHaveBeenCalled();
			expect(deps.getUserId).not.toHaveBeenCalled();
			expect(deps.saveMember).not.toHaveBeenCalled();
		});
	}

	it("rejects cross-site and non-JSON writes", async () => {
		const deps = dependencies();
		expect(
			(
				await handleQrScanRequest(
					request({ qrData }, { Origin: "https://attacker.test" }),
					deps,
				)
			).status,
		).toBe(403);
		expect(
			(
				await handleQrScanRequest(
					request({ qrData }, { "Content-Type": "text/plain" }),
					deps,
				)
			).status,
		).toBe(415);
		expect(deps.fetch).not.toHaveBeenCalled();
	});

	it("bounds actual streamed JSON bytes and rejects malformed JSON", async () => {
		const deps = dependencies();
		const oversized = new Request("https://645.example.test/api/qr-scan", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: `{"qrData":"${"a".repeat(17_000)}"}`,
		});
		expect((await handleQrScanRequest(oversized, deps)).status).toBe(413);
		const malformed = new Request("https://645.example.test/api/qr-scan", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{",
		});
		expect((await handleQrScanRequest(malformed, deps)).status).toBe(400);
		expect(deps.fetch).not.toHaveBeenCalled();
	});

	it("aggregates validated games and returns the authoritative result for local storage", async () => {
		const deps = dependencies();
		const response = await handleQrScanRequest(request(), deps);
		expect(response.status).toBe(200);
		const body = await readResponse(response);
		expect(body.data).toMatchObject({
			scanRecord: record,
			memberSyncState: "not_applicable",
			memberUserId: null,
			alreadyScanned: false,
			uniqueNumbers: [1, 2, 3, 4, 5, 6],
		});
		expect(deps.fetch).toHaveBeenCalledTimes(1);
		const [url, init] = deps.fetch.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];
		expect(url).toBe("https://trail.example.test/scanned");
		expect(JSON.parse(init.body as string)).toEqual({
			games: [{ round: 1240, numbers: [1, 2, 3, 4, 5, 6] }],
		});
		expect(deps.saveMember).not.toHaveBeenCalled();
	});

	it("treats the upstream duplicate response as a successful check", async () => {
		const deps = dependencies();
		deps.fetch.mockImplementation(async () =>
			Response.json({ success: false, isDuplicate: true }, { status: 409 }),
		);
		const response = await handleQrScanRequest(request(), deps);
		expect(response.status).toBe(200);
		expect((await readResponse(response)).data).toMatchObject({
			alreadyScanned: true,
			scanRecord: record,
		});
	});

	it("saves only to the authenticated member, ignoring a forged body member ID", async () => {
		const deps = dependencies();
		deps.getUserId.mockResolvedValue("authenticated-member");
		const response = await handleQrScanRequest(
			request({ qrData, userId: "someone-else" }),
			deps,
		);
		expect((await readResponse(response)).data).toMatchObject({
			memberSyncState: "synced",
			memberUserId: "authenticated-member",
		});
		expect(deps.saveMember).toHaveBeenCalledWith(
			"authenticated-member",
			record,
		);
	});

	it("keeps a successful scan pending when member persistence fails", async () => {
		const deps = dependencies();
		deps.getUserId.mockResolvedValue("authenticated-member");
		deps.saveMember.mockRejectedValue(new Error("database unavailable"));
		const response = await handleQrScanRequest(request(), deps);
		expect(response.status).toBe(200);
		expect((await readResponse(response)).data).toMatchObject({
			memberSyncState: "pending",
			scanRecord: record,
		});
	});

	it("does not write anything if authentication fails", async () => {
		const deps = dependencies();
		deps.getUserId.mockRejectedValue(new Error("session unavailable"));
		expect((await handleQrScanRequest(request(), deps)).status).toBe(500);
		expect(deps.fetch).not.toHaveBeenCalled();
		expect(deps.saveMember).not.toHaveBeenCalled();
	});

	it("does not save member history for a failed aggregate write", async () => {
		const deps = dependencies();
		deps.getUserId.mockResolvedValue("authenticated-member");
		deps.fetch.mockImplementation(async () =>
			Response.json({ success: false }, { status: 503 }),
		);
		const response = await handleQrScanRequest(request(), deps);
		expect(response.status).toBe(502);
		expect((await readResponse(response)).success).toBe(false);
		expect(deps.saveMember).not.toHaveBeenCalled();
	});
});
