import { getAllNewsPosts } from "$lib/server/news.js";
import { SITE_NAME, SITE_ORIGIN } from "$lib/seo/index.js";

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function toRfc822Date(dateString?: string): string {
	const date = dateString ? new Date(dateString) : new Date();
	return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

function getLatestPostTimestamp(posts: ReturnType<typeof getAllNewsPosts>): string {
	const timestamps = posts
		.map((post) => post.updatedAt || post.date)
		.map((value) => new Date(value).getTime())
		.filter((value) => Number.isFinite(value));

	if (timestamps.length === 0) {
		return new Date().toISOString();
	}

	return new Date(Math.max(...timestamps)).toISOString();
}

export const GET = async () => {
	const posts = getAllNewsPosts();
	const latestBuildDate = toRfc822Date(getLatestPostTimestamp(posts));

	const items = posts
		.map((post) => {
			const link = `${SITE_ORIGIN}/news/posts/${encodeURIComponent(post.slug)}`;
			const pubDate = toRfc822Date(post.updatedAt || post.date);
			const description = escapeXml(post.description || post.title);

			return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${link}</link>
  <guid isPermaLink="true">${link}</guid>
  <pubDate>${pubDate}</pubDate>
  <description>${description}</description>
</item>`;
		})
		.join("\n");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${SITE_NAME} 로또 뉴스</title>
  <link>${SITE_ORIGIN}/news</link>
  <description>645.live의 최신 로또 뉴스 및 분석 피드</description>
  <language>ko-KR</language>
  <lastBuildDate>${latestBuildDate}</lastBuildDate>
  <atom:link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`;

	return new Response(xml, {
		headers: {
			"content-type": "application/rss+xml; charset=utf-8",
			"cache-control": "public, max-age=900",
		},
	});
};
