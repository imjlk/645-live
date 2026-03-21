export const SITE_ORIGIN = "https://www.645.live";
export const SITE_NAME = "645.live";
export const SITE_TWITTER = "@645live";

export function absoluteUrl(path: string): string {
	return new URL(path, SITE_ORIGIN).toString();
}

export function titleWithSite(title: string): string {
	return `${title} | ${SITE_NAME}`;
}

export function createCollectionPageSchema(options: {
	path: string;
	name: string;
	description: string;
}) {
	const url = absoluteUrl(options.path);

	return {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: options.name,
		description: options.description,
		url,
		isPartOf: {
			"@type": "WebSite",
			name: SITE_NAME,
			url: SITE_ORIGIN,
		},
	};
}

export function createItemListSchema(
	path: string,
	items: Array<{ name: string; url: string; position: number }>,
) {
	return {
		"@context": "https://schema.org",
		"@type": "ItemList",
		url: absoluteUrl(path),
		itemListElement: items.map((item) => ({
			"@type": "ListItem",
			position: item.position,
			name: item.name,
			url: item.url,
		})),
	};
}
