import { getSingleStatsFreshness, getStatsFreshness } from "$lib/trailbase/stats-freshness";

const ORIGIN = "https://645.live";
const RECENT_ROUNDS = [10, 20, 50, 100];
const RECENT_SECTIONS = [
	"ac",
	"colors",
	"high-low",
	"odd-even",
	"repeat",
	"sections",
	"unit-digit",
];

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function toLastMod(value: string | null, fallbackDate = ""): string {
	if (value && value.trim().length > 0) {
		return value;
	}
	if (fallbackDate) {
		return `${fallbackDate}T00:00:00+09:00`;
	}
	return new Date().toISOString();
}

export const GET = async () => {
	const [statsFreshness, numbersFreshness, acFreshness, bonusFreshness] = await Promise.all([
		getStatsFreshness([
			{
				tableName: "lotto_number_stats",
				sourceLabel: "번호별 통계",
				orderField: "last_draw_round",
				roundField: "last_draw_round",
			},
			{
				tableName: "lotto_draw_odd_even_stats",
				sourceLabel: "홀짝 통계",
			},
			{
				tableName: "lotto_draw_color_stats",
				sourceLabel: "색상 통계",
			},
			{
				tableName: "lotto_draw_section_stats",
				sourceLabel: "구간 통계",
			},
			{
				tableName: "lotto_draw_high_low_stats",
				sourceLabel: "고저 통계",
			},
			{
				tableName: "lotto_draw_ac_stats",
				sourceLabel: "AC 통계",
			},
		]),
		getSingleStatsFreshness({
			tableName: "lotto_number_stats",
			sourceLabel: "번호별 통계",
			orderField: "last_draw_round",
			roundField: "last_draw_round",
		}),
		getSingleStatsFreshness({
			tableName: "lotto_draw_ac_stats",
			sourceLabel: "AC 통계",
		}),
		getStatsFreshness([
			{
				tableName: "lotto_draw_bonus_stats",
				sourceLabel: "보너스 추첨 통계",
			},
			{
				tableName: "lotto_bonus_number_stats",
				sourceLabel: "보너스 번호 통계",
				orderField: "last_bonus_round",
				roundField: "last_bonus_round",
			},
		]),
	]);

	const entries = [
		{ path: "/stats", lastmod: toLastMod(statsFreshness.lastUpdatedAt, statsFreshness.latestDrawDate) },
		{ path: "/guide", lastmod: toLastMod(statsFreshness.lastUpdatedAt, statsFreshness.latestDrawDate) },
		{ path: "/stats/bonus", lastmod: toLastMod(bonusFreshness.lastUpdatedAt, bonusFreshness.latestDrawDate) },
		{ path: "/stats/numbers", lastmod: toLastMod(numbersFreshness.lastUpdatedAt, numbersFreshness.latestDrawDate) },
		{ path: "/stats/ac", lastmod: toLastMod(acFreshness.lastUpdatedAt, acFreshness.latestDrawDate) },
		{ path: "/stats/odd-even", lastmod: toLastMod(statsFreshness.lastUpdatedAt, statsFreshness.latestDrawDate) },
		{ path: "/stats/high-low", lastmod: toLastMod(statsFreshness.lastUpdatedAt, statsFreshness.latestDrawDate) },
		{ path: "/stats/colors", lastmod: toLastMod(statsFreshness.lastUpdatedAt, statsFreshness.latestDrawDate) },
		{ path: "/stats/sections", lastmod: toLastMod(statsFreshness.lastUpdatedAt, statsFreshness.latestDrawDate) },
		{ path: "/stats/pairs", lastmod: toLastMod(statsFreshness.lastUpdatedAt, statsFreshness.latestDrawDate) },
		{ path: "/stats/repeat", lastmod: toLastMod(statsFreshness.lastUpdatedAt, statsFreshness.latestDrawDate) },
		{ path: "/stats/unit-digit", lastmod: toLastMod(statsFreshness.lastUpdatedAt, statsFreshness.latestDrawDate) },
		...RECENT_SECTIONS.flatMap((section) =>
			RECENT_ROUNDS.map((rounds) => ({
				path: `/stats/${section}/recent/${rounds}`,
				lastmod: toLastMod(
					section === "ac" ? acFreshness.lastUpdatedAt : statsFreshness.lastUpdatedAt,
					section === "ac" ? acFreshness.latestDrawDate : statsFreshness.latestDrawDate,
				),
			})),
		),
		...Array.from({ length: 45 }, (_, index) => ({
			path: `/stats/numbers/${index + 1}`,
			lastmod: toLastMod(numbersFreshness.lastUpdatedAt, numbersFreshness.latestDrawDate),
		})),
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
		.map(
			(entry) =>
				`  <url>\n    <loc>${escapeXml(new URL(entry.path, ORIGIN).toString())}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n  </url>`,
		)
		.join("\n")}\n</urlset>\n`;

	return new Response(body, {
		headers: {
			"cache-control": "public, max-age=0, s-maxage=3600",
			"content-type": "application/xml; charset=utf-8",
		},
	});
};
