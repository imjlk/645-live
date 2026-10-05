export type ShoppingPlacement = "generator" | "previous_results";
export type ShoppingRecommendation = {
	placement: ShoppingPlacement;
	productId: string;
	title: string;
	affiliateUrl: string;
	imageUrl: string | null;
	expiresAt: number;
};
const CACHE_MS = 60_000;

export function isSharelinkUrl(raw: unknown): raw is string {
	if (
		typeof raw !== "string" ||
		raw.length > 2048 ||
		/\s/.test(raw) ||
		Array.from(raw).some(
			(c) =>
				c.charCodeAt(0) < 32 ||
				(c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159),
		)
	)
		return false;
	try {
		const url = new URL(raw);
		if (url.protocol !== "https:" || url.username || url.password || url.port)
			return false;
		if (
			(url.hostname === "toss.im" || url.hostname === "toss.shopping") &&
			/^\/_m\/[^/]+$/.test(url.pathname)
		)
			return true;
		if (url.hostname === "toss.shopping")
			return /^\/t\/[^/]+$/.test(url.pathname) && !!url.searchParams.get("k");
		return (
			url.hostname === "service.toss.im" &&
			url.pathname === "/shopping/s/" &&
			!!url.searchParams.get("k")
		);
	} catch {
		return false;
	}
}

export function normalizeRecommendations(
	input: unknown,
	now: number,
): ShoppingRecommendation[] {
	if (
		!input ||
		typeof input !== "object" ||
		!Number.isSafeInteger(now) ||
		now < 0
	)
		return [];
	const payload = input as { serverTime?: number; recommendations?: unknown[] };
	if (
		!Number.isSafeInteger(payload.serverTime) ||
		!Array.isArray(payload.recommendations)
	)
		return [];
	const placements = new Set<string>();
	return payload.recommendations.slice(0, 2).flatMap((value) => {
		if (!value || typeof value !== "object") return [];
		const r = value as ShoppingRecommendation;
		const remaining = r.expiresAt - (payload.serverTime as number);
		if (
			(r.placement !== "generator" && r.placement !== "previous_results") ||
			placements.has(r.placement) ||
			typeof r.productId !== "string" ||
			!/^[a-zA-Z0-9_-]{1,64}$/.test(r.productId) ||
			typeof r.title !== "string" ||
			!r.title.trim() ||
			r.title.length > 160 ||
			!isSharelinkUrl(r.affiliateUrl) ||
			!Number.isSafeInteger(r.expiresAt) ||
			remaining <= 0
		)
			return [];
		placements.add(r.placement);
		let imageUrl: string | null = null;
		if (typeof r.imageUrl === "string" && r.imageUrl.length <= 2048) {
			try {
				const image = new URL(r.imageUrl);
				if (
					image.protocol === "https:" &&
					!image.username &&
					!image.password &&
					!image.port
				)
					imageUrl = r.imageUrl;
			} catch {
				/* Optional images never block the product. */
			}
		}
		return [
			{
				placement: r.placement,
				productId: r.productId,
				title: r.title,
				affiliateUrl: r.affiliateUrl,
				imageUrl,
				expiresAt: now + Math.min(CACHE_MS, remaining),
			},
		];
	});
}

/** Share one short-lived read across retained tabs; no user identity or persistent cache. */
export function createShoppingCatalog(
	load: () => Promise<unknown>,
	now = Date.now,
) {
	let offers: ShoppingRecommendation[] = [];
	let refreshAt = 0;
	let pending: Promise<ShoppingRecommendation[]> | null = null;
	const safeLoad = async () => load();
	return {
		read() {
			const startedAt = now();
			if (now() < refreshAt)
				return Promise.resolve(offers.filter((r) => r.expiresAt > now()));
			pending ??= safeLoad()
				.then((data) => {
					offers = normalizeRecommendations(data, startedAt).filter(
						(r) => r.expiresAt > now(),
					);
					return offers;
				})
				.catch(() => {
					offers = [];
					return offers;
				})
				.then((rows) => {
					refreshAt = Math.min(
						now() + CACHE_MS,
						...rows.map((r) => r.expiresAt),
					);
					pending = null;
					return rows;
				});
			return pending;
		},
	};
}
