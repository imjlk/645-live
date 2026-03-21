export const SITE_ORIGIN = "https://www.645.live";
export const SITE_NAME = "645.live";
export const SITE_TWITTER = "@645live";
export const SITE_LOGO_PATH = "/assets/icons/icon-512.png";

export function absoluteUrl(path: string): string {
	return new URL(path, SITE_ORIGIN).toString();
}

export function getSiteLogoUrl(): string {
	return absoluteUrl(SITE_LOGO_PATH);
}

export function isAbsoluteHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export function getNewsOgVersion(options: {
	date?: string;
	updatedAt?: string;
}): string | undefined {
	const candidate = options.updatedAt?.trim() || options.date?.trim();
	return candidate && candidate.length > 0 ? candidate : undefined;
}

export function getCanonicalNewsOgPath(
	slug: string,
	options: {
		date?: string;
		updatedAt?: string;
	} = {},
): string {
	const params = new URLSearchParams();
	const version = getNewsOgVersion(options);
	if (version) {
		params.set("v", version);
	}

	const query = params.toString();
	const encodedSlug = encodeURIComponent(slug);
	return query.length > 0 ? `/og/news/${encodedSlug}?${query}` : `/og/news/${encodedSlug}`;
}

export function getCanonicalNewsOgUrl(
	slug: string,
	options: {
		date?: string;
		updatedAt?: string;
	} = {},
): string {
	return absoluteUrl(getCanonicalNewsOgPath(slug, options));
}

type GenericOgOptions = {
	title: string;
	description?: string;
	layout?: string;
	theme?: "light" | "dark";
	path?: string;
	width?: number;
	height?: number;
	format?: "png" | "svg";
	alt?: string;
};

export function getGenericOgPath(options: GenericOgOptions): string {
	const params = new URLSearchParams();
	params.set("title", encodeURIComponent(options.title));
	if (options.description) {
		params.set("description", encodeURIComponent(options.description));
	}
	params.set("layout", options.layout || "default");
	params.set("theme", options.theme || "light");
	params.set("format", options.format || "png");
	if (options.width) params.set("width", String(options.width));
	if (options.height) params.set("height", String(options.height));

	const basePath = options.path || "/og";
	return `${basePath}?${params.toString()}`;
}

export function getGenericOgUrl(options: GenericOgOptions): string {
	return absoluteUrl(getGenericOgPath(options));
}

export function getGenericOgImage(options: GenericOgOptions) {
	return {
		url: getGenericOgUrl(options),
		width: options.width || 1200,
		height: options.height || 630,
		alt: options.alt || options.title,
		type: options.format === "svg" ? "image/svg+xml" : "image/png",
	};
}

export function toIsoDateTime(value?: string): string | undefined {
	if (!value) return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;

	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return `${trimmed}T00:00:00+09:00`;
	}

	if (
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)
	) {
		return `${trimmed}+09:00`;
	}

	return trimmed;
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

export function createOrganizationSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: SITE_NAME,
		url: SITE_ORIGIN,
		logo: {
			"@type": "ImageObject",
			url: getSiteLogoUrl(),
		},
		sameAs: [`https://x.com/${SITE_TWITTER.replace(/^@/, "")}`],
	};
}

export function createWebSiteSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE_NAME,
		url: SITE_ORIGIN,
		publisher: {
			"@type": "Organization",
			name: SITE_NAME,
			logo: {
				"@type": "ImageObject",
				url: getSiteLogoUrl(),
			},
		},
	};
}

export function createBreadcrumbSchema(
	items: Array<{ name: string; path: string }>,
) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: absoluteUrl(item.path),
		})),
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
