import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	const baseUrl = "https://www.645.live";
	const currentDate = new Date().toISOString().split("T")[0];

	let latestDataDate = currentDate;
	let latestScanDate = currentDate;

	try {
		// Get latest lotto draw result date for statistics pages
		const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

		const latestDrawResponse = await client.records("lotto_draw_results").list({
			order: ["-round"],
			pagination: { limit: 1 },
		});

		if (latestDrawResponse.records.length > 0) {
			const latestDraw = latestDrawResponse.records[0] as { draw_date: string };
			latestDataDate = latestDraw.draw_date;
		}

		// Get latest scan data date for scan-related pages
		const latestScanResponse = await client
			.records("lotto_draw_scan_counts")
			.list({
				order: ["-updated_at"],
				pagination: { limit: 1 },
			});

		if (latestScanResponse.records.length > 0) {
			const latestScan = latestScanResponse.records[0] as {
				updated_at: string;
			};
			latestScanDate = latestScan.updated_at.split("T")[0];
		}
	} catch (error) {
		console.warn("Failed to fetch latest data dates for sitemap:", error);
	}

	// Static pages with appropriate last modification dates
	const staticPages = [
		{ url: "", priority: "1.0", changefreq: "hourly", lastmod: latestScanDate }, // homepage (scan data)
		{
			url: "/stats",
			priority: "0.9",
			changefreq: "weekly",
			lastmod: latestDataDate,
		}, // stats (draw data - weekly draws)
		{
			url: "/generator",
			priority: "0.8",
			changefreq: "weekly",
			lastmod: currentDate,
		},
		{
			url: "/qr-scan",
			priority: "0.7",
			changefreq: "monthly",
			lastmod: currentDate,
		},
		{
			url: "/history",
			priority: "0.7",
			changefreq: "weekly",
			lastmod: latestDataDate,
		}, // history (draw data - weekly draws)
		{
			url: "/winning-stores",
			priority: "0.6",
			changefreq: "monthly",
			lastmod: currentDate,
		},
		{
			url: "/stats/numbers",
			priority: "0.8",
			changefreq: "weekly",
			lastmod: latestDataDate,
		}, // stats (draw data - weekly draws)
		{
			url: "/stats/pairs",
			priority: "0.7",
			changefreq: "weekly",
			lastmod: latestDataDate,
		}, // stats (draw data - weekly draws)
		{
			url: "/stats/sections",
			priority: "0.7",
			changefreq: "weekly",
			lastmod: latestDataDate,
		}, // stats (draw data - weekly draws)
		{
			url: "/stats/unit-digit",
			priority: "0.7",
			changefreq: "weekly",
			lastmod: latestDataDate,
		}, // stats (draw data - weekly draws)
		{
			url: "/stats/ac",
			priority: "0.7",
			changefreq: "weekly",
			lastmod: latestDataDate,
		}, // stats (draw data - weekly draws)
		{
			url: "/my",
			priority: "0.5",
			changefreq: "monthly",
			lastmod: currentDate,
		},
		{
			url: "/terms",
			priority: "0.3",
			changefreq: "yearly",
			lastmod: currentDate,
		},
		{
			url: "/privacy",
			priority: "0.3",
			changefreq: "yearly",
			lastmod: currentDate,
		},
	];

	// Individual number pages (1-45) - updated when scan data changes
	const numberPages = Array.from({ length: 45 }, (_, i) => ({
		url: `/n/${i + 1}`,
		priority: "0.8",
		changefreq: "daily", // scan data can update daily
		lastmod: latestScanDate, // scan data affects these pages
	}));

	// AC value pages (dynamic based on common AC values in lotto) - updated when draw data changes
	const acPages = Array.from({ length: 21 }, (_, i) => ({
		url: `/stats/ac/${i}`,
		priority: "0.6",
		changefreq: "weekly",
		lastmod: latestDataDate, // draw data affects these pages
	}));

	// Combine all pages
	const allPages = [...staticPages, ...numberPages, ...acPages];

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
	.map(
		(page) => `	<url>
		<loc>${baseUrl}${page.url}</loc>
		<lastmod>${page.lastmod}</lastmod>
		<changefreq>${page.changefreq}</changefreq>
		<priority>${page.priority}</priority>
	</url>`,
	)
	.join("\n")}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": "max-age=86400", // Cache for 1 day
		},
	});
};
