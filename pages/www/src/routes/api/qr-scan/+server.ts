import { TRAILBASE_URL } from "$env/static/private";
import { createMyScansService } from "$lib/server/my-scans";
import { handleQrScanRequest } from "$lib/server/qr-scan-service";
import { buildScanRecordPayload } from "$lib/server/scan-record";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, fetch, locals }) => {
	if (locals.dbBootstrapError || !locals.auth) {
		return Response.json(
			{
				success: false,
				error:
					"스캔 저장 서비스를 연결하지 못했어요. 잠시 후 다시 시도해주세요.",
			},
			{ status: 503, headers: { "Cache-Control": "private, no-store" } },
		);
	}
	return handleQrScanRequest(request, {
		trailbaseUrl: TRAILBASE_URL || "http://localhost:4000",
		fetch,
		buildRecord: buildScanRecordPayload,
		getUserId: async () => {
			const session = await locals.auth.api.getSession({
				headers: request.headers,
			});
			return typeof session?.user?.id === "string" ? session.user.id : null;
		},
		saveMember: async (userId, record) => {
			if (!locals.db) throw new Error("Member database is unavailable");
			await createMyScansService(locals.db).upsertPending(userId, [record]);
		},
	});
};
