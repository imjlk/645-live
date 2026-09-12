export type NewsMetadata = Record<string, unknown> & {
	title?: string;
	date?: string;
	publishedAt?: string;
	updatedAt?: string;
	description?: string;
	summary?: string;
	seoDescription?: string;
	category?: string;
	thumbnail?: string;
	tags?: string[];
	author?: string;
	highlight?: string;
};

function nonEmptyText(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

/** Keep short feed copy separate from the article's search description. */
export function normalizeNewsDescriptions(metadata: Record<string, unknown>) {
	const description = nonEmptyText(metadata.description);
	const summary = nonEmptyText(metadata.summary) || description;
	const seoDescription =
		nonEmptyText(metadata.seoDescription) || description || summary;

	return { description: description || summary, summary, seoDescription };
}
