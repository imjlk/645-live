import type {
	MyScanUpsertInput,
	MyScansUpsertPendingResult,
} from "@645/shared";
import { browser } from "$app/environment";
import { rpcClient } from "$lib/rpc/client";
import {
	type QRScanHistoryItem,
	type QRScanSyncStrategy,
	qrScanHistory,
} from "$lib/utils/qr-scan-history.js";

class RpcMemberScanSyncStrategy implements QRScanSyncStrategy {
	name = "orpc-member-scan-sync";

	canSync(): boolean {
		return browser;
	}

	async uploadPending(
		items: QRScanHistoryItem[],
	): Promise<{ success: string[]; failed: string[] }> {
		if (items.length === 0) {
			return { success: [], failed: [] };
		}

		const payloadItems: MyScanUpsertInput[] = items.map((item) => ({
			ticketHash: item.ticketHash,
			qrData: item.qrData,
			scannedAt: item.scannedAt.toISOString(),
			round: item.round ?? null,
			gamesCount: item.gamesCount ?? null,
			resultStatus: item.resultStatus,
			lastCheckedAt: item.lastCheckedAt?.toISOString() ?? null,
			winningGrade: item.winningGrade ?? null,
			summary: item.summary,
		}));

		const result = (await rpcClient.myScans.upsertPending({
			items: payloadItems,
		})) as MyScansUpsertPendingResult;
		const synced = new Set(result.syncedTicketHashes);

		return {
			success: items
				.filter((item) => synced.has(item.ticketHash))
				.map((item) => item.id),
			failed: items
				.filter((item) => !synced.has(item.ticketHash))
				.map((item) => item.id),
		};
	}

	async downloadRemote(): Promise<QRScanHistoryItem[]> {
		return [];
	}
}

const memberScanSyncStrategy = new RpcMemberScanSyncStrategy();

let syncInFlight: Promise<{ success: boolean; error?: string }> | null = null;
let lifecycleRegistered = false;

export function configureMemberScanSync(userId: string | null): void {
	qrScanHistory.setUserId(userId);

	if (userId) {
		qrScanHistory.setSyncStrategy(memberScanSyncStrategy);
		void syncMemberScanHistory();
		return;
	}

	qrScanHistory.setSyncStrategy(null);
}

export async function syncMemberScanHistory(): Promise<{
	success: boolean;
	error?: string;
}> {
	if (!browser || !qrScanHistory.getUserId()) {
		return { success: false, error: "로그인이 필요합니다" };
	}

	if (syncInFlight) {
		return syncInFlight;
	}

	syncInFlight = qrScanHistory.sync().finally(() => {
		syncInFlight = null;
	});

	return syncInFlight;
}

export function registerMemberScanSyncLifecycle(): () => void {
	if (!browser || lifecycleRegistered) {
		return () => {};
	}

	const onOnline = () => {
		void syncMemberScanHistory();
	};
	const onFocus = () => {
		void syncMemberScanHistory();
	};
	const onVisibilityChange = () => {
		if (document.visibilityState === "visible") {
			void syncMemberScanHistory();
		}
	};

	window.addEventListener("online", onOnline);
	window.addEventListener("focus", onFocus);
	document.addEventListener("visibilitychange", onVisibilityChange);
	lifecycleRegistered = true;

	return () => {
		window.removeEventListener("online", onOnline);
		window.removeEventListener("focus", onFocus);
		document.removeEventListener("visibilitychange", onVisibilityChange);
		lifecycleRegistered = false;
	};
}
