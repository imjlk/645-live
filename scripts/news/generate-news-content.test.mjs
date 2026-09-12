import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
	analyzeRound,
	buildCandidateSimilarity,
	buildPreviousRoundContext,
	extractNewsLead,
	fallbackPayload,
	sanitizeAiPayload,
} from "./generate-news-content.mjs";

const run = promisify(execFile);
const draw = {
	round: 1241,
	draw_date: "2026-09-12",
	bonus_number: 9,
	draw_number_1: 7,
	draw_number_2: 13,
	draw_number_3: 16,
	draw_number_4: 23,
	draw_number_5: 24,
	draw_number_6: 43,
	first_prize_winner_count: 18,
	first_prize_amount: 1_628_391_980,
	first_prize_accumulated_amount: 29_311_055_640,
	total_sell_amount: 60_959_044_746,
};
const previous = {
	...draw,
	round: 1240,
	draw_date: "2026-09-05",
	bonus_number: 27,
	draw_number_1: 11,
	draw_number_2: 13,
	draw_number_3: 19,
	draw_number_4: 20,
	draw_number_5: 31,
	draw_number_6: 44,
	first_prize_winner_count: 16,
	first_prize_amount: 1_791_817_758,
	total_sell_amount: 59_082_661_914,
};

test("1241 facts distinguish consecutive pairs, number bands, and previous-round overlap", () => {
	const analysis = analyzeRound(draw, []);
	assert.deepEqual(analysis.consecutiveNumbers, [[23, 24]]);
	assert.deepEqual(
		analysis.numberBands.map((band) => band.numbers.length),
		[1, 2, 2, 0, 1],
	);
	assert.equal(analysis.oddCount, 4);
	assert.equal(analysis.evenCount, 2);
	assert.equal(analysis.numberSum, 126);
	const context = buildPreviousRoundContext(analysis, previous);
	assert.deepEqual(context.repeatedNumbers, [13]);
	assert.equal(context.winnerDelta, 2);
	assert.equal(context.amountDelta, -163_425_778);
});

test("adjacent pairs use explicit 10/11 and 40/41 boundaries; bonus is excluded", () => {
	const result = analyzeRound(
		{
			...draw,
			draw_number_1: 10,
			draw_number_2: 11,
			draw_number_3: 12,
			draw_number_4: 30,
			draw_number_5: 40,
			draw_number_6: 41,
		},
		[],
	);
	assert.deepEqual(result.consecutiveNumbers, [
		[10, 11],
		[11, 12],
		[40, 41],
	]);
	assert.deepEqual(
		result.numberBands.map((band) => band.numbers.length),
		[1, 2, 1, 1, 1],
	);
});

test("missing comparison values are not interpreted as zero, and older draws are not adjacent", () => {
	const analysis = analyzeRound(draw, []);
	for (const invalid of [
		null,
		{ ...previous, round: 1239 },
		{ ...previous, first_prize_amount: null },
		{ ...previous, draw_number_6: null },
	]) {
		assert.equal(buildPreviousRoundContext(analysis, invalid), null);
	}
	assert.throws(
		() => analyzeRound({ ...draw, first_prize_amount: null }, []),
		/Incomplete draw/,
	);
	assert.throws(
		() => analyzeRound({ ...draw, draw_number_1: 13 }, []),
		/Incomplete draw/,
	);
});

test("purchase methods only count first-prize records, not second-prize rows or unique locations", () => {
	const sameShop = { address: "서울 중구 테스트길", store_name: "테스트점" };
	const analysis = analyzeRound(draw, [
		{ ...sameShop, win_type: "1등", selection_type: "자동" },
		{ ...sameShop, win_type: "1등", selection_type: "수동" },
		{ ...sameShop, win_type: "2등", selection_type: "자동" },
	]);
	assert.equal(analysis.storesCount, 3);
	assert.equal(analysis.firstStoreCount, 2);
	assert.equal(analysis.autoCount, 1);
	assert.equal(analysis.manualCount, 1);
});

test("AI output cannot replace computed number facts with unsupported analysis", () => {
	const analysis = analyzeRound(draw, []);
	const fallback = fallbackPayload(draw, analysis, previous);
	const payload = sanitizeAiPayload(
		{ bullet_points: ["20번대에 번호가 몰린 이례적인 회차다."] },
		draw.round,
		fallback,
	);
	assert.deepEqual(payload.bullet_points, fallback.bullet_points);
	assert.match(payload.bullet_points[3], /13번으로 1개/);
	assert.match(payload.insight, /163,425,778원 줄었다/);
});

test("a draw with no first prize does not compare a zero payout with a paid-out draw", () => {
	const noWinner = {
		...draw,
		first_prize_winner_count: 0,
		first_prize_amount: 0,
	};
	const payload = fallbackPayload(
		noWinner,
		analyzeRound(noWinner, []),
		previous,
	);
	assert.doesNotMatch(payload.insight, /당첨금은.*줄었다/);
	assert.match(payload.lead, /1등 당첨 게임은 나오지 않았다/);
});

test("reference lead extraction works with DrawSummary and the legacy Card layout", () => {
	assert.equal(
		extractNewsLead(
			"<DrawSummary round={1241} />\n\n새 기사 도입문.\n\n## 번호 구성과 비교\n- 번호",
		),
		"새 기사 도입문.",
	);
	assert.equal(
		extractNewsLead("<Card>결과</Card>\n\n이전 도입문.\n\n## 당첨번호\n1, 2"),
		"이전 도입문.",
	);
});

test("a recurring factual headline does not discard fresh AI prose", () => {
	const reference = {
		title: "제1240회 로또 1등 16게임",
		lead: "기존 결과 안내",
		insight: "기존 설명 문장",
	};
	assert.equal(
		buildCandidateSimilarity(
			{
				...reference,
				title: "제1241회 로또 1등 18게임",
				lead: "새로운 도입 내용",
				insight: "판매점 자료의 집계 범위",
			},
			[reference],
		),
		0,
	);
	assert.equal(buildCandidateSimilarity(reference, [reference]), 1);
});

test("target-round generation fetches its predecessor without rewriting the previous article", async (t) => {
	const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "645-news-test-"));
	const requestedRounds = [];
	const server = http.createServer((request, response) => {
		const url = new URL(request.url, "http://localhost");
		const round = Number(url.searchParams.get("filter[round][$eq]"));
		let records = [];
		if (url.pathname.endsWith("/lotto_draw_results")) {
			requestedRounds.push(round);
			records = round === 1241 ? [draw] : round === 1240 ? [previous] : [];
		} else if (url.pathname.endsWith("/lotto_winning_stores")) {
			records = [
				{
					win_type: "1등",
					selection_type: "자동",
					address: "서울 중구",
					store_name: "테스트점",
				},
			];
		}
		response.writeHead(200, { "content-type": "application/json" });
		response.end(JSON.stringify({ records }));
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	t.after(async () => {
		await new Promise((resolve) => server.close(resolve));
		await fs.rm(workdir, { recursive: true, force: true });
	});
	const newsDir = path.join(workdir, "pages/www/src/content/news");
	await fs.mkdir(newsDir, { recursive: true });
	await fs.writeFile(path.join(newsDir, "lotto-1240.mdx"), "existing article");
	await run(
		process.execPath,
		[fileURLToPath(new URL("./generate-news-content.mjs", import.meta.url))],
		{
			cwd: workdir,
			timeout: 10_000,
			env: {
				...process.env,
				ROUND: "1241",
				FORCE: "true",
				USE_AI: "false",
				MAX_GENERATE_ROUNDS: "0",
				TRAILBASE_URL: `http://127.0.0.1:${server.address().port}`,
			},
		},
	);
	assert.deepEqual(requestedRounds, [1241, 1240]);
	const article = await fs.readFile(
		path.join(newsDir, "lotto-1241.mdx"),
		"utf8",
	);
	assert.match(article, /직전 제1240회와 겹친 본 번호는 13번으로 1개/);
	assert.match(article, /## 번호 구성과 비교/);
	assert.doesNotMatch(article, /## 특이점 분석/);
	assert.equal(
		await fs.readFile(path.join(newsDir, "lotto-1240.mdx"), "utf8"),
		"existing article",
	);
});
