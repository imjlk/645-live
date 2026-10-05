import { expect, test } from "bun:test";
import {
	createShoppingCatalog,
	isSharelinkUrl,
	normalizeRecommendations,
} from "./shopping-recommendations";
import { createShoppingTelemetry } from "./shopping-telemetry";

const offer = {
	placement: "generator",
	productId: "example",
	title: "Example",
	affiliateUrl: "https://toss.im/_m/example",
	imageUrl: null,
	expiresAt: 1500,
};
const payload = { serverTime: 1000, recommendations: [offer] };
test("only affiliate destinations are accepted; original tracking params are retained", () => {
	for (const url of [
		offer.affiliateUrl,
		"https://toss.shopping/_m/example",
		"https://toss.shopping/t/123?k=issued&referrer=affiliate",
		"https://service.toss.im/shopping/s/?k=issued",
	])
		expect(isSharelinkUrl(url)).toBe(true);
	for (const url of [
		"https://toss.im.evil.test/_m/example",
		"https://user@toss.im/_m/example",
		"https://toss.im/_m/",
		"https://toss.im/_m/a/b",
		"https://toss.im/_m/a/",
		"https://toss.shopping/_m/",
		"https://toss.shopping/_m/a/b",
		"https://toss.shopping/_m/a/",
		"https://toss.shopping/t/?k=issued",
		"https://toss.shopping/t/a/b?k=issued",
		"https://toss.shopping/t/a/?k=issued",
		"https://toss.shopping/t/123",
		"javascript:alert(1)",
		"http://toss.im/_m/example",
		"https://toss.im/product/1",
		"https://toss.im/_m/a\n",
	])
		expect(isSharelinkUrl(url)).toBe(false);
	const link = "https://toss.shopping/t/123?k=issued&referrer=affiliate";
	expect(
		normalizeRecommendations(
			{ serverTime: 1000, recommendations: [{ ...offer, affiliateUrl: link }] },
			5000,
		)[0].affiliateUrl,
	).toBe(link);
});
test("expired, duplicate and malformed configurations collapse without extending expiry", () => {
	expect(normalizeRecommendations(payload, 5000)[0].expiresAt).toBe(5500);
	expect(
		normalizeRecommendations(
			{ ...payload, recommendations: [offer, offer] },
			5000,
		),
	).toHaveLength(1);
	for (const changed of [
		{ expiresAt: 1000 },
		{ affiliateUrl: "https://example.test" },
		{ productId: "private identifier" },
		{ placement: "unknown" },
		{ title: "" },
	])
		expect(
			normalizeRecommendations(
				{ ...payload, recommendations: [{ ...offer, ...changed }] },
				5000,
			),
		).toEqual([]);
	expect(normalizeRecommendations({ recommendations: [offer] }, 5000)).toEqual(
		[],
	);
	expect(
		normalizeRecommendations(
			{ ...payload, recommendations: [{ ...offer, expiresAt: 999999 }] },
			5000,
		)[0].expiresAt,
	).toBe(65000);
});
test("retained screens share an in-flight read and expire the cached offer", async () => {
	let time = 5000,
		calls = 0;
	let resolve!: (value: unknown) => void;
	const cache = createShoppingCatalog(
		() => {
			calls++;
			return new Promise((r) => {
				resolve = r;
			});
		},
		() => time,
	);
	const one = cache.read(),
		two = cache.read();
	expect(calls).toBe(1);
	resolve(payload);
	expect(await one).toEqual(await two);
	time = 5499;
	expect(await cache.read()).toHaveLength(1);
	expect(calls).toBe(1);
	time = 5500;
	const expired = cache.read();
	expect(calls).toBe(2);
	resolve({ ...payload, recommendations: [] });
	expect(await expired).toEqual([]);
	time = 65001;
	const next = cache.read();
	expect(calls).toBe(2);
	expect(await next).toEqual([]);
	time = 65501;
	const refreshed = cache.read();
	expect(calls).toBe(3);
	resolve(payload);
	expect(await refreshed).toHaveLength(1);
});
test("slow or failed catalog reads never revive expired products or flood requests", async () => {
	let time = 0;
	const cache = createShoppingCatalog(
		async () => {
			time = 1000;
			return payload;
		},
		() => time,
	);
	expect(await cache.read()).toEqual([]);
	let calls = 0;
	const failed = createShoppingCatalog(
		async () => {
			calls++;
			throw new Error("unavailable");
		},
		() => time,
	);
	expect(await failed.read()).toEqual([]);
	expect(await failed.read()).toEqual([]);
	expect(calls).toBe(1);
	const synchronous = createShoppingCatalog(
		() => {
			throw new Error("bridge unavailable");
		},
		() => time,
	);
	expect(await synchronous.read()).toEqual([]);
});
test("shopping metrics contain only a bounded product key, placement and version", async () => {
	const events: unknown[] = [];
	const track = createShoppingTelemetry((e) => events.push(e), "1.5.1");
	track("viewed", "previous_results", "example");
	expect(events).toEqual([
		{
			log_name: "lotto_shopping_viewed",
			log_type: "event",
			params: {
				placement: "previous_results",
				product_id: "example",
				app_version: "1.5.1",
			},
		},
	]);
	track("clicked", "generator", "private identifier");
	expect(events).toHaveLength(1);
	expect(() =>
		createShoppingTelemetry(() => {
			throw new Error();
		}, "test")("opened", "generator", "example"),
	).not.toThrow();
	createShoppingTelemetry(() => Promise.reject(new Error()), "test")(
		"open_failed",
		"generator",
		"example",
	);
	await Promise.resolve();
});
