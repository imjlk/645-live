import { SITE_ORIGIN } from "$lib/seo/index.js";

export type NewsPostSummary = {
	slug: string;
	title: string;
	date: string;
	updatedAt?: string;
	description: string;
	category: string;
	thumbnail: string;
	tags: string[];
	author: string;
	highlight?: string;
};

function getNewsModules() {
	return import.meta.glob("/src/content/news/*.mdx", { eager: true });
}

export function getAllNewsPosts(): NewsPostSummary[] {
	const posts = getNewsModules();

	return Object.entries(posts)
		.map(([filePath, module]: [string, any]) => {
			const slug = filePath.split("/").pop()?.replace(".mdx", "") ?? "";
			const metadata = module.metadata || {};

			return {
				slug,
				title: metadata.title || "제목 없음",
				date: metadata.date || new Date().toISOString().split("T")[0],
				updatedAt: metadata.updatedAt || undefined,
				description: metadata.description || "",
				category: metadata.category || "뉴스",
				thumbnail:
					metadata.thumbnail ||
					`${SITE_ORIGIN}/og/news/${encodeURIComponent(slug)}`,
				tags: Array.isArray(metadata.tags) ? metadata.tags : [],
				author: metadata.author || "645.live",
				highlight: metadata.highlight || undefined,
			};
		})
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getNewsSlugs(): string[] {
	return getAllNewsPosts().map((post) => post.slug);
}
