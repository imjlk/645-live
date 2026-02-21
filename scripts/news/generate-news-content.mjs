import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = process.cwd();
const NEWS_DIR = path.join(REPO_ROOT, 'pages/www/src/content/news');
const TRAILBASE_URL = (process.env.TRAILBASE_URL || 'https://trail.645.live').replace(/\/+$/, '');
const LOOKBACK_ROUNDS = Number.parseInt(process.env.LOOKBACK_ROUNDS || '30', 10);
const FORCE = /^(1|true|yes)$/i.test(process.env.FORCE || '');
const TARGET_ROUND = process.env.ROUND ? Number.parseInt(process.env.ROUND, 10) : null;

function safeInt(value, fallback = 0) {
	const number = Number.parseInt(String(value ?? ''), 10);
	return Number.isFinite(number) ? number : fallback;
}

function safeNumber(value, fallback = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function formatWon(value) {
	return `${Math.round(safeNumber(value)).toLocaleString('ko-KR')}원`;
}

function toEok(value) {
	const eok = safeNumber(value) / 100_000_000;
	if (eok >= 100) {
		return `${Math.round(eok).toLocaleString('ko-KR')}억`;
	}

	return `${eok.toFixed(1).replace(/\.0$/, '')}억`;
}

function formatDate(value) {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	const yyyy = date.getUTCFullYear();
	const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
	const dd = String(date.getUTCDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function yamlString(value) {
	return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function extractRegion(address) {
	const normalized = String(address ?? '').trim();
	if (!normalized) return '기타';
	return normalized.split(/\s+/)[0]?.replace(/[()]/g, '') || '기타';
}

function getNumbers(draw) {
	return [1, 2, 3, 4, 5, 6].map((index) => safeInt(draw[`draw_number_${index}`]));
}

function analyzeRound(draw, stores) {
	const round = safeInt(draw.round);
	const numbers = getNumbers(draw).sort((a, b) => a - b);
	const winnerCount = safeInt(draw.first_prize_winner_count);
	const winnerAmount = safeNumber(draw.first_prize_amount);
	const accumulatedAmount = safeNumber(draw.first_prize_accumulated_amount);
	const totalSales = safeNumber(draw.total_sell_amount);

	let consecutivePairs = 0;
	for (let index = 0; index < numbers.length - 1; index += 1) {
		if (numbers[index + 1] - numbers[index] === 1) {
			consecutivePairs += 1;
		}
	}

	const oddCount = numbers.filter((number) => number % 2 === 1).length;
	const evenCount = numbers.length - oddCount;
	const lowCount = numbers.filter((number) => number <= 10).length;
	const highCount = numbers.filter((number) => number >= 40).length;

	const byRegion = new Map();
	for (const store of stores) {
		const region = extractRegion(store.address);
		const current = byRegion.get(region) || { first: 0, second: 0, total: 0 };
		if (store.win_type === '1등') current.first += 1;
		if (store.win_type === '2등') current.second += 1;
		current.total += 1;
		byRegion.set(region, current);
	}

	const regionRows = [...byRegion.entries()]
		.map(([region, stats]) => ({ region, ...stats }))
		.sort((left, right) => right.total - left.total || right.first - left.first)
		.slice(0, 8);

	const dominantRegion = regionRows[0];
	const dominantRatio = dominantRegion ? dominantRegion.total / Math.max(stores.length, 1) : 0;

	const anomalies = [];
	if (winnerCount === 0) anomalies.push('rollover');
	if (winnerCount === 1) anomalies.push('single_winner');
	if (winnerCount > 1 && winnerCount <= 3) anomalies.push('few_winners');
	if (winnerCount >= 20) anomalies.push('many_winners');
	if (winnerAmount >= 3_000_000_000) anomalies.push('high_payout');
	if (consecutivePairs >= 2) anomalies.push('consecutive_numbers');
	if (oddCount === 6 || evenCount === 6) anomalies.push('all_odd_even');
	if (highCount >= 3 || lowCount >= 3) anomalies.push('number_band_concentration');
	if (dominantRegion && dominantRegion.total >= 5 && dominantRatio >= 0.28) anomalies.push('region_concentration');
	if (totalSales >= 120_000_000_000) anomalies.push('high_sales');

	return {
		round,
		numbers,
		winnerCount,
		winnerAmount,
		accumulatedAmount,
		totalSales,
		oddCount,
		evenCount,
		lowCount,
		highCount,
		consecutivePairs,
		storesCount: stores.length,
		regionRows,
		dominantRegion,
		dominantRatio,
		anomalies
	};
}

function pickTitle(draw, analysis) {
	const round = analysis.round;
	const joinedNumbers = analysis.numbers.join(', ');

	if (analysis.anomalies.includes('rollover')) {
		const expected = analysis.accumulatedAmount > 0 ? toEok(analysis.accumulatedAmount) : '고액';
		return {
			title: `제${round}회 로또 1등 없음, 다음 회차 ${expected} 규모 이월 가능성`,
			description: `제${round}회 로또는 1등 당첨자가 나오지 않았습니다. 당첨번호와 지역별 당첨점 분포를 정리했습니다.`,
			hook: '이번 회차는 1등 공석으로 종료되며 다음 회차 관심도가 크게 높아질 전망입니다.'
		};
	}

	if (analysis.anomalies.includes('single_winner')) {
		return {
			title: `제${round}회 로또 1등 1명 단독 당첨, 수령 예상 ${toEok(analysis.winnerAmount)}`,
			description: `제${round}회 로또에서 1등 단독 당첨이 나왔습니다. 번호 패턴과 당첨점 데이터를 함께 분석합니다.`,
			hook: '1등 당첨자가 1명만 나온 드문 회차로 당첨점과 번호 조합에 관심이 집중됐습니다.'
		};
	}

	if (analysis.anomalies.includes('few_winners') && analysis.anomalies.includes('high_payout')) {
		return {
			title: `제${round}회 로또 소수 당첨, 1인당 ${toEok(analysis.winnerAmount)} 고액 수령`,
			description: `제${round}회 로또는 소수의 1등 당첨자에게 고액이 배분됐습니다. 회차 특이점을 빠르게 확인하세요.`,
			hook: '당첨자 수가 적어 1인당 수령액이 크게 상승한 회차입니다.'
		};
	}

	if (analysis.anomalies.includes('consecutive_numbers')) {
		return {
			title: `제${round}회 로또 연속번호 패턴 포착, 당첨번호 ${joinedNumbers}`,
			description: `제${round}회 로또 당첨번호에서 연속번호가 다수 확인됐습니다. 당첨점 분포와 함께 분석합니다.`,
			hook: '연속번호 출현 비중이 높은 회차로 번호 패턴 분석 수요가 큽니다.'
		};
	}

	if (analysis.anomalies.includes('region_concentration') && analysis.dominantRegion) {
		return {
			title: `제${round}회 로또 ${analysis.dominantRegion.region} 당첨점 집중, 지역 편중 주목`,
			description: `제${round}회 당첨점이 특정 지역에 집중됐습니다. 1등/2등 판매점 분포를 확인해보세요.`,
			hook: `${analysis.dominantRegion.region} 지역에 당첨점이 몰린 회차입니다.`
		};
	}

	return {
		title: `제${round}회 로또 당첨번호 발표: ${joinedNumbers}`,
		description: `제${round}회 로또 당첨번호와 1등 당첨금, 당첨점 분포를 데이터 기반으로 요약했습니다.`,
		hook: '이번 회차 핵심 숫자와 당첨점 분포를 한 번에 확인할 수 있습니다.'
	};
}

function renderRegionRows(rows) {
	if (rows.length === 0) {
		return '<tr><td colspan="4">당첨점 데이터가 아직 집계되지 않았습니다.</td></tr>';
	}

	return rows
		.map(
			(row) =>
				`<tr><td>${row.region}</td><td>${row.first}</td><td>${row.second}</td><td>${row.total}</td></tr>`
		)
		.join('\n      ');
}

function buildTags(analysis) {
	const tags = ['로또', `${analysis.round}회`, '당첨번호', '당첨점'];
	if (analysis.anomalies.includes('rollover')) tags.push('이월');
	if (analysis.anomalies.includes('single_winner')) tags.push('단독당첨');
	return tags.slice(0, 5);
}

function renderMdx(draw, stores) {
	const analysis = analyzeRound(draw, stores);
	const { title, description, hook } = pickTitle(draw, analysis);
	const round = analysis.round;
	const drawDate = formatDate(draw.draw_date);
	const bonus = safeInt(draw.bonus_number);
	const thumbnail = `/og/news/lotto-${round}?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&round=${round}`;
	const tags = buildTags(analysis);
	const anomalyLine =
		analysis.anomalies.length > 0
			? analysis.anomalies.map((value) => `\`${value}\``).join(', ')
			: '특이점 없음';

	const firstPrizeSummary =
		analysis.winnerCount === 0
			? '이번 회차는 1등 당첨자가 없어 이월 상태입니다.'
			: `1등 ${analysis.winnerCount}명, 1인당 ${formatWon(analysis.winnerAmount)} 지급 기준입니다.`;

	return `---
title: ${yamlString(title)}
date: ${yamlString(drawDate)}
category: ${yamlString('로또분석')}
tags: [${tags.map((tag) => yamlString(tag)).join(', ')}]
description: ${yamlString(description)}
author: ${yamlString('645.live 자동뉴스')}
thumbnail: ${yamlString(thumbnail)}
---

import LottoNumbers from '$lib/components/news/LottoNumbers.svelte'
import Card from '$lib/ui/Card.svelte'
import Alert from '$lib/components/news/Alert.svelte'
import Table from '$lib/components/news/Table.svelte'
import Tabs from '$lib/components/news/Tabs.svelte'
import TabsList from '$lib/components/news/TabsList.svelte'
import TabsTrigger from '$lib/components/news/TabsTrigger.svelte'
import TabsContent from '$lib/components/news/TabsContent.svelte'

## 이번 회차 핵심 요약

<Card variant="bordered">
  <ul>
    <li><strong>추첨일</strong>: ${drawDate}</li>
    <li><strong>당첨번호</strong>: ${analysis.numbers.join(', ')} + 보너스 ${bonus}</li>
    <li><strong>1등 당첨자</strong>: ${analysis.winnerCount}명</li>
    <li><strong>1인당 1등 당첨금</strong>: ${formatWon(analysis.winnerAmount)}</li>
    <li><strong>총 판매액</strong>: ${formatWon(analysis.totalSales)}</li>
  </ul>
</Card>

## 당첨번호

<LottoNumbers numbers={[${analysis.numbers.join(', ')}]} bonus={${bonus}} round={${round}} />

## 특이점 분석

${hook}

- 특이점 태그: ${anomalyLine}
- 홀/짝 분포: 홀수 ${analysis.oddCount}개, 짝수 ${analysis.evenCount}개
- 저번호(1~10): ${analysis.lowCount}개, 고번호(40~45): ${analysis.highCount}개
- 연속번호 쌍: ${analysis.consecutivePairs}개

${firstPrizeSummary}

## 지역별 당첨점 현황 (상위)

<Table>
  <thead>
    <tr>
      <th>지역</th>
      <th>1등</th>
      <th>2등</th>
      <th>합계</th>
    </tr>
  </thead>
  <tbody>
      ${renderRegionRows(analysis.regionRows)}
  </tbody>
</Table>

<Tabs defaultValue="insight">
  <TabsList>
    <TabsTrigger value="insight">요약 인사이트</TabsTrigger>
    <TabsTrigger value="stores">당첨점 규모</TabsTrigger>
  </TabsList>
  <TabsContent value="insight">
    <p>제${round}회는 총 ${analysis.storesCount}개 당첨점이 집계되었습니다. 데이터는 배치 시점 기준이며 이후 정정될 수 있습니다.</p>
  </TabsContent>
  <TabsContent value="stores">
    <p>당첨점 데이터가 적거나 비어 있으면, 공식 데이터 수집 직후라 아직 동기화 중일 가능성이 있습니다.</p>
  </TabsContent>
</Tabs>

<Alert type="info">
  복권은 건전한 오락으로 즐겨주세요. 과도한 구매는 경제적 부담을 유발할 수 있습니다.
</Alert>
`;
}

async function fetchJson(url) {
	const response = await fetch(url, { headers: { accept: 'application/json' } });
	const body = await response.text();

	if (!response.ok) {
		throw new Error(`Request failed (${response.status}): ${url}\n${body.slice(0, 200)}`);
	}

	try {
		return JSON.parse(body);
	} catch {
		throw new Error(`Invalid JSON from ${url}\n${body.slice(0, 200)}`);
	}
}

async function fetchRecords(table, params = {}) {
	const url = new URL(`${TRAILBASE_URL}/api/records/v1/${table}`);
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === '') continue;
		url.searchParams.set(key, String(value));
	}

	const payload = await fetchJson(url.toString());
	if (Array.isArray(payload?.records)) {
		return payload.records;
	}

	if (Array.isArray(payload?.data)) {
		return payload.data;
	}

	if (Array.isArray(payload)) {
		return payload;
	}

	if (Array.isArray(payload?.items)) {
		return payload.items;
	}

	throw new Error(`Unexpected payload for ${table}: keys=${Object.keys(payload || {}).join(',')}`);
}

async function getDrawRows() {
	if (TARGET_ROUND && Number.isFinite(TARGET_ROUND)) {
		return fetchRecords('lotto_draw_results', {
			'filter[round][$eq]': TARGET_ROUND,
			limit: 1
		});
	}

	return fetchRecords('lotto_draw_results', {
		order: '-round',
		limit: LOOKBACK_ROUNDS
	});
}

async function getWinningStores(round) {
	return fetchRecords('lotto_winning_stores', {
		'filter[round][$eq]': round,
		order: 'win_type,id',
		limit: 500
	});
}

async function getExistingRounds() {
	const existing = new Set();
	const files = await fs.readdir(NEWS_DIR).catch(() => []);

	for (const file of files) {
		const matched = file.match(/^lotto-(\d+)\.mdx$/);
		if (matched) existing.add(Number.parseInt(matched[1], 10));
	}

	return existing;
}

async function writeNewsFile(round, content) {
	const filePath = path.join(NEWS_DIR, `lotto-${round}.mdx`);
	const previous = await fs.readFile(filePath, 'utf8').catch(() => null);
	if (previous === content) return false;
	await fs.writeFile(filePath, content, 'utf8');
	return true;
}

async function main() {
	await fs.mkdir(NEWS_DIR, { recursive: true });

	const existingRounds = await getExistingRounds();
	const drawRows = await getDrawRows();
	drawRows.sort((left, right) => safeInt(left.round) - safeInt(right.round));

	let generatedCount = 0;
	let updatedCount = 0;

	for (const draw of drawRows) {
		const round = safeInt(draw.round);
		if (!round) continue;

		if (!FORCE && existingRounds.has(round)) {
			continue;
		}

		const stores = await getWinningStores(round);
		const mdx = renderMdx(draw, stores);
		const changed = await writeNewsFile(round, mdx);
		if (!changed) continue;

		if (existingRounds.has(round)) {
			updatedCount += 1;
		} else {
			generatedCount += 1;
		}
		console.log(`[news] generated lotto-${round}.mdx (stores=${stores.length})`);
	}

	console.log(`[news] done generated=${generatedCount} updated=${updatedCount}`);
}

main().catch((error) => {
	console.error('[news] failed:', error);
	process.exitCode = 1;
});
