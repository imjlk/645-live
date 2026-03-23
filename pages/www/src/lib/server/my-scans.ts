import type {
	MyScanListItem,
	MyScanSummary,
	MyScanUpsertInput,
	MyScansListInput,
} from "@645/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { memberScan } from "$lib/db/schema";
import type { DrizzleClient } from "$lib/db";

export type MyScansService = ReturnType<typeof createMyScansService>;

function toIsoString(value: Date | string | null | undefined): string | null {
	if (!value) {
		return null;
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toListItem(
	row: typeof memberScan.$inferSelect,
): MyScanListItem {
	return {
		id: row.id,
		ticketHash: row.ticketHash,
		round: row.round ?? null,
		gamesCount: row.gamesCount ?? null,
		resultStatus: row.resultStatus as MyScanListItem["resultStatus"],
		lastCheckedAt: toIsoString(row.lastCheckedAt),
		winningGrade: row.winningGrade ?? null,
		summary: row.summary,
		createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
		updatedAt: toIsoString(row.updatedAt) ?? new Date(0).toISOString(),
	};
}

function normalizeLimit(limit?: number): number {
	if (!limit || !Number.isFinite(limit)) {
		return 20;
	}

	return Math.max(1, Math.min(100, Math.floor(limit)));
}

export function createMyScansService(db: DrizzleClient) {
	return {
		async getSummary(userId: string): Promise<MyScanSummary> {
			const [row] = await db
				.select({
					totalTickets: sql<number>`count(*)`,
					pendingResults: sql<number>`count(*) filter (where ${memberScan.resultStatus} in ('unreleased', 'unknown'))`,
					winningTickets: sql<number>`count(*) filter (where ${memberScan.resultStatus} = 'winner')`,
					lastScannedAt: sql<Date | null>`max(${memberScan.updatedAt})`,
				})
				.from(memberScan)
				.where(eq(memberScan.userId, userId));

			return {
				totalTickets: Number(row?.totalTickets ?? 0),
				pendingResults: Number(row?.pendingResults ?? 0),
				winningTickets: Number(row?.winningTickets ?? 0),
				lastScannedAt: toIsoString(row?.lastScannedAt ?? null),
			};
		},

		async list(
			userId: string,
			input: MyScansListInput = {},
		): Promise<MyScanListItem[]> {
			const rows = await db
				.select()
				.from(memberScan)
				.where(eq(memberScan.userId, userId))
				.orderBy(desc(memberScan.updatedAt))
				.limit(normalizeLimit(input.limit));

			return rows.map(toListItem);
		},

		async upsertPending(
			userId: string,
			items: MyScanUpsertInput[],
		): Promise<{ syncedTicketHashes: string[] }> {
			const dedupedItems = Array.from(
				new Map(items.map((item) => [item.ticketHash, item])).values(),
			);

			const syncedTicketHashes: string[] = [];

			for (const item of dedupedItems) {
				const scannedAt = new Date(item.scannedAt);
				const updatedAt = Number.isNaN(scannedAt.getTime())
					? new Date()
					: scannedAt;
				const lastCheckedAt = item.lastCheckedAt
					? new Date(item.lastCheckedAt)
					: null;

				await db
					.insert(memberScan)
					.values({
						id: crypto.randomUUID(),
						userId,
						ticketHash: item.ticketHash,
						qrData: item.qrData,
						round: item.round ?? null,
						gamesCount: item.gamesCount ?? null,
						resultStatus: item.resultStatus,
						lastCheckedAt:
							lastCheckedAt && !Number.isNaN(lastCheckedAt.getTime())
								? lastCheckedAt
								: null,
						winningGrade: item.winningGrade ?? null,
						summary: item.summary,
						createdAt: updatedAt,
						updatedAt,
					})
					.onConflictDoUpdate({
						target: [memberScan.userId, memberScan.ticketHash],
						set: {
							qrData: item.qrData,
							round: item.round ?? null,
							gamesCount: item.gamesCount ?? null,
							resultStatus: item.resultStatus,
							lastCheckedAt:
								lastCheckedAt && !Number.isNaN(lastCheckedAt.getTime())
									? lastCheckedAt
									: null,
							winningGrade: item.winningGrade ?? null,
							summary: item.summary,
							updatedAt,
						},
					});

				syncedTicketHashes.push(item.ticketHash);
			}

			return { syncedTicketHashes };
		},

		async findByTicketHash(
			userId: string,
			ticketHash: string,
		): Promise<MyScanListItem | null> {
			const [row] = await db
				.select()
				.from(memberScan)
				.where(
					and(
						eq(memberScan.userId, userId),
						eq(memberScan.ticketHash, ticketHash),
					),
				)
				.limit(1);

			return row ? toListItem(row) : null;
		},
	};
}
