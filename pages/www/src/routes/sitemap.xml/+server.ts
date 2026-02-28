// @ts-nocheck
import * as sitemap from 'super-sitemap';

const newsModules = import.meta.glob('/src/content/news/*.mdx', { eager: true });
const newsSlugs = Object.keys(newsModules)
	.map((filePath) => filePath.split('/').pop()?.replace('.mdx', ''))
	.filter((slug): slug is string => Boolean(slug))
	.sort((a, b) => b.localeCompare(a, 'ko-KR', { numeric: true }));

export const GET = async () => {
	return await sitemap.response({
		origin: 'https://www.645.live',
		paramValues: {
			'/news/posts/[slug]': newsSlugs,
			'/stats/numbers/[number]': Array.from({ length: 45 }, (_, i) => String(i + 1)),
			'/stats/ac/recent/[rounds]': ['10', '20', '50', '100'],
			'/stats/colors/recent/[rounds]': ['10', '20', '50', '100'],
			'/stats/high-low/recent/[rounds]': ['10', '20', '50', '100'],
			'/stats/odd-even/recent/[rounds]': ['10', '20', '50', '100'],
			'/stats/repeat/recent/[rounds]': ['10', '20', '50', '100'],
			'/stats/sections/recent/[rounds]': ['10', '20', '50', '100'],
			'/stats/unit-digit/recent/[rounds]': ['10', '20', '50', '100'],
			'/n/[index]': Array.from({ length: 45 }, (_, i) => String(i + 1))
		},
		excludeRoutePatterns: [
			'^/api/.*',
			'^/og/.*',
			'^/news/sample.*'
		],
		changefreq: {
			'/': 'hourly',
			'/news': 'daily',
			'/news/posts/.*': 'weekly',
			'/stats': 'weekly',
			'/stats/.*': 'weekly',
			'/history': 'weekly',
			'/generator': 'weekly',
			'/n/.*': 'daily',
			'/qr-scan': 'monthly',
			'/guide': 'monthly',
			'/faq': 'monthly',
			'/.*': 'monthly'
		},
		priority: {
			'/': 1.0,
			'/news': 0.85,
			'/news/posts/[slug]': 0.75,
			'/stats': 0.9,
			'/stats/numbers': 0.8,
			'/stats/numbers/[number]': 0.7,
			'/n/[index]': 0.8,
			'/history': 0.8,
			'/generator': 0.8,
			'/stats/.*/recent/[rounds]': 0.5,
			'/.*': 0.5
		}
	});
};
