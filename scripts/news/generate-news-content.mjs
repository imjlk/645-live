import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = process.cwd();
const NEWS_DIR = path.join(REPO_ROOT, 'pages/www/src/content/news');
const TRAILBASE_URL = (process.env.TRAILBASE_URL || 'https://trail.645.live').replace(/\/+$/, '');
const LOOKBACK_ROUNDS = Number.parseInt(process.env.LOOKBACK_ROUNDS || '30', 10);
const FORCE = parseBool(process.env.FORCE, false);
const TARGET_ROUND = process.env.ROUND ? Number.parseInt(process.env.ROUND, 10) : null;

const USE_AI = parseBool(process.env.USE_AI, true);
const ZAI_API_KEY = process.env.ZAI_API_KEY || '';
const ZAI_BASE_URL = (process.env.ZAI_BASE_URL || 'https://api.z.ai/api/coding/paas/v4').replace(/\/+$/, '');
const ZAI_MODEL = process.env.ZAI_MODEL || 'glm-5';
const ZAI_TIMEOUT_MS = Number.parseInt(process.env.ZAI_TIMEOUT_MS || '120000', 10);
const ZAI_MAX_TOKENS = Number.parseInt(process.env.ZAI_MAX_TOKENS || '4000', 10);

function parseBool(value, fallback = false) {
	if (value === undefined || value === null || value === '') return fallback;
	if (typeof value === 'boolean') return value;
	return /^(1|true|yes|on)$/i.test(String(value));
}

function safeInt(value, fallback = 0) {
	const number = Number.parseInt(String(value ?? ''), 10);
	return Number.isFinite(number) ? number : fallback;
}

function safeNumber(value, fallback = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function yamlString(value) {
	return `"${String(value ?? '')
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, ' ')}"`;
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

function extractRegion(address) {
	const normalized = String(address ?? '').trim();
	if (!normalized) return '기타';

	if (/dhlottery|https?:\/\/|www\.|\.co\.kr|\.com/i.test(normalized)) {
		return '온라인';
	}

	const token = normalized.split(/\s+/)[0]?.replace(/[()]/g, '') || '';
	if (!token) return '기타';

	const aliases = new Map([
		['서울특별시', '서울'], ['서울시', '서울'],
		['부산광역시', '부산'], ['부산시', '부산'],
		['대구광역시', '대구'], ['대구시', '대구'],
		['인천광역시', '인천'], ['인천시', '인천'],
		['광주광역시', '광주'], ['광주시', '광주'],
		['대전광역시', '대전'], ['대전시', '대전'],
		['울산광역시', '울산'], ['울산시', '울산'],
		['세종특별자치시', '세종'],
		['경기도', '경기'], ['강원도', '강원'], ['강원특별자치도', '강원'],
		['충청북도', '충북'], ['충청남도', '충남'],
		['전라북도', '전북'], ['전북특별자치도', '전북'],
		['전라남도', '전남'],
		['경상북도', '경북'], ['경상남도', '경남'],
		['제주특별자치도', '제주'], ['제주도', '제주']
	]);

	if (aliases.has(token)) {
		return aliases.get(token);
	}

	if (/^[가-힣]{2,4}$/.test(token)) {
		return token;
	}

	return '기타';
}

function extractArea(address) {
	const normalized = String(address ?? '').trim();
	if (!normalized) return '기타';

	if (/dhlottery|https?:\/\/|www\.|\.co\.kr|\.com/i.test(normalized)) {
		return '온라인';
	}

	const parts = normalized.split(/\s+/).filter(Boolean);
	const region = extractRegion(normalized);
	const district = parts[1]?.replace(/[0-9].*$/, '')?.replace(/[()]/g, '') || '';

	if (region === '온라인') return '온라인';
	if (!district) return region;
	if (/^[가-힣]{1,8}$/.test(district)) {
		return `${region} ${district}`;
	}
	return region;
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
		if (numbers[index + 1] - numbers[index] === 1) consecutivePairs += 1;
	}

	const oddCount = numbers.filter((number) => number % 2 === 1).length;
	const evenCount = numbers.length - oddCount;
	const lowCount = numbers.filter((number) => number <= 10).length;
	const highCount = numbers.filter((number) => number >= 40).length;

	const byRegion = new Map();
	let firstStoreCount = 0;
	let secondStoreCount = 0;
	let autoCount = 0;
	let manualCount = 0;
	let semiCount = 0;

	const byArea = new Map();

	for (const store of stores) {
		const region = extractRegion(store.address);
		const area = extractArea(store.address);
		const current = byRegion.get(region) || { first: 0, second: 0, total: 0 };
		const areaCurrent = byArea.get(area) || { first: 0, second: 0, total: 0 };
		if (store.win_type === '1등') {
			current.first += 1;
			areaCurrent.first += 1;
			firstStoreCount += 1;
		}
		if (store.win_type === '2등') {
			current.second += 1;
			areaCurrent.second += 1;
			secondStoreCount += 1;
		}
		if (store.selection_type === '자동') autoCount += 1;
		if (store.selection_type === '수동') manualCount += 1;
		if (store.selection_type === '반자동') semiCount += 1;
		current.total += 1;
		areaCurrent.total += 1;
		byRegion.set(region, current);
		byArea.set(area, areaCurrent);
	}

	const regionRows = [...byRegion.entries()]
		.map(([region, stats]) => ({ region, ...stats }))
		.sort((left, right) => right.total - left.total || right.first - left.first)
		.slice(0, 10);

	const areaRows = [...byArea.entries()]
		.map(([area, stats]) => ({ area, ...stats }))
		.sort((left, right) => right.total - left.total || right.first - left.first)
		.slice(0, 12);

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
		firstStoreCount,
		secondStoreCount,
		autoCount,
		manualCount,
		semiCount,
		regionRows,
		areaRows,
		dominantRegion,
		dominantRatio,
		anomalies
	};
}

function pickTitle(analysis) {
	const round = analysis.round;
	const joinedNumbers = analysis.numbers.join(', ');

	if (analysis.anomalies.includes('rollover')) {
		const expected = analysis.accumulatedAmount > 0 ? toEok(analysis.accumulatedAmount) : '고액';
		return {
			title: `제${round}회 로또 1등 없음, 다음 회차 ${expected} 규모 이월 가능성`,
			description: `제${round}회 로또는 1등 당첨자가 나오지 않았습니다. 당첨번호와 지역별 당첨점 분포를 정리했습니다.`,
			angle: '이번 회차는 1등 공석으로 종료되며 다음 회차 관심도가 크게 높아질 전망입니다.'
		};
	}

	if (analysis.anomalies.includes('single_winner')) {
		return {
			title: `제${round}회 로또 1등 1명 단독 당첨, 수령 예상 ${toEok(analysis.winnerAmount)}`,
			description: `제${round}회 로또에서 1등 단독 당첨이 나왔습니다. 번호 패턴과 당첨점 데이터를 함께 분석합니다.`,
			angle: '1등 당첨자가 1명만 나온 드문 회차로 당첨점과 번호 조합에 관심이 집중됐습니다.'
		};
	}

	if (analysis.anomalies.includes('few_winners') && analysis.anomalies.includes('high_payout')) {
		return {
			title: `제${round}회 로또 소수 당첨, 1인당 ${toEok(analysis.winnerAmount)} 고액 수령`,
			description: `제${round}회 로또는 소수의 1등 당첨자에게 고액이 배분됐습니다. 회차 특이점을 빠르게 확인하세요.`,
			angle: '당첨자 수가 적어 1인당 수령액이 크게 상승한 회차입니다.'
		};
	}

	if (analysis.anomalies.includes('consecutive_numbers')) {
		return {
			title: `제${round}회 로또 연속번호 패턴 포착, 당첨번호 ${joinedNumbers}`,
			description: `제${round}회 로또 당첨번호에서 연속번호가 다수 확인됐습니다. 당첨점 분포와 함께 분석합니다.`,
			angle: '연속번호 출현 비중이 높은 회차로 번호 패턴 분석 수요가 큽니다.'
		};
	}

	if (analysis.anomalies.includes('region_concentration') && analysis.dominantRegion) {
		return {
			title: `제${round}회 로또 ${analysis.dominantRegion.region} 당첨점 집중, 지역 편중 주목`,
			description: `제${round}회 당첨점이 특정 지역에 집중됐습니다. 1등/2등 판매점 분포를 확인해보세요.`,
			angle: `${analysis.dominantRegion.region} 지역에 당첨점이 몰린 회차입니다.`
		};
	}

	return {
		title: `제${round}회 로또 당첨번호 발표: ${joinedNumbers}`,
		description: `제${round}회 로또 당첨번호와 1등 당첨금, 당첨점 분포를 데이터 기반으로 요약했습니다.`,
		angle: '이번 회차 핵심 숫자와 당첨점 분포를 한 번에 확인할 수 있습니다.'
	};
}

function normalizeLine(value, fallback) {
	const text = String(value ?? '').replace(/\s+/g, ' ').trim();
	return text || fallback;
}

function normalizeBlock(value, fallback) {
	const raw = String(value ?? '').replace(/\r/g, '').trim();
	if (!raw) return fallback;
	return raw.replace(/\n{3,}/g, '\n\n');
}

function normalizeTags(tags, round) {
	if (!Array.isArray(tags)) {
		return ['로또', `${round}회`, '당첨번호', '당첨점'];
	}

	const unique = [];
	for (const tag of tags) {
		const value = String(tag ?? '').trim();
		if (!value || unique.includes(value)) continue;
		unique.push(value);
		if (unique.length >= 5) break;
	}

	if (unique.length === 0) {
		return ['로또', `${round}회`, '당첨번호', '당첨점'];
	}

	return unique;
}

function fallbackPayload(draw, analysis) {
	const titleData = pickTitle(analysis);
	const round = analysis.round;
	const tags = ['로또', `${round}회`, '당첨번호', '당첨점'];
	if (analysis.anomalies.includes('rollover')) tags.push('이월');
	if (analysis.anomalies.includes('single_winner')) tags.push('단독당첨');

	const bulletPoints = [
		`1등 당첨자 수는 ${analysis.winnerCount}명이며 1인당 당첨금은 ${formatWon(analysis.winnerAmount)}입니다.`,
		`홀수 ${analysis.oddCount}개, 짝수 ${analysis.evenCount}개로 구성됐습니다.`,
		`고번호(40~45) ${analysis.highCount}개, 저번호(1~10) ${analysis.lowCount}개가 출현했습니다.`,
		`당첨점은 총 ${analysis.storesCount}개 집계됐고 1등 판매점은 ${analysis.firstStoreCount}개입니다.`
	];

	return {
		title: titleData.title,
		description: titleData.description,
		category: '로또분석',
		tags: tags.slice(0, 5),
		lead: titleData.angle,
		bullet_points: bulletPoints,
		insight: analysis.anomalies.length > 0
			? `이번 회차 특이점: ${analysis.anomalies.map((value) => `\`${value}\``).join(', ')}`
			: '이번 회차는 뚜렷한 이상치 없이 평균적인 분포를 보였습니다.',
		caution_message: '복권은 건전한 오락으로 즐겨주세요. 과도한 구매는 경제적 부담을 유발할 수 있습니다.'
	};
}

function tryParseJson(text) {
	if (typeof text !== 'string') return null;
	const trimmed = text.trim();
	if (!trimmed) return null;

	try {
		return JSON.parse(trimmed);
	} catch {
		// ignore
	}

	const firstBrace = trimmed.indexOf('{');
	const lastBrace = trimmed.lastIndexOf('}');
	if (firstBrace >= 0 && lastBrace > firstBrace) {
		const sliced = trimmed.slice(firstBrace, lastBrace + 1);
		try {
			return JSON.parse(sliced);
		} catch {
			return null;
		}
	}

	return null;
}

function sanitizeAiPayload(rawPayload, round, fallback) {
	if (!rawPayload || typeof rawPayload !== 'object') {
		return fallback;
	}

	const bulletPoints = Array.isArray(rawPayload.bullet_points)
		? rawPayload.bullet_points.map((value) => normalizeLine(value, '')).filter(Boolean).slice(0, 6)
		: [];

	return {
		title: normalizeLine(rawPayload.title, fallback.title),
		description: normalizeLine(rawPayload.description, fallback.description),
		category: normalizeLine(rawPayload.category, fallback.category),
		tags: normalizeTags(rawPayload.tags, round),
		lead: normalizeBlock(rawPayload.lead, fallback.lead),
		bullet_points: bulletPoints.length > 0 ? bulletPoints : fallback.bullet_points,
		insight: normalizeBlock(rawPayload.insight, fallback.insight),
		caution_message: normalizeLine(rawPayload.caution_message, fallback.caution_message)
	};
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
	if (Array.isArray(payload?.records)) return payload.records;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	if (Array.isArray(payload)) return payload;
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

function aiInputPayload(draw, stores, analysis) {
	const bonus = safeInt(draw.bonus_number);
	return {
		round: analysis.round,
		draw_date: formatDate(draw.draw_date),
		numbers: analysis.numbers,
		bonus_number: bonus,
		first_prize_winner_count: analysis.winnerCount,
		first_prize_amount: analysis.winnerAmount,
		first_prize_accumulated_amount: analysis.accumulatedAmount,
		total_sell_amount: analysis.totalSales,
		anomalies: analysis.anomalies,
		number_stats: {
			odd_count: analysis.oddCount,
			even_count: analysis.evenCount,
			low_count: analysis.lowCount,
			high_count: analysis.highCount,
			consecutive_pairs: analysis.consecutivePairs
		},
		store_stats: {
			total: analysis.storesCount,
			first_count: analysis.firstStoreCount,
			second_count: analysis.secondStoreCount,
			auto_count: analysis.autoCount,
			manual_count: analysis.manualCount,
			semi_auto_count: analysis.semiCount,
			top_regions: analysis.regionRows,
			top_areas: analysis.areaRows
		}
	};
}

async function generatePayloadWithAi(draw, stores, analysis, fallback) {
	if (!USE_AI || !ZAI_API_KEY) {
		return fallback;
	}

	const endpoint = `${ZAI_BASE_URL}/chat/completions`;
	const input = aiInputPayload(draw, stores, analysis);
	const prompt = [
		'다음 JSON 데이터(로또 회차 집계/당첨점 집계)를 기반으로 한국어 뉴스 콘텐츠를 생성하라.',
		'사실 기반의 중립적 뉴스 요약으로 작성하라.',
		'반드시 tool call(save_news_payload)로만 응답한다.',
		'각 항목 규칙:',
		'- title: 80자 이내',
		'- description: 120~220자',
		'- category: "로또분석" 권장',
		'- tags: 3~5개',
		'- lead: 2~4문단, 합계 350자 이상',
		'- bullet_points: 4~8개',
		'- insight: 2~4문단, 합계 300자 이상',
		'- caution_message: 건전 구매 안내 1문장',
		'입력 데이터:',
		JSON.stringify(input)
	].join('\n');

	const jsonObjectPrompt = [
		'다음 JSON 데이터로 로또 뉴스 payload를 생성하라.',
		'사실 기반의 중립적 문체를 사용하라.',
		'반드시 JSON 객체만 반환하라.',
		'필수 키: title, description, category, tags, lead, bullet_points, insight, caution_message',
		'tags는 문자열 배열(3~5개), bullet_points는 문자열 배열(4~8개)이어야 한다.',
		'lead와 insight는 각각 2~4문단으로 충분히 길게 작성하라.',
		JSON.stringify(input)
	].join('\n');

	async function requestZai(body) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), ZAI_TIMEOUT_MS);

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					authorization: `Bearer ${ZAI_API_KEY}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify(body),
				signal: controller.signal
			});

			const rawBody = await response.text();
			return {
				ok: response.ok,
				status: response.status,
				rawBody
			};
		} finally {
			clearTimeout(timeout);
		}
	}

	async function requestJsonObjectFallback() {
		const jsonResponse = await requestZai({
			model: ZAI_MODEL,
			temperature: 0.2,
			max_tokens: ZAI_MAX_TOKENS,
			stream: false,
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: '너는 로또 데이터 전문 기자다. 출력은 반드시 JSON 객체 하나만 반환한다.' },
				{ role: 'user', content: jsonObjectPrompt }
			]
		});

		if (!jsonResponse.ok) {
			console.warn(`[news] AI json_object fallback failed status=${jsonResponse.status}`);
			return null;
		}

		const payload = tryParseJson(jsonResponse.rawBody);
		if (!payload) return null;

		const content = payload?.choices?.[0]?.message?.content;
		const parsed = tryParseJson(content);
		if (!parsed) return null;

		return sanitizeAiPayload(parsed, analysis.round, fallback);
	}

	try {
		const toolResponse = await requestZai({
				model: ZAI_MODEL,
				temperature: 0.2,
				max_tokens: ZAI_MAX_TOKENS,
				stream: false,
				messages: [
					{ role: 'system', content: '너는 로또 데이터 전문 기자다. 출력은 반드시 함수 호출로만 반환한다.' },
					{ role: 'user', content: prompt }
				],
				tools: [
					{
						type: 'function',
						function: {
							name: 'save_news_payload',
							description: 'Structured lotto news payload',
							parameters: {
								type: 'object',
								properties: {
									title: { type: 'string' },
									description: { type: 'string' },
									category: { type: 'string' },
									tags: {
										type: 'array',
										items: { type: 'string' }
									},
									lead: { type: 'string' },
									bullet_points: {
										type: 'array',
										items: { type: 'string' }
									},
									insight: { type: 'string' },
									caution_message: { type: 'string' }
								},
								required: [
									'title',
									'description',
									'category',
									'tags',
									'lead',
									'bullet_points',
									'insight',
									'caution_message'
								],
								additionalProperties: false
							}
						}
					}
				],
				tool_choice: {
					type: 'function',
					function: { name: 'save_news_payload' }
				}
		});

		if (!toolResponse.ok) {
			const errorPreview = toolResponse.rawBody.slice(0, 200).replace(/\s+/g, ' ').trim();
			console.warn(`[news] AI tool-call failed status=${toolResponse.status} body=${errorPreview}`);
			const jsonFallback = await requestJsonObjectFallback();
			return jsonFallback ?? fallback;
		}

		const payload = tryParseJson(toolResponse.rawBody);
		if (!payload) {
			const jsonFallback = await requestJsonObjectFallback();
			return jsonFallback ?? fallback;
		}

		const message = payload?.choices?.[0]?.message || {};
		const toolCall = Array.isArray(message.tool_calls)
			? message.tool_calls.find((item) => item?.function?.name === 'save_news_payload')
			: null;

		let parsed = toolCall ? tryParseJson(toolCall?.function?.arguments) : null;
		if (!parsed && typeof message.content === 'string') {
			parsed = tryParseJson(message.content);
		}

		if (!parsed) {
			const jsonFallback = await requestJsonObjectFallback();
			if (jsonFallback) {
				console.log(`[news] ai json_object payload applied round=${analysis.round}`);
				return jsonFallback;
			}
			return fallback;
		}

		const result = sanitizeAiPayload(parsed, analysis.round, fallback);
		console.log(`[news] ai tool-call payload applied round=${analysis.round}`);
		return result;
	} catch (error) {
		console.warn(`[news] AI fallback (error=${error?.name || 'unknown'})`);
		return fallback;
	}
}

function renderRegionRows(rows) {
	if (rows.length === 0) {
		return '<tr><td colspan="4">당첨점 데이터가 아직 집계되지 않았습니다.</td></tr>';
	}

	return rows
		.map((row) => `<tr><td>${row.region}</td><td>${row.first}</td><td>${row.second}</td><td>${row.total}</td></tr>`)
		.join('\n      ');
}

function renderAreaRows(rows) {
	if (rows.length === 0) {
		return '<tr><td colspan="4">주소 기반 집계 데이터가 아직 없습니다.</td></tr>';
	}

	return rows
		.map((row) => `<tr><td>${row.area}</td><td>${row.first}</td><td>${row.second}</td><td>${row.total}</td></tr>`)
		.join('\n      ');
}

function renderMdx(draw, analysis, payload) {
	const round = analysis.round;
	const bonus = safeInt(draw.bonus_number);
	const drawDate = formatDate(draw.draw_date);
	const thumbnail = `/og/news/lotto-${round}?title=${encodeURIComponent(payload.title)}&description=${encodeURIComponent(payload.description)}&round=${round}`;
	const bulletList = payload.bullet_points.map((value) => `- ${value}`).join('\n');
	const insightCompact = payload.insight.replace(/\s*\n+\s*/g, ' ').trim();

	return `---
title: ${yamlString(payload.title)}
date: ${yamlString(drawDate)}
category: ${yamlString(payload.category)}
tags: [${payload.tags.map((tag) => yamlString(tag)).join(', ')}]
description: ${yamlString(payload.description)}
author: ${yamlString('645.live 자동뉴스')}
thumbnail: ${yamlString(thumbnail)}
---

<script>
  import LottoNumbers from '$lib/components/news/LottoNumbers.svelte';
  import Card from '$lib/ui/Card.svelte';
  import Alert from '$lib/components/news/Alert.svelte';
  import Table from '$lib/components/news/Table.svelte';
  import Tabs from '$lib/components/news/Tabs.svelte';
  import TabsList from '$lib/components/news/TabsList.svelte';
  import TabsTrigger from '$lib/components/news/TabsTrigger.svelte';
  import TabsContent from '$lib/components/news/TabsContent.svelte';
</script>

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

${payload.lead}

## 당첨번호

<LottoNumbers numbers={[${analysis.numbers.join(', ')}]} bonus={${bonus}} round={${round}} />

## 특이점 분석

${bulletList}

${payload.insight}

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

## 주소 기반 당첨점 집중 구역 (상위)

<Table>
  <thead>
    <tr>
      <th>구역</th>
      <th>1등</th>
      <th>2등</th>
      <th>합계</th>
    </tr>
  </thead>
  <tbody>
      ${renderAreaRows(analysis.areaRows)}
  </tbody>
</Table>

<Tabs defaultValue="insight">
  <TabsList>
    <TabsTrigger value="insight">요약 인사이트</TabsTrigger>
    <TabsTrigger value="stores">당첨점 규모</TabsTrigger>
  </TabsList>
  <TabsContent value="insight">
    <p>${insightCompact}</p>
  </TabsContent>
  <TabsContent value="stores">
    <p>제${round}회는 총 ${analysis.storesCount}개 당첨점이 집계되었습니다. 집계 데이터는 이후 정정될 수 있습니다.</p>
  </TabsContent>
</Tabs>

<Alert type="info">
  ${payload.caution_message}
</Alert>
`;
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
		if (!FORCE && existingRounds.has(round)) continue;

		const stores = await getWinningStores(round);
		const analysis = analyzeRound(draw, stores);
		const fallback = fallbackPayload(draw, analysis);
		const payload = await generatePayloadWithAi(draw, stores, analysis, fallback);
		const mdx = renderMdx(draw, analysis, payload);
		const changed = await writeNewsFile(round, mdx);
		if (!changed) continue;

		if (existingRounds.has(round)) updatedCount += 1;
		else generatedCount += 1;

		console.log(`[news] generated lotto-${round}.mdx (stores=${stores.length}, ai=${USE_AI && Boolean(ZAI_API_KEY)})`);
	}

	console.log(`[news] done generated=${generatedCount} updated=${updatedCount}`);
}

main().catch((error) => {
	console.error('[news] failed:', error);
	process.exitCode = 1;
});
