import { expect, test } from "bun:test";
import {
	GENERIC_OG_CACHE_BUSTER,
	getCanonicalNewsOgUrl,
	getGenericOgUrl,
	NEWS_OG_CACHE_BUSTER,
} from "./index.js";

test("OG links encode Korean and percent characters once and version both image families", () => {
	const title = "로또 6/45 · 100% 확인 · %41";
	const url = new URL(
		getGenericOgUrl({ title, description: "내 로또 QR 확인" }),
	);
	expect(url.searchParams.get("title")).toBe(title);
	expect(url.searchParams.get("description")).toBe("내 로또 QR 확인");
	expect(url.searchParams.get("rev")).toBe(GENERIC_OG_CACHE_BUSTER);
	expect(
		new URL(getCanonicalNewsOgUrl("lotto-1240")).searchParams.get("rev"),
	).toBe(NEWS_OG_CACHE_BUSTER);
});
