import {
	type IndexNowManifest,
	type IndexNowManifestGroup,
	scanCountMilestone,
} from "@645/shared/indexnow";
import { SITE_ORIGIN } from "$lib/seo/index.js";
import { getIndexNowScanSnapshot } from "$lib/server/scan-preview.js";
import { getLatestRoundInfo, statsClient } from "$lib/trailbase/stats.js";
import { calculateDisplayRound } from "$lib/utils/lotto-api.js";
import { getAllNewsPosts } from "./news.js";

const RECENT_ROUNDS = [10, 20, 50, 100] as const;

type StatsGroupSpec = {
	id: string;
	tableNames: string[];
	urls: string[];
};

function absoluteUrls(paths: string[]): string[] {
	return [...new Set(paths)].map((path) =>
		new URL(path, SITE_ORIGIN).toString(),
	);
}

async function contentVersion(value: unknown): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(JSON.stringify(value)),
	);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}

async function latestTableTimestamp(tableName: string): Promise<string> {
	const response = await statsClient.records(tableName).list({
		order: ["-updated_at"],
		pagination: { limit: 1 },
	});
	const record = response.records[0] as Record<string, unknown> | undefined;
	return typeof record?.updated_at === "string" ? record.updated_at : "empty";
}

async function buildNewsGroups(): Promise<IndexNowManifestGroup[]> {
	const posts = getAllNewsPosts();
	const postGroups = await Promise.all(
		posts.map(async (post) => ({
			id: `news:${post.slug}`,
			kind: "news" as const,
			version: await contentVersion({
				slug: post.slug,
				title: post.title,
				description: post.description,
				date: post.date,
				publishedAt: post.publishedAt,
				updatedAt: post.updatedAt,
			}),
			urls: absoluteUrls([`/news/posts/${encodeURIComponent(post.slug)}`]),
		})),
	);
	const indexVersion = await contentVersion(
		postGroups.map(({ id, version }) => ({ id, version })),
	);

	return [
		{
			id: "news:index",
			kind: "news",
			version: indexVersion,
			urls: absoluteUrls(["/news"]),
		},
		...postGroups,
	];
}

async function buildDrawGroups(): Promise<IndexNowManifestGroup[]> {
	const latestRound = await getLatestRoundInfo();
	if (!latestRound || latestRound.round <= 0) return [];

	const stores = await statsClient.records("lotto_winning_stores").list({
		order: ["-round", "id"],
		pagination: { limit: 100 },
	});
	const latestStoreRound = Math.max(
		0,
		...stores.records.map((record) => Number(record.round) || 0),
	);
	const latestStores = stores.records
		.filter((record) => Number(record.round) === latestStoreRound)
		.map((record) => ({
			id: record.id,
			name: record.store_name,
			selectionType: record.selection_type,
			winType: record.win_type,
		}));

	return [
		{
			id: "draw:latest",
			kind: "draw",
			version: await contentVersion(latestRound),
			urls: absoluteUrls(["/", "/history"]),
		},
		{
			id: "draw:winning-stores",
			kind: "draw",
			version: await contentVersion({
				round: latestStoreRound,
				stores: latestStores,
			}),
			urls: absoluteUrls(["/winning-stores"]),
		},
	];
}

async function buildStatsGroups(): Promise<IndexNowManifestGroup[]> {
	const numberPaths = Array.from(
		{ length: 45 },
		(_, index) => `/stats/numbers/${index + 1}`,
	);
	const liveNumberPaths = Array.from(
		{ length: 45 },
		(_, index) => `/n/${index + 1}`,
	);
	const recentPaths = (section: string) =>
		RECENT_ROUNDS.map((rounds) => `/stats/${section}/recent/${rounds}`);
	const sharedHubPaths = ["/stats", "/guide"];
	const specs: StatsGroupSpec[] = [
		{
			id: "stats:numbers",
			tableNames: ["lotto_number_stats"],
			urls: [
				...sharedHubPaths,
				"/stats/numbers",
				...numberPaths,
				...liveNumberPaths,
			],
		},
		{
			id: "stats:pairs",
			tableNames: ["lotto_number_pair_stats"],
			urls: ["/stats", "/stats/pairs", ...liveNumberPaths],
		},
		{
			id: "stats:bonus",
			tableNames: ["lotto_draw_bonus_stats", "lotto_bonus_number_stats"],
			urls: [...sharedHubPaths, "/stats/bonus"],
		},
		{
			id: "stats:ac",
			tableNames: ["lotto_draw_ac_stats"],
			urls: [...sharedHubPaths, "/stats/ac", ...recentPaths("ac")],
		},
		{
			id: "stats:odd-even",
			tableNames: ["lotto_draw_odd_even_stats"],
			urls: [...sharedHubPaths, "/stats/odd-even", ...recentPaths("odd-even")],
		},
		{
			id: "stats:colors",
			tableNames: ["lotto_draw_color_stats"],
			urls: [...sharedHubPaths, "/stats/colors", ...recentPaths("colors")],
		},
		{
			id: "stats:sections",
			tableNames: ["lotto_draw_section_stats"],
			urls: [...sharedHubPaths, "/stats/sections", ...recentPaths("sections")],
		},
		{
			id: "stats:high-low",
			tableNames: ["lotto_draw_high_low_stats"],
			urls: [...sharedHubPaths, "/stats/high-low", ...recentPaths("high-low")],
		},
		{
			id: "stats:repeat",
			tableNames: ["lotto_draw_repeat_stats"],
			urls: [...sharedHubPaths, "/stats/repeat", ...recentPaths("repeat")],
		},
		{
			id: "stats:unit-digit",
			tableNames: ["lotto_draw_unit_digit_stats"],
			urls: [
				...sharedHubPaths,
				"/stats/unit-digit",
				...recentPaths("unit-digit"),
			],
		},
	];

	return Promise.all(
		specs.map(async (spec) => ({
			id: spec.id,
			kind: "stats" as const,
			version: await contentVersion(
				await Promise.all(
					spec.tableNames.map(async (tableName) => ({
						tableName,
						updatedAt: await latestTableTimestamp(tableName),
					})),
				),
			),
			urls: absoluteUrls(spec.urls),
		})),
	);
}

async function buildScanGroups(): Promise<IndexNowManifestGroup[]> {
	const snapshot = await getIndexNowScanSnapshot(calculateDisplayRound());
	const numberGroups = snapshot.numberCounts.map((count, index) => ({
		id: `scan:number:${index + 1}`,
		kind: "scan" as const,
		version: `${snapshot.round}:${scanCountMilestone(count)}`,
		urls: absoluteUrls([`/n/${index + 1}`]),
	}));

	return [
		{
			id: "scan:overview",
			kind: "scan",
			version: `${snapshot.round}:${scanCountMilestone(snapshot.totalScans)}`,
			urls: absoluteUrls(["/", "/history", "/qr-scan"]),
		},
		...numberGroups,
	];
}

export async function buildIndexNowManifest(): Promise<IndexNowManifest> {
	const groups = (
		await Promise.all([
			buildNewsGroups(),
			buildDrawGroups(),
			buildStatsGroups(),
			buildScanGroups(),
		])
	).flat();

	return {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		groups,
	};
}
