import type {
	MyScanListItem,
	MyScansUpsertPendingResult,
	MyScanUpsertInput,
} from "@645/shared";
import { browser } from "$app/environment";
import { createMemberRpcClient } from "$lib/auth/session-rpc";
import {
	type QRScanHistoryItem,
	type QRScanSyncStrategy,
	qrScanHistory,
} from "$lib/utils/qr-scan-history.js";

function parseRemoteDate(value: string | null | undefined): Date | undefined {
	if (!value) {
		return undefined;
	}

	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

function toHistoryItem(
	item: MyScanListItem,
	userId: string,
): QRScanHistoryItem {
	const scannedAt =
		parseRemoteDate(item.createdAt) ??
		parseRemoteDate(item.updatedAt) ??
		new Date();
	const updatedAt = parseRemoteDate(item.updatedAt);

	return {
		id: `remote-${item.id}`,
		qrData: item.qrData,
		ticketHash: item.ticketHash,
		scannedAt,
		round: item.round ?? undefined,
		gamesCount: item.gamesCount ?? undefined,
		resultStatus: item.resultStatus,
		lastCheckedAt: parseRemoteDate(item.lastCheckedAt),
		isWinner: item.resultStatus === "winner",
		winningGrade: item.winningGrade ?? undefined,
		claimStartAt: parseRemoteDate(item.claimStartAt),
		claimDeadlineAt: parseRemoteDate(item.claimDeadlineAt),
		summary: item.summary,
		userId,
		syncStatus: "synced",
		lastSyncAt: new Date(),
		metadata: {
			remoteId: item.id,
			remoteUpdatedAt: updatedAt?.toISOString() ?? null,
		},
	};
}

class RpcMemberScanSyncStrategy implements QRScanSyncStrategy {
	name = "orpc-member-scan-sync";
	constructor(private readonly userId: string) {}

	canSync(): boolean {
		return browser && qrScanHistory.getUserId() === this.userId;
	}

	async uploadPending(
		items: QRScanHistoryItem[],
	): Promise<{ success: string[]; failed: string[] }> {
		if (!this.canSync() || items.some((item) => item.userId !== this.userId)) {
			return { success: [], failed: items.map((item) => item.id) };
		}
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
			claimStartAt: item.claimStartAt?.toISOString() ?? null,
			claimDeadlineAt: item.claimDeadlineAt?.toISOString() ?? null,
			summary: item.summary,
		}));

		const result = (await createMemberRpcClient(
			this.userId,
		).myScans.upsertPending({
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

	async downloadRemote(userId: string): Promise<QRScanHistoryItem[]> {
		if (!this.canSync() || userId !== this.userId) return [];
		const items = (await createMemberRpcClient(userId).myScans.list({
			limit: 100,
		})) as MyScanListItem[];

		return items.map((item) => toHistoryItem(item, userId));
	}
}

let syncInFlight: {
	userId: string;
	promise: Promise<{ success: boolean; error?: string }>;
} | null = null;
let lifecycleRegistered = false;

export function configureMemberScanSync(userId: string | null): void {
	if (qrScanHistory.getUserId() === userId) return;
	syncInFlight = null;
	qrScanHistory.setUserId(userId);

	if (userId) {
		qrScanHistory.setSyncStrategy(new RpcMemberScanSyncStrategy(userId));
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

	const userId = qrScanHistory.getUserId();
	if (!userId) return { success: false, error: "로그인이 필요합니다" };
	if (syncInFlight?.userId === userId) {
		return syncInFlight.promise;
	}

	const current = { userId, promise: qrScanHistory.sync() };
	syncInFlight = current;
	current.promise = current.promise.finally(() => {
		if (syncInFlight === current) syncInFlight = null;
	});

	return current.promise;
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
