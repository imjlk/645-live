import {
	SITE_ORIGIN,
	getCanonicalNewsOgUrl,
	isAbsoluteHttpUrl,
} from "$lib/seo/index.js";

export type NewsPostSummary = {
	slug: string;
	title: string;
	date: string;
	publishedAt?: string;
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

function resolveNewsThumbnail(slug: string, metadata: Record<string, unknown>): string {
	const rawThumbnail =
		typeof metadata.thumbnail === "string" ? metadata.thumbnail.trim() : "";

	if (rawThumbnail && isAbsoluteHttpUrl(rawThumbnail)) {
		return rawThumbnail;
	}

	return getCanonicalNewsOgUrl(slug, {
		date: typeof metadata.date === "string" ? metadata.date : undefined,
		publishedAt:
			typeof metadata.publishedAt === "string"
				? metadata.publishedAt
				: undefined,
		updatedAt:
			typeof metadata.updatedAt === "string" ? metadata.updatedAt : undefined,
	});
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
				publishedAt: metadata.publishedAt || undefined,
				updatedAt: metadata.updatedAt || undefined,
				description: metadata.description || "",
				category: metadata.category || "뉴스",
				thumbnail: resolveNewsThumbnail(slug, metadata),
				tags: Array.isArray(metadata.tags) ? metadata.tags : [],
				author: metadata.author || "645.live",
				highlight: metadata.highlight || undefined,
			};
		})
		.sort(
			(a, b) =>
				new Date(b.updatedAt || b.publishedAt || b.date).getTime() -
				new Date(a.updatedAt || a.publishedAt || a.date).getTime(),
		);
}

export function getNewsSlugs(): string[] {
	return getAllNewsPosts().map((post) => post.slug);
}

export function getNewsPostBySlug(slug: string): NewsPostSummary | undefined {
	return getAllNewsPosts().find((post) => post.slug === slug);
}
