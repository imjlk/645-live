import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const base = new URL(process.argv[2] || "http://127.0.0.1:8896");
assert(
	["127.0.0.1", "localhost"].includes(base.hostname),
	"Run synthetic OG checks against a local Worker.",
);
const out = process.argv[3] || "/tmp/645-og-previews";
const runId = String(Date.now());
await mkdir(out, { recursive: true });

const cases = [
	[
		"home-light",
		"/",
		{
			title: "로또 당첨번호와 QR 확인",
			description: "내 로또를 확인하고, 실시간 스캔 현황을 함께 살펴보세요.",
		},
	],
	[
		"news-light",
		"/news/lotto-1240",
		{
			title: "제1240회 로또 지역 분포 분석, 경기 주목",
			description: "84개 당첨 판매점의 지역별 집계, 오산·익산 1등 각 2곳",
			date: "2026-09-05",
		},
	],
	[
		"news-dark",
		"/news/lotto-1240",
		{
			title: "제1240회 로또 지역 분포 분석, 경기 주목",
			description: "84개 당첨 판매점의 지역별 집계, 오산·익산 1등 각 2곳",
			date: "2026-09-05",
			theme: "dark",
		},
	],
	[
		"draw",
		"/news/lotto-1240",
		{
			title: "제1240회 로또 당첨번호",
			numbers: "11,13,19,20,31,44",
			bonus: "27",
			date: "2026-09-05",
		},
	],
	[
		"long-korean",
		"/",
		{
			title: "긴한글제목의줄바꿈과넘침을확인합니다".repeat(12),
			description: "설명과 로또 볼이 겹치지 않아야 합니다. ".repeat(12),
		},
	],
	[
		"two-line",
		"/",
		{
			title: "번호별 통계와 회차별 당첨 결과를 한눈에 확인하세요",
			description:
				"설명이 길어져 두 줄이 되더라도 제목과 설명, 로또 볼, 하단 안내가 서로 겹치지 않는지 확인하는 이미지입니다.",
		},
	],
	[
		"percent",
		"/",
		{
			title: "100% 확인 · %41 그대로 · AI/QR",
			description: "한글과 English · 6/45",
		},
	],
	[
		"legacy",
		"/",
		{ title: encodeURIComponent("기존 로또 공유 링크"), rev: "2026-03-25-1" },
	],
	["small", "/", { title: "로또 QR 확인", width: "800", height: "418" }],
	["wide", "/", { title: "로또 번호 통계", width: "9999", height: "418" }],
];

const signature = "89504e470d0a1a0a";
const results = [];
for (const [name, path, params] of cases) {
	const url = new URL(path, base);
	url.search = new URLSearchParams(params).toString();
	url.searchParams.set("check", runId);
	const response = await fetch(url);
	assert.equal(response.status, 200, `${name}: HTTP status`);
	assert.equal(response.headers.get("content-type"), "image/png");
	const png = Buffer.from(await response.arrayBuffer());
	assert.equal(png.subarray(0, 8).toString("hex"), signature);
	assert.equal(
		png.readUInt32BE(16),
		Math.min(2400, Number(params.width || 1200)),
	);
	assert.equal(png.readUInt32BE(20), Number(params.height || 630));
	await writeFile(join(out, `${name}.png`), png);
	results.push({
		name,
		bytes: png.length,
		cache: response.headers.get("x-cache"),
	});
}

const cacheUrl = new URL("/?title=Cache+check", base);
cacheUrl.searchParams.set("check", runId);
const first = await fetch(cacheUrl);
assert.equal(first.headers.get("x-cache"), "MISS");
await first.arrayBuffer();
let cached;
for (let attempt = 0; attempt < 10; attempt++) {
	cached = await fetch(cacheUrl);
	await cached.arrayBuffer();
	if (cached.headers.get("x-cache") === "HIT") break;
	await new Promise((resolve) => setTimeout(resolve, 50));
}
assert.equal(
	cached.headers.get("x-cache"),
	"HIT",
	"Generic images should use the edge cache.",
);
const svg = await fetch(new URL("/?title=SVG+확인&format=svg", base));
assert.equal(svg.headers.get("content-type"), "image/svg+xml");
assert.equal(svg.headers.get("cache-control"), "no-store");
assert.equal(svg.headers.get("x-cache"), null);
assert.match(await svg.text(), /<svg/);
for (const body of [
	'{"title":',
	JSON.stringify({ title: "제목", description: false }),
	JSON.stringify({ title: " " }),
	JSON.stringify({
		title: "로또",
		numbers: [11, 13, 19, 20, 31, 44],
		bonusNumber: 11,
	}),
	JSON.stringify({ title: "로또", bonusNumber: 27 }),
]) {
	const response = await fetch(new URL("/generate", base), {
		method: "POST",
		body,
		headers: { "Content-Type": "application/json" },
	});
	assert.equal(
		response.status,
		400,
		"Invalid bodies must be rejected before rendering.",
	);
}
const oversized = await fetch(new URL("/generate", base), {
	method: "POST",
	body: JSON.stringify({ title: "가".repeat(20000) }),
	headers: { "Content-Type": "application/json" },
});
assert.equal(oversized.status, 413);
const custom = await fetch(new URL("/generate", base), {
	method: "POST",
	body: JSON.stringify({
		title: "로또 번호 확인",
		width: 1,
		height: 1,
		theme: "dark",
	}),
	headers: { "Content-Type": "application/json" },
});
assert.equal(custom.status, 200);
assert.equal(custom.headers.get("cache-control"), "no-store");
const customPng = Buffer.from(await custom.arrayBuffer());
assert.equal(customPng.readUInt32BE(16), 800);
assert.equal(customPng.readUInt32BE(20), 418);
console.log(
	JSON.stringify(
		{
			images: results,
			checks: [
				"PNG dimensions",
				"generic cache HIT",
				"uncached SVG",
				"invalid JSON",
				"body limit",
				"POST dimensions",
			],
		},
		null,
		2,
	),
);
