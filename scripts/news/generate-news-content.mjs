import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const NEWS_DIR = path.join(REPO_ROOT, "pages/www/src/content/news");
const TRAILBASE_URL = (
	process.env.TRAILBASE_URL || "https://trail.645.live"
).replace(/\/+$/, "");
const LOOKBACK_ROUNDS = Number.parseInt(
	process.env.LOOKBACK_ROUNDS || "30",
	10,
);
const FORCE = parseBool(process.env.FORCE, false);
const TARGET_ROUND = process.env.ROUND
	? Number.parseInt(process.env.ROUND, 10)
	: null;
const MAX_GENERATE_ROUNDS = Number.parseInt(
	process.env.MAX_GENERATE_ROUNDS || "0",
	10,
);

const USE_AI = parseBool(process.env.USE_AI, true);
const ZAI_API_KEY = process.env.ZAI_API_KEY || "";
const ZAI_BASE_URL = (
	process.env.ZAI_BASE_URL || "https://api.z.ai/api/coding/paas/v4"
).replace(/\/+$/, "");
const ZAI_MODEL = process.env.ZAI_MODEL || "glm-5";
const ZAI_TIMEOUT_MS = Number.parseInt(
	process.env.ZAI_TIMEOUT_MS || "120000",
	10,
);
const ZAI_MAX_TOKENS = Number.parseInt(
	process.env.ZAI_MAX_TOKENS || "4000",
	10,
);
const FETCH_TIMEOUT_MS = Number.parseInt(
	process.env.FETCH_TIMEOUT_MS || "15000",
	10,
);
const FETCH_RETRY_COUNT = Number.parseInt(
	process.env.FETCH_RETRY_COUNT || "3",
	10,
);
const FETCH_RETRY_DELAY_MS = Number.parseInt(
	process.env.FETCH_RETRY_DELAY_MS || "1200",
	10,
);
const OFFICIAL_LATEST_ROUNDS_URL =
	"https://www.dhlottery.co.kr/lt645/selectLtEpsdInfo.do";
const OFFICIAL_DRAW_URL =
	"https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do";
const OFFICIAL_WINNING_STORES_URL =
	"https://www.dhlottery.co.kr/wnprchsplcsrch/selectLtWnShp.do";

function parseBool(value, fallback = false) {
	if (value === undefined || value === null || value === "") return fallback;
	if (typeof value === "boolean") return value;
	return /^(1|true|yes|on)$/i.test(String(value));
}

function safeInt(value, fallback = 0) {
	const number = Number.parseInt(String(value ?? ""), 10);
	return Number.isFinite(number) ? number : fallback;
}

function safeNumber(value, fallback = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function yamlString(value) {
	return `"${String(value ?? "")
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, " ")}"`;
}

function formatDate(value) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	const yyyy = date.getUTCFullYear();
	const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(date.getUTCDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function normalizeOfficialDate(value) {
	const text = String(value ?? "").trim();
	if (/^\d{8}$/.test(text)) {
		return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
	}
	return formatDate(text);
}

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function formatWon(value) {
	return `${Math.round(safeNumber(value)).toLocaleString("ko-KR")}원`;
}

function toEok(value) {
	const eok = safeNumber(value) / 100_000_000;
	if (eok >= 100) {
		return `${Math.round(eok).toLocaleString("ko-KR")}억`;
	}
	return `${eok.toFixed(1).replace(/\.0$/, "")}억`;
}

function extractRegion(address) {
	const normalized = String(address ?? "").trim();
	if (!normalized) return "기타";

	if (/dhlottery|https?:\/\/|www\.|\.co\.kr|\.com/i.test(normalized)) {
		return "온라인";
	}

	const token = normalized.split(/\s+/)[0]?.replace(/[()]/g, "") || "";
	if (!token) return "기타";

	const aliases = new Map([
		["서울특별시", "서울"],
		["서울시", "서울"],
		["부산광역시", "부산"],
		["부산시", "부산"],
		["대구광역시", "대구"],
		["대구시", "대구"],
		["인천광역시", "인천"],
		["인천시", "인천"],
		["광주광역시", "광주"],
		["광주시", "광주"],
		["대전광역시", "대전"],
		["대전시", "대전"],
		["울산광역시", "울산"],
		["울산시", "울산"],
		["세종특별자치시", "세종"],
		["경기도", "경기"],
		["강원도", "강원"],
		["강원특별자치도", "강원"],
		["충청북도", "충북"],
		["충청남도", "충남"],
		["전라북도", "전북"],
		["전북특별자치도", "전북"],
		["전라남도", "전남"],
		["경상북도", "경북"],
		["경상남도", "경남"],
		["제주특별자치도", "제주"],
		["제주도", "제주"],
	]);

	if (aliases.has(token)) {
		return aliases.get(token);
	}

	if (/^[가-힣]{2,4}$/.test(token)) {
		return token;
	}

	return "기타";
}

function extractArea(address) {
	const normalized = String(address ?? "").trim();
	if (!normalized) return "기타";

	if (/dhlottery|https?:\/\/|www\.|\.co\.kr|\.com/i.test(normalized)) {
		return "온라인";
	}

	const parts = normalized.split(/\s+/).filter(Boolean);
	const region = extractRegion(normalized);
	const district =
		parts[1]?.replace(/[0-9].*$/, "")?.replace(/[()]/g, "") || "";

	if (region === "온라인") return "온라인";
	if (!district) return region;
	if (/^[가-힣]{1,8}$/.test(district)) {
		return `${region} ${district}`;
	}
	return region;
}

function getNumbers(draw) {
	return [1, 2, 3, 4, 5, 6].map((index) =>
		safeInt(draw[`draw_number_${index}`]),
	);
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
		if (store.win_type === "1등") {
			current.first += 1;
			areaCurrent.first += 1;
			firstStoreCount += 1;
		}
		if (store.win_type === "2등") {
			current.second += 1;
			areaCurrent.second += 1;
			secondStoreCount += 1;
		}
		if (store.selection_type === "자동") autoCount += 1;
		if (store.selection_type === "수동") manualCount += 1;
		if (store.selection_type === "반자동") semiCount += 1;
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
	const dominantRatio = dominantRegion
		? dominantRegion.total / Math.max(stores.length, 1)
		: 0;

	const anomalies = [];
	if (winnerCount === 0) anomalies.push("rollover");
	if (winnerCount === 1) anomalies.push("single_winner");
	if (winnerCount > 1 && winnerCount <= 3) anomalies.push("few_winners");
	if (winnerCount >= 20) anomalies.push("many_winners");
	if (winnerAmount >= 3_000_000_000) anomalies.push("high_payout");
	if (consecutivePairs >= 2) anomalies.push("consecutive_numbers");
	if (oddCount === 6 || evenCount === 6) anomalies.push("all_odd_even");
	if (highCount >= 3 || lowCount >= 3)
		anomalies.push("number_band_concentration");
	if (dominantRegion && dominantRegion.total >= 5 && dominantRatio >= 0.28)
		anomalies.push("region_concentration");
	if (totalSales >= 120_000_000_000) anomalies.push("high_sales");

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
		anomalies,
	};
}

function formatRatio(value) {
	return `${(safeNumber(value) * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

function buildPreviousRoundContext(analysis, previousDraw) {
	if (!previousDraw) return null;

	const previousRound = safeInt(previousDraw.round);
	if (!previousRound) return null;

	const previousNumbers = getNumbers(previousDraw).sort((left, right) => left - right);
	const repeatedNumbers = analysis.numbers.filter((number) =>
		previousNumbers.includes(number),
	);
	const previousWinnerCount = safeInt(previousDraw.first_prize_winner_count);
	const previousWinnerAmount = safeNumber(previousDraw.first_prize_amount);
	const previousSales = safeNumber(previousDraw.total_sell_amount);

	return {
		previousRound,
		previousNumbers,
		repeatedNumbers,
		previousWinnerCount,
		previousWinnerAmount,
		previousSales,
		winnerDelta: analysis.winnerCount - previousWinnerCount,
		amountDelta: analysis.winnerAmount - previousWinnerAmount,
		salesDelta: analysis.totalSales - previousSales,
	};
}

function getFallbackVariant(analysis) {
	if (analysis.anomalies.includes("rollover")) return "rollover";
	if (analysis.anomalies.includes("single_winner")) return "single_winner";
	if (
		analysis.anomalies.includes("few_winners") &&
		analysis.anomalies.includes("high_payout")
	) {
		return "few_high_payout";
	}
	if (
		analysis.anomalies.includes("region_concentration") &&
		analysis.dominantRegion &&
		analysis.dominantRatio >= 0.35
	) {
		return "region_concentration";
	}
	if (
		analysis.consecutivePairs > 0 ||
		analysis.anomalies.includes("all_odd_even") ||
		analysis.anomalies.includes("number_band_concentration")
	) {
		return "pattern";
	}
	return "general";
}

function buildPatternSummary(analysis) {
	const segments = [];

	if (analysis.consecutivePairs > 0) {
		segments.push(
			analysis.consecutivePairs >= 2
				? `연속번호 ${analysis.consecutivePairs}쌍`
				: "연속번호 1쌍",
		);
	}

	if (analysis.anomalies.includes("all_odd_even")) {
		segments.push(analysis.oddCount === 6 ? "홀수 몰림" : "짝수 몰림");
	}

	if (analysis.lowCount >= 3) {
		segments.push(`저번호 ${analysis.lowCount}개`);
	}

	if (analysis.highCount >= 3) {
		segments.push(`고번호 ${analysis.highCount}개`);
	}

	if (segments.length === 0) {
		segments.push(`홀짝 ${analysis.oddCount}:${analysis.evenCount}`);
	}

	return segments.join(", ");
}

function buildSelectionSummary(analysis) {
	const parts = [];
	if (analysis.autoCount > 0) parts.push(`자동 ${analysis.autoCount}곳`);
	if (analysis.manualCount > 0) parts.push(`수동 ${analysis.manualCount}곳`);
	if (analysis.semiCount > 0) parts.push(`반자동 ${analysis.semiCount}곳`);
	return parts.join(", ");
}

function buildPreviousRoundSentence(previous) {
	if (!previous) return "";

	const repeatText =
		previous.repeatedNumbers.length > 0
			? `직전 ${previous.previousRound}회와 겹친 번호는 ${previous.repeatedNumbers.join(", ")} ${previous.repeatedNumbers.length}개`
			: `직전 ${previous.previousRound}회와 겹친 번호는 없었고`;
	const winnerDeltaText =
		previous.winnerDelta === 0
			? "1등 당첨자 수는 직전 회차와 같았습니다."
			: previous.winnerDelta > 0
				? `1등 당첨자는 직전보다 ${Math.abs(previous.winnerDelta)}명 늘었습니다.`
				: `1등 당첨자는 직전보다 ${Math.abs(previous.winnerDelta)}명 줄었습니다.`;

	return `${repeatText}, ${winnerDeltaText}`.replace(/\s+,/g, ",");
}

function pickTitle(analysis, variant) {
	const round = analysis.round;
	const joinedNumbers = analysis.numbers.join(", ");

	if (variant === "rollover") {
		const expected =
			analysis.accumulatedAmount > 0
				? toEok(analysis.accumulatedAmount)
				: "고액";
		return {
			title: `제${round}회 로또 1등 없음, 다음 회차 ${expected} 규모 이월 가능성`,
			description: `제${round}회 로또는 1등 당첨자가 나오지 않았습니다. 당첨번호와 지역별 당첨점 분포를 정리했습니다.`,
			angle:
				"이번 회차는 1등 공석으로 종료되며 다음 회차 관심도가 크게 높아질 전망입니다.",
		};
	}

	if (variant === "single_winner") {
		return {
			title: `제${round}회 로또 1등 1명 단독 당첨, 수령 예상 ${toEok(analysis.winnerAmount)}`,
			description: `제${round}회 로또에서 1등 단독 당첨이 나왔습니다. 번호 패턴과 당첨점 데이터를 함께 분석합니다.`,
			angle:
				"1등 당첨자가 1명만 나온 드문 회차로 당첨점과 번호 조합에 관심이 집중됐습니다.",
		};
	}

	if (variant === "few_high_payout") {
		return {
			title: `제${round}회 로또 소수 당첨, 1인당 ${toEok(analysis.winnerAmount)} 고액 수령`,
			description: `제${round}회 로또는 소수의 1등 당첨자에게 고액이 배분됐습니다. 회차 특이점을 빠르게 확인하세요.`,
			angle: "당첨자 수가 적어 1인당 수령액이 크게 상승한 회차입니다.",
		};
	}

	if (variant === "pattern") {
		const patternSummary = buildPatternSummary(analysis);
		return {
			title: `제${round}회 로또 패턴 포착, ${patternSummary}`,
			description: `제${round}회 로또 번호 분포에서 눈에 띄는 패턴이 확인됐습니다. 당첨점 흐름과 함께 분석합니다.`,
			angle: `번호 조합에서 ${patternSummary}이 확인된 회차로 통계 기반 비교 가치가 큽니다.`,
		};
	}

	if (variant === "region_concentration" && analysis.dominantRegion) {
		return {
			title: `제${round}회 로또 ${analysis.dominantRegion.region} 당첨점 집중, 지역 편중 주목`,
			description: `제${round}회 당첨점이 특정 지역에 집중됐습니다. 1등/2등 판매점 분포를 확인해보세요.`,
			angle: `${analysis.dominantRegion.region} 지역에 당첨점이 몰린 회차입니다.`,
		};
	}

	return {
		title: `제${round}회 로또 당첨번호 발표: ${joinedNumbers}`,
		description: `제${round}회 로또 당첨번호와 1등 당첨금, 당첨점 분포를 데이터 기반으로 요약했습니다.`,
		angle: "이번 회차 핵심 숫자와 당첨점 분포를 한 번에 확인할 수 있습니다.",
	};
}

const STATS_LINK_CATALOG = {
	stats_main: {
		icon: "📊",
		label: "전체 통계 메인",
		href: () => "/stats",
	},
	winning_stores: {
		icon: "🏪",
		label: "회차별 당첨점 조회",
		href: (round) => `/winning-stores?round=${round}`,
	},
	numbers: {
		icon: "🔢",
		label: "번호별 통계",
		href: () => "/stats/numbers",
	},
	odd_even: {
		icon: "⚖️",
		label: "홀짝 분석",
		href: () => "/stats/odd-even",
	},
	high_low: {
		icon: "📈",
		label: "고저번대 통계",
		href: () => "/stats/high-low",
	},
	sections: {
		icon: "🧩",
		label: "구간별 분석",
		href: () => "/stats/sections",
	},
	pairs: {
		icon: "👥",
		label: "번호 쌍 통계",
		href: () => "/stats/pairs",
	},
	repeat: {
		icon: "🔁",
		label: "연속 중복 통계",
		href: () => "/stats/repeat",
	},
	colors: {
		icon: "🎨",
		label: "색깔별 통계",
		href: () => "/stats/colors",
	},
	unit_digit: {
		icon: "🔟",
		label: "끝수 분석",
		href: () => "/stats/unit-digit",
	},
	ac: {
		icon: "🧮",
		label: "AC값 통계",
		href: () => "/stats/ac",
	},
};

function normalizeLine(value, fallback) {
	const text = String(value ?? "")
		.replace(/\s+/g, " ")
		.trim();
	return text || fallback;
}

function escapeMdxInline(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/{/g, "&#123;")
		.replace(/}/g, "&#125;");
}

function sanitizeMdxInline(value, fallback = "") {
	return escapeMdxInline(normalizeLine(value, fallback));
}

function sanitizeMdxBlock(value, fallback = "") {
	const block = normalizeBlock(value, fallback);
	return escapeMdxInline(block).replace(/\n{3,}/g, "\n\n");
}

function normalizeBlock(value, fallback) {
	const raw = String(value ?? "")
		.replace(/\r/g, "")
		.trim();
	if (!raw) return fallback;
	return raw.replace(/\n{3,}/g, "\n\n");
}

function normalizeTags(tags, round) {
	if (!Array.isArray(tags)) {
		return ["로또", `${round}회`, "당첨번호", "당첨점"];
	}

	const unique = [];
	for (const tag of tags) {
		const value = String(tag ?? "").trim();
		if (!value || unique.includes(value)) continue;
		unique.push(value);
		if (unique.length >= 5) break;
	}

	if (unique.length === 0) {
		return ["로또", `${round}회`, "당첨번호", "당첨점"];
	}

	return unique;
}

function normalizeRecommendedStats(recommendedStats, round) {
	if (!Array.isArray(recommendedStats)) return [];

	const result = [];
	for (const item of recommendedStats) {
		const key =
			typeof item === "string"
				? item.trim()
				: typeof item?.key === "string"
					? item.key.trim()
					: "";
		if (!key) continue;

		const catalog = STATS_LINK_CATALOG[key];
		if (!catalog) continue;
		if (result.some((entry) => entry.key === key)) continue;

		const reason =
			typeof item === "object" && item ? normalizeLine(item.reason, "") : "";

		result.push({
			key,
			icon: catalog.icon,
			label: catalog.label,
			href: catalog.href(round),
			reason,
		});
		if (result.length >= 6) break;
	}

	return result;
}

function buildFallbackTags(analysis, variant) {
	const tags = ["로또", `${analysis.round}회`, "당첨번호", "당첨점"];
	if (variant === "rollover") tags.push("이월");
	if (variant === "single_winner") tags.push("단독당첨");
	if (variant === "few_high_payout") tags.push("고액당첨");
	if (variant === "pattern") tags.push("번호패턴");
	if (variant === "region_concentration") tags.push("지역분석");
	return tags.slice(0, 5);
}

function buildFallbackLead(draw, analysis, variant, previous) {
	const firstParagraph = `제${analysis.round}회 로또 추첨 결과 1등 당첨자는 ${analysis.winnerCount}명으로 집계됐고, 1인당 당첨금은 ${formatWon(analysis.winnerAmount)}입니다. 당첨번호는 ${analysis.numbers.join(", ")}이며 보너스번호는 ${safeInt(draw.bonus_number)}입니다.`;

	const sharedSecondParagraph = `이번 회차 당첨점은 총 ${analysis.storesCount}개로 집계됐고 1등 판매점은 ${analysis.firstStoreCount}개입니다. ${analysis.dominantRegion ? `${analysis.dominantRegion.region} 지역이 전체 당첨점의 ${formatRatio(analysis.dominantRatio)}를 차지하며 가장 큰 비중을 보였습니다.` : "지역별 분포는 수도권과 지방권이 비교적 고르게 나뉘었습니다."}`;

	switch (variant) {
		case "rollover":
			return [
				`제${analysis.round}회 로또는 1등 당첨자가 나오지 않아 다음 회차 이월 가능성이 커졌습니다. 누적 당첨금 기준으로 보면 다음 회차 기대 규모는 ${toEok(analysis.accumulatedAmount || analysis.winnerAmount)} 수준까지 거론될 수 있습니다.`,
				sharedSecondParagraph,
				buildPreviousRoundSentence(previous),
			]
				.filter(Boolean)
				.join("\n\n");
		case "single_winner":
			return [
				`제${analysis.round}회 로또는 1등 당첨자가 단 1명만 나오며 이번 회차 전체 관심이 단독 당첨자에게 집중됐습니다. 1인 수령액이 ${toEok(analysis.winnerAmount)} 수준까지 올라가면서 최근 회차 가운데도 눈에 띄는 고액 당첨 사례로 기록됐습니다.`,
				`${sharedSecondParagraph} ${buildSelectionSummary(analysis) ? `선택 방식 기준으로는 ${buildSelectionSummary(analysis)} 흐름이 확인됩니다.` : ""}`.trim(),
				buildPreviousRoundSentence(previous),
			]
				.filter(Boolean)
				.join("\n\n");
		case "few_high_payout":
			return [
				`제${analysis.round}회 로또는 1등 당첨자가 ${analysis.winnerCount}명에 그치며 1인당 당첨금이 ${toEok(analysis.winnerAmount)}까지 상승했습니다. 소수 당첨 구조가 만들어지면서 당첨번호 자체보다 고액 수령 배경에 더 큰 관심이 모이는 회차입니다.`,
				`${sharedSecondParagraph} 총 판매액은 ${formatWon(analysis.totalSales)}로 집계돼 대기 수요가 충분했던 회차였음을 보여줍니다.`,
				buildPreviousRoundSentence(previous),
			]
				.filter(Boolean)
				.join("\n\n");
		case "pattern":
			return [
				`${firstParagraph} 이번 조합에서는 ${buildPatternSummary(analysis)}이 한꺼번에 나타나며 일반적인 무작위 분포와는 다른 인상을 남겼습니다.`,
				`${sharedSecondParagraph} 홀짝 비율은 ${analysis.oddCount}:${analysis.evenCount}, 저번호/고번호 분포는 ${analysis.lowCount}:${analysis.highCount}로 정리됩니다.`,
				buildPreviousRoundSentence(previous),
			]
				.filter(Boolean)
				.join("\n\n");
		case "region_concentration":
			return [
				`${firstParagraph} 특히 ${analysis.dominantRegion.region} 지역이 당첨점 집계에서 두드러진 비중을 차지하며 이번 회차를 지역 분포 측면에서도 눈에 띄는 회차로 만들었습니다.`,
				`${sharedSecondParagraph} 상위 주소 기준으로는 ${analysis.areaRows[0]?.area || "주요 상권"}가 가장 먼저 확인됩니다.`,
				buildPreviousRoundSentence(previous),
			]
				.filter(Boolean)
				.join("\n\n");
		default:
			return [
				firstParagraph,
				`${sharedSecondParagraph} 번호 구성은 홀짝 ${analysis.oddCount}:${analysis.evenCount}, 저번호/고번호 ${analysis.lowCount}:${analysis.highCount}로 정리됩니다.`,
				buildPreviousRoundSentence(previous),
			]
				.filter(Boolean)
				.join("\n\n");
	}
}

function buildFallbackBulletPoints(draw, analysis, variant, previous) {
	const points = [
		analysis.winnerCount === 0
			? `1등 당첨자는 나오지 않았고, 누적 당첨금은 ${formatWon(analysis.accumulatedAmount)} 수준으로 이월됐습니다.`
			: `1등 당첨자 수는 ${analysis.winnerCount}명이며 1인당 당첨금은 ${formatWon(analysis.winnerAmount)}입니다.`,
		`당첨번호는 ${analysis.numbers.join(", ")}이고 보너스번호는 ${safeInt(draw.bonus_number)}입니다.`,
		`홀수 ${analysis.oddCount}개, 짝수 ${analysis.evenCount}개로 구성됐으며 저번호(1~10) ${analysis.lowCount}개, 고번호(40~45) ${analysis.highCount}개가 출현했습니다.`,
		`당첨점은 총 ${analysis.storesCount}개 집계됐고 1등 판매점은 ${analysis.firstStoreCount}개, 2등 판매점은 ${analysis.secondStoreCount}개입니다.`,
	];

	if (buildSelectionSummary(analysis)) {
		points.push(`1등 판매점 선택 방식 기준으로는 ${buildSelectionSummary(analysis)} 분포가 확인됩니다.`);
	}

	if (variant === "pattern") {
		points.push(`번호 패턴 기준으로는 ${buildPatternSummary(analysis)}이 이번 회차에서 동시에 관측됐습니다.`);
	}

	if (analysis.dominantRegion) {
		points.push(
			`${analysis.dominantRegion.region} 지역이 전체 당첨점의 ${formatRatio(analysis.dominantRatio)}를 차지하며 가장 큰 비중을 보였습니다.`,
		);
	}

	if (previous) {
		points.push(buildPreviousRoundSentence(previous));
	}

	return points.slice(0, 6);
}

function buildFallbackInsight(analysis, variant, previous) {
	const paragraphs = [];

	switch (variant) {
		case "single_winner":
			paragraphs.push(
				`단독 1등 회차는 구매자 입장에서 체감상 가장 강한 회차입니다. 이번처럼 1명에게 당첨금이 집중되면 번호 조합 자체보다 어떤 판매점과 어떤 선택 방식이 1등을 만들었는지에 시선이 쏠리게 됩니다. 같은 데이터라도 일반 회차보다 훨씬 강한 뉴스 가치가 생기는 이유입니다.`,
			);
			break;
		case "few_high_payout":
			paragraphs.push(
				`소수 당첨과 고액 수령이 동시에 나타난 회차는 실제 체감 반응이 강합니다. 판매액이 적지 않았음에도 당첨자 수가 적게 나온 만큼, 많은 조합이 선택된 범용 패턴과 실제 당첨 조합 사이의 간극을 다시 확인하게 만드는 회차라고 볼 수 있습니다.`,
			);
			break;
		case "pattern":
			paragraphs.push(
				`이번 회차에서 눈에 띈 부분은 번호 조합의 배열입니다. 연속번호, 홀짝, 번호대 분포처럼 많은 이용자가 조합 작성 때 의식하는 축이 동시에 드러나면 통계 페이지 간 교차 확인 가치가 커집니다. 특히 연속번호가 포함된 회차는 체감상 “피해야 할 조합” 인식과 실제 결과가 어긋나는 사례로 자주 회자됩니다.`,
			);
			break;
		case "region_concentration":
			paragraphs.push(
				`지역 집중 회차는 번호 패턴보다 판매점 분포가 더 강한 관심 요소가 됩니다. 특정 광역권이나 생활권에서 당첨점이 몰려 보일 때는 실제로 판매량이 높았던 상권인지, 우연한 분포인지, 자동/수동 비중이 어떻게 갈렸는지를 함께 봐야 해석이 가능합니다.`,
			);
			break;
		case "rollover":
			paragraphs.push(
				`이월 회차는 당첨자보다 다음 추첨으로 관심이 이동합니다. 이번 결과는 번호 자체의 평가보다 다음 회차 기대금이 어느 정도 커졌는지, 판매액이 어떻게 따라붙는지가 더 중요한 관전 포인트가 됩니다.`,
			);
			break;
		default:
			paragraphs.push(
				`뚜렷한 이상치가 없는 회차일수록 오히려 기본 분포를 차분히 볼 가치가 있습니다. 당첨자 수, 판매점 수, 홀짝과 번호대 균형이 평균 범위에 가까우면 장기 통계에서 이번 회차가 어디쯤에 놓이는지 비교하기 좋은 기준점 역할을 하기 때문입니다.`,
			);
			break;
	}

	paragraphs.push(
		analysis.areaRows.length > 0
			? `주소 기반 집계 상위에는 ${analysis.areaRows[0].area} 항목이 먼저 나타납니다. 다만 단일 구역 집계는 판매점 밀도, 생활권 규모, 온라인 판매 포함 여부에 따라 체감이 달라질 수 있어 상위 지역과 주소권역을 함께 비교하는 접근이 필요합니다.`
			: "이번 회차는 주소 기반 당첨점 집계가 아직 제한적이어서 지역 분포보다 번호 통계 중심 해석이 더 적절합니다.",
	);

	if (previous) {
		paragraphs.push(
			previous.repeatedNumbers.length > 0
				? `직전 ${previous.previousRound}회와의 연결성도 확인됩니다. 겹친 번호 ${previous.repeatedNumbers.join(", ")}는 연속 회차 간 반복 출현을 추적할 때 참고 지점이 되며, 단순한 직감보다 실제 반복 빈도를 통계 페이지에서 다시 검증해볼 수 있습니다.`
				: `직전 ${previous.previousRound}회와 번호 중복이 없었다는 점도 참고할 만합니다. 연속 회차 사이에 겹치는 번호가 적거나 없을 때는 개별 번호보다 조합 구조와 판매점 분포 차이를 함께 보는 편이 해석에 도움이 됩니다.`,
		);
	}

	return paragraphs.join("\n\n");
}

function fallbackPayload(draw, analysis, previousDraw) {
	const variant = getFallbackVariant(analysis);
	const previous = buildPreviousRoundContext(analysis, previousDraw);
	const titleData = pickTitle(analysis, variant);

	return {
		title: titleData.title,
		description: titleData.description,
		category: "로또분석",
		tags: buildFallbackTags(analysis, variant),
		lead: buildFallbackLead(draw, analysis, variant, previous),
		bullet_points: buildFallbackBulletPoints(draw, analysis, variant, previous),
		insight: buildFallbackInsight(analysis, variant, previous),
		caution_message:
			"복권은 건전한 오락으로 즐겨주세요. 과도한 구매는 경제적 부담을 유발할 수 있습니다.",
		recommended_stats: buildRecommendedStatsLinks(analysis, variant),
	};
}

function tryParseJson(text) {
	if (typeof text !== "string") return null;
	const trimmed = text.trim();
	if (!trimmed) return null;

	try {
		return JSON.parse(trimmed);
	} catch {
		// ignore
	}

	const firstBrace = trimmed.indexOf("{");
	const lastBrace = trimmed.lastIndexOf("}");
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
	if (!rawPayload || typeof rawPayload !== "object") {
		return fallback;
	}

	const bulletPoints = Array.isArray(rawPayload.bullet_points)
		? rawPayload.bullet_points
				.map((value) => normalizeLine(value, ""))
				.filter(Boolean)
				.slice(0, 6)
		: [];

	return {
		title: normalizeLine(rawPayload.title, fallback.title),
		description: normalizeLine(rawPayload.description, fallback.description),
		category: normalizeLine(rawPayload.category, fallback.category),
		tags: normalizeTags(rawPayload.tags, round),
		lead: normalizeBlock(rawPayload.lead, fallback.lead),
		bullet_points:
			bulletPoints.length > 0 ? bulletPoints : fallback.bullet_points,
		insight: normalizeBlock(rawPayload.insight, fallback.insight),
		caution_message: normalizeLine(
			rawPayload.caution_message,
			fallback.caution_message,
		),
		recommended_stats: normalizeRecommendedStats(
			rawPayload.recommended_stats,
			round,
		),
	};
}

async function fetchJson(url) {
	const maxAttempts =
		Number.isFinite(FETCH_RETRY_COUNT) && FETCH_RETRY_COUNT > 0
			? FETCH_RETRY_COUNT
			: 1;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		try {
			const response = await fetch(url, {
				headers: { accept: "application/json" },
				signal: controller.signal,
			});
			const body = await response.text();

			if (!response.ok) {
				const retryable = response.status >= 500 || response.status === 429;
				if (retryable && attempt < maxAttempts) {
					const delayMs = FETCH_RETRY_DELAY_MS * attempt;
					console.warn(
						`[news] fetch retry ${attempt}/${maxAttempts} status=${response.status} url=${url}`,
					);
					await sleep(delayMs);
					continue;
				}
				throw new Error(
					`Request failed (${response.status}): ${url}\n${body.slice(0, 200)}`,
				);
			}

			try {
				return JSON.parse(body);
			} catch {
				throw new Error(`Invalid JSON from ${url}\n${body.slice(0, 200)}`);
			}
		} catch (error) {
			const shouldRetry =
				attempt < maxAttempts &&
				(error?.name === "AbortError" ||
					/fetch/i.test(String(error?.message || "")));
			if (shouldRetry) {
				const delayMs = FETCH_RETRY_DELAY_MS * attempt;
				console.warn(
					`[news] fetch retry ${attempt}/${maxAttempts} reason=${error?.name || "error"} url=${url}`,
				);
				await sleep(delayMs);
				continue;
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	throw new Error(`Request failed after retries: ${url}`);
}

async function fetchRecords(table, params = {}) {
	const url = new URL(`${TRAILBASE_URL}/api/records/v1/${table}`);
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue;
		url.searchParams.set(key, String(value));
	}

	const payload = await fetchJson(url.toString());
	if (Array.isArray(payload?.records)) return payload.records;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	if (Array.isArray(payload)) return payload;
	throw new Error(
		`Unexpected payload for ${table}: keys=${Object.keys(payload || {}).join(",")}`,
	);
}

async function fetchOfficialLatestRounds(limit = LOOKBACK_ROUNDS) {
	const payload = await fetchJson(OFFICIAL_LATEST_ROUNDS_URL);
	const list = Array.isArray(payload?.data?.list) ? payload.data.list : [];
	return list
		.map((item) => safeInt(item.ltEpsd))
		.filter((round) => round > 0)
		.sort((left, right) => right - left)
		.slice(0, Math.max(limit, 1));
}

async function fetchOfficialDraw(round) {
	const url = new URL(OFFICIAL_DRAW_URL);
	url.searchParams.set("srchDir", "center");
	url.searchParams.set("srchLtEpsd", String(round));
	url.searchParams.set("_", String(Date.now()));

	const payload = await fetchJson(url.toString());
	const list = Array.isArray(payload?.data?.list) ? payload.data.list : [];
	const item = list.find((candidate) => safeInt(candidate.ltEpsd) === round);
	if (!item) return null;

	const numbers = [1, 2, 3, 4, 5, 6]
		.map((index) => safeInt(item[`tm${index}WnNo`]))
		.filter((number) => number > 0)
		.sort((left, right) => left - right);

	if (numbers.length !== 6) {
		throw new Error(`Official draw payload missing numbers for round=${round}`);
	}

	return {
		round,
		draw_date: normalizeOfficialDate(item.ltRflYmd),
		total_sell_amount: safeNumber(item.rlvtEpsdSumNtslAmt),
		first_prize_amount: safeNumber(item.rnk1WnAmt),
		first_prize_winner_count: safeInt(item.rnk1WnNope),
		first_prize_accumulated_amount: safeNumber(item.rnk1SumWnAmt),
		draw_number_1: numbers[0],
		draw_number_2: numbers[1],
		draw_number_3: numbers[2],
		draw_number_4: numbers[3],
		draw_number_5: numbers[4],
		draw_number_6: numbers[5],
		bonus_number: safeInt(item.bnsWnNo),
	};
}

async function fetchOfficialWinningStores(round) {
	const url = new URL(OFFICIAL_WINNING_STORES_URL);
	url.searchParams.set("srchWnShpRnk", "all");
	url.searchParams.set("srchLtEpsd", String(round));
	url.searchParams.set("srchShpLctn", "");
	url.searchParams.set("_", String(Date.now()));

	const payload = await fetchJson(url.toString());
	const list = Array.isArray(payload?.data?.list) ? payload.data.list : [];

	return list
		.map((item) => {
			const rank = safeInt(item.wnShpRnk);
			const win_type = rank === 1 ? "1등" : rank === 2 ? "2등" : "";
			const store_name = String(item.shpNm ?? "")
				.replace(/\s+/g, " ")
				.trim();
			const address = String(item.shpAddr ?? "")
				.replace(/\s+/g, " ")
				.trim();
			const selectionText = String(item.atmtPsvYnTxt ?? "").trim();
			const selection_type = selectionText.includes("반자동")
				? "반자동"
				: selectionText.includes("자동")
					? "자동"
					: selectionText.includes("수동")
						? "수동"
						: undefined;

			if (!win_type || !store_name || !address) return null;
			return {
				round,
				store_name,
				address,
				win_type,
				selection_type,
			};
		})
		.filter(Boolean);
}

async function getDrawRows() {
	if (TARGET_ROUND && Number.isFinite(TARGET_ROUND)) {
		const drawRows = await fetchRecords("lotto_draw_results", {
			"filter[round][$eq]": TARGET_ROUND,
			limit: 1,
		}).catch(() => []);
		if (drawRows.length > 0) return drawRows;

		const officialRow = await fetchOfficialDraw(TARGET_ROUND).catch((error) => {
			console.warn(
				`[news] official draw fallback failed round=${TARGET_ROUND} reason=${error?.message || error}`,
			);
			return null;
		});
		return officialRow ? [officialRow] : [];
	}

	const trailRows = await fetchRecords("lotto_draw_results", {
		order: "-round",
		limit: LOOKBACK_ROUNDS,
	}).catch((error) => {
		console.warn(
			`[news] trail draw fetch failed. continue with official fallback. reason=${error?.message || error}`,
		);
		return [];
	});

	const rowsByRound = new Map(
		trailRows
			.map((row) => [safeInt(row.round), row])
			.filter(([round]) => round > 0),
	);

	const officialRounds = await fetchOfficialLatestRounds().catch((error) => {
		console.warn(
			`[news] official latest rounds fetch failed reason=${error?.message || error}`,
		);
		return [];
	});

	for (const round of officialRounds) {
		if (rowsByRound.has(round)) continue;
		const officialRow = await fetchOfficialDraw(round).catch((error) => {
			console.warn(
				`[news] official draw fallback failed round=${round} reason=${error?.message || error}`,
			);
			return null;
		});
		if (!officialRow) continue;
		rowsByRound.set(round, officialRow);
		console.log(`[news] official draw fallback applied round=${round}`);
	}

	return [...rowsByRound.values()];
}

async function getWinningStores(round) {
	try {
		const stores = await fetchRecords("lotto_winning_stores", {
			"filter[round][$eq]": round,
			order: "win_type,id",
			limit: 500,
		});
		if (stores.length > 0) return stores;
		console.log(
			`[news] winning stores empty in trailbase round=${round}, use official fallback`,
		);
	} catch (error) {
		console.warn(
			`[news] winning stores fetch failed round=${round}. use official fallback. reason=${error?.message || error}`,
		);
	}

	try {
		const officialStores = await fetchOfficialWinningStores(round);
		if (officialStores.length > 0) {
			console.log(
				`[news] official winning stores fallback applied round=${round}`,
			);
		}
		return officialStores;
	} catch (error) {
		console.warn(
			`[news] official winning stores fetch failed round=${round}. continue with empty list. reason=${error?.message || error}`,
		);
		return [];
	}
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
			consecutive_pairs: analysis.consecutivePairs,
		},
		store_stats: {
			total: analysis.storesCount,
			first_count: analysis.firstStoreCount,
			second_count: analysis.secondStoreCount,
			auto_count: analysis.autoCount,
			manual_count: analysis.manualCount,
			semi_auto_count: analysis.semiCount,
			top_regions: analysis.regionRows,
			top_areas: analysis.areaRows,
		},
	};
}

async function generatePayloadWithAi(draw, stores, analysis, fallback) {
	if (!USE_AI || !ZAI_API_KEY) {
		return fallback;
	}

	const endpoint = `${ZAI_BASE_URL}/chat/completions`;
	const input = aiInputPayload(draw, stores, analysis);
	const prompt = [
		"다음 JSON 데이터(로또 회차 집계/당첨점 집계)를 기반으로 한국어 뉴스 콘텐츠를 생성하라.",
		"사실 기반의 중립적 뉴스 요약으로 작성하라.",
		"반드시 tool call(save_news_payload)로만 응답한다.",
		"각 항목 규칙:",
		"- title: 40자 이내",
		"- description: 20~40자",
		"- description은 title과 중복 표현을 피하고 핵심 키워드 중심으로 작성",
		'- category: "로또분석" 권장',
		"- tags: 3~5개",
		"- lead: 2~4문단, 합계 350자 이상",
		"- bullet_points: 4~8개",
		"- insight: 2~4문단, 합계 300자 이상",
		"- caution_message: 건전 구매 안내 1문장",
		"- recommended_stats: 2~5개. 각 항목은 {key, reason} 형식",
		"- key 허용값: stats_main, winning_stores, numbers, odd_even, high_low, sections, pairs, repeat, colors, unit_digit, ac",
		"입력 데이터:",
		JSON.stringify(input),
	].join("\n");

	const jsonObjectPrompt = [
		"다음 JSON 데이터로 로또 뉴스 payload를 생성하라.",
		"사실 기반의 중립적 문체를 사용하라.",
		"반드시 JSON 객체만 반환하라.",
		"필수 키: title, description, category, tags, lead, bullet_points, insight, caution_message, recommended_stats",
		"title은 40자 이내, description은 20~40자로 작성하라.",
		"description은 title과 같은 표현 반복 없이 키워드 위주로 작성하라.",
		"tags는 문자열 배열(3~5개), bullet_points는 문자열 배열(4~8개)이어야 한다.",
		"lead와 insight는 각각 2~4문단으로 충분히 길게 작성하라.",
		"recommended_stats는 2~5개 배열이며 각 항목은 {key, reason} 형식이다.",
		"key 허용값: stats_main, winning_stores, numbers, odd_even, high_low, sections, pairs, repeat, colors, unit_digit, ac",
		JSON.stringify(input),
	].join("\n");

	async function requestZai(body) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), ZAI_TIMEOUT_MS);

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					authorization: `Bearer ${ZAI_API_KEY}`,
					"content-type": "application/json",
				},
				body: JSON.stringify(body),
				signal: controller.signal,
			});

			const rawBody = await response.text();
			return {
				ok: response.ok,
				status: response.status,
				rawBody,
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
			response_format: { type: "json_object" },
			messages: [
				{
					role: "system",
					content:
						"너는 로또 데이터 전문 기자다. 출력은 반드시 JSON 객체 하나만 반환한다.",
				},
				{ role: "user", content: jsonObjectPrompt },
			],
		});

		if (!jsonResponse.ok) {
			console.warn(
				`[news] AI json_object fallback failed status=${jsonResponse.status}`,
			);
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
				{
					role: "system",
					content:
						"너는 로또 데이터 전문 기자다. 출력은 반드시 함수 호출로만 반환한다.",
				},
				{ role: "user", content: prompt },
			],
			tools: [
				{
					type: "function",
					function: {
						name: "save_news_payload",
						description: "Structured lotto news payload",
						parameters: {
							type: "object",
							properties: {
								title: { type: "string" },
								description: { type: "string" },
								category: { type: "string" },
								tags: {
									type: "array",
									items: { type: "string" },
								},
								lead: { type: "string" },
								bullet_points: {
									type: "array",
									items: { type: "string" },
								},
								insight: { type: "string" },
								caution_message: { type: "string" },
								recommended_stats: {
									type: "array",
									items: {
										type: "object",
										properties: {
											key: {
												type: "string",
												enum: [
													"stats_main",
													"winning_stores",
													"numbers",
													"odd_even",
													"high_low",
													"sections",
													"pairs",
													"repeat",
													"colors",
													"unit_digit",
													"ac",
												],
											},
											reason: { type: "string" },
										},
										required: ["key", "reason"],
										additionalProperties: false,
									},
								},
							},
							required: [
								"title",
								"description",
								"category",
								"tags",
								"lead",
								"bullet_points",
								"insight",
								"caution_message",
								"recommended_stats",
							],
							additionalProperties: false,
						},
					},
				},
			],
			tool_choice: {
				type: "function",
				function: { name: "save_news_payload" },
			},
		});

		if (!toolResponse.ok) {
			const errorPreview = toolResponse.rawBody
				.slice(0, 200)
				.replace(/\s+/g, " ")
				.trim();
			console.warn(
				`[news] AI tool-call failed status=${toolResponse.status} body=${errorPreview}`,
			);
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
			? message.tool_calls.find(
					(item) => item?.function?.name === "save_news_payload",
				)
			: null;

		let parsed = toolCall ? tryParseJson(toolCall?.function?.arguments) : null;
		if (!parsed && typeof message.content === "string") {
			parsed = tryParseJson(message.content);
		}

		if (!parsed) {
			const jsonFallback = await requestJsonObjectFallback();
			if (jsonFallback) {
				console.log(
					`[news] ai json_object payload applied round=${analysis.round}`,
				);
				return jsonFallback;
			}
			return fallback;
		}

		const result = sanitizeAiPayload(parsed, analysis.round, fallback);
		console.log(`[news] ai tool-call payload applied round=${analysis.round}`);
		return result;
	} catch (error) {
		console.warn(`[news] AI fallback (error=${error?.name || "unknown"})`);
		return fallback;
	}
}

function renderRegionRows(rows) {
	if (rows.length === 0) {
		return '<tr><td colspan="4">당첨점 데이터가 아직 집계되지 않았습니다.</td></tr>';
	}

	return rows
		.map(
			(row) =>
				`<tr><td>${row.region}</td><td>${row.first}</td><td>${row.second}</td><td>${row.total}</td></tr>`,
		)
		.join("\n      ");
}

function renderAreaRows(rows) {
	if (rows.length === 0) {
		return '<tr><td colspan="4">주소 기반 집계 데이터가 아직 없습니다.</td></tr>';
	}

	return rows
		.map(
			(row) =>
				`<tr><td>${row.area}</td><td>${row.first}</td><td>${row.second}</td><td>${row.total}</td></tr>`,
		)
		.join("\n      ");
}

function buildRecommendedStatsLinks(analysis, variant = getFallbackVariant(analysis)) {
	const links = [];

	const push = (key, label, reason) => {
		const catalog = STATS_LINK_CATALOG[key];
		if (!catalog) return;
		const href = catalog.href(analysis.round);
		if (links.some((item) => item.href === href)) return;
		links.push({
			key,
			icon: catalog.icon,
			href,
			label: label || catalog.label,
			reason,
		});
	};

	push(
		"stats_main",
		"전체 통계 메인",
		"전체 회차 흐름과 이번 회차를 비교할 때 가장 먼저 보는 기준 페이지",
	);
	push(
		"winning_stores",
		`${analysis.round}회차 당첨점 조회`,
		"회차별 1등/2등 당첨점 상세 주소와 선택방식을 바로 확인",
	);
	push(
		"numbers",
		"번호별 통계",
		"당첨번호 6개의 장기 출현 빈도와 누적 경향을 확인",
	);

	if (variant === "single_winner" || variant === "few_high_payout") {
		push(
			"ac",
			"AC값 통계",
			"소수 고액 당첨 회차의 조합 복잡도가 장기 평균과 어떻게 다른지 확인",
		);
		push(
			"pairs",
			"번호 쌍 통계",
			"실제 1등 조합에 가까운 번호 페어의 장기 동행 패턴을 확인",
		);
	}

	if (variant === "pattern") {
		push("pairs", "번호 쌍 통계", "함께 자주 나오는 번호 조합을 확인");
		push("repeat", "연속 중복 통계", "연속/중복 출현 패턴의 최근 추세를 검증");
	}

	if (analysis.oddCount !== analysis.evenCount || analysis.anomalies.includes("all_odd_even")) {
		push(
			"odd_even",
			"홀짝 분석",
			`이번 회차 홀짝 비율(${analysis.oddCount}:${analysis.evenCount})이 평균 대비 어떤지 점검`,
		);
	}

	if (analysis.highCount >= 3 || analysis.lowCount >= 3 || variant === "pattern") {
		push(
			"high_low",
			"고저번대 통계",
			"고번대/저번대 집중 여부를 장기 데이터와 비교",
		);
		push("sections", "구간별 분석", "번호대(1~10, 11~20...)별 분포 편중 확인");
	}

	if (analysis.anomalies.includes("region_concentration") || variant === "region_concentration") {
		push(
			"winning_stores",
			"지역 집중 당첨점 상세",
			"특정 지역 집중 현상이 실제 판매점 분포에서 어떻게 나타나는지 확인",
		);
		push(
			"colors",
			"색깔별 통계",
			"집중된 번호대가 색상 구간 통계와 어떤 상관을 보이는지 확인",
		);
	}

	if (variant === "general") {
		push(
			"ac",
			"AC값 통계",
			"이번 회차가 평균적인 조합 복잡도 범위에 있었는지 비교",
		);
	}

	return links.slice(0, 6);
}

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function renderMdx(draw, analysis, payload) {
	const round = analysis.round;
	const bonus = safeInt(draw.bonus_number);
	const drawDate = formatDate(draw.draw_date);
	const finalTitle = normalizeLine(payload.title, `제${round}회 로또 분석`);
	const finalDescription = normalizeLine(
		payload.description,
		"당첨번호·당첨금·지역분포·당첨점 통계 요약",
	);
	const thumbnail = `/og/news/lotto-${round}?v=${encodeURIComponent(drawDate)}`;
	const safeLead = sanitizeMdxBlock(payload.lead, "핵심 요약을 준비 중입니다.");
	const safeInsight = sanitizeMdxBlock(
		payload.insight,
		"이번 회차 인사이트를 정리 중입니다.",
	);
	const insightCompact = safeInsight.replace(/\s*\n+\s*/g, " ").trim();
	const safeCautionMessage = sanitizeMdxInline(
		payload.caution_message,
		"복권은 건전한 오락으로 즐겨주세요.",
	);
	const bulletList = payload.bullet_points
		.map((value) => `- ${sanitizeMdxInline(value, "")}`)
		.join("\n");
	const recommendedStatsLinks =
		payload.recommended_stats?.length > 0
			? payload.recommended_stats
			: buildRecommendedStatsLinks(analysis);
	const recommendedStatsCards = recommendedStatsLinks
		.map((link) => {
			const icon = escapeHtml(link.icon || "📊");
			const label = escapeHtml(link.label);
			const href = escapeHtml(link.href);
			const reason = escapeHtml(
				link.reason || "이번 회차 데이터와 직접 연결되는 통계입니다.",
			);
			return `<a href="${href}" class="group block rounded-2xl border border-base-300 bg-gradient-to-br from-base-100 to-base-200/70 p-0.5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all no-underline">
  <div class="h-full rounded-2xl bg-base-100 p-4">
    <div class="flex items-start gap-3">
      <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-lg">${icon}</span>
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-semibold text-base-content group-hover:text-primary transition-colors">${label}</h3>
        <p class="mt-1 text-sm leading-relaxed text-base-content/70">${reason}</p>
      </div>
      <span class="text-base-content/40 group-hover:text-primary transition-colors">↗</span>
    </div>
  </div>
</a>`;
		})
		.join("\n");

	return `---
title: ${yamlString(finalTitle)}
date: ${yamlString(drawDate)}
category: ${yamlString(payload.category)}
tags: [${payload.tags.map((tag) => yamlString(tag)).join(", ")}]
description: ${yamlString(finalDescription)}
author: ${yamlString("645.live 자동뉴스")}
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
    <li><strong>당첨번호</strong>: ${analysis.numbers.join(", ")} + 보너스 ${bonus}</li>
    <li><strong>1등 당첨자</strong>: ${analysis.winnerCount}명</li>
    <li><strong>1인당 1등 당첨금</strong>: ${formatWon(analysis.winnerAmount)}</li>
    <li><strong>총 판매액</strong>: ${formatWon(analysis.totalSales)}</li>
  </ul>
</Card>

${safeLead}

## 당첨번호

<LottoNumbers numbers={[${analysis.numbers.join(", ")}]} bonus={${bonus}} round={${round}} />

## 특이점 분석

${bulletList}

${safeInsight}

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

## 이번 회차에서 이어서 볼 통계

이번 회차 특징과 맞는 통계를 카드에서 바로 이동해 확인해보세요.

<div class="not-prose grid grid-cols-1 md:grid-cols-2 gap-3 my-6">
${recommendedStatsCards}
</div>

<Alert type="info">
  ${safeCautionMessage}
</Alert>
`;
}

async function writeNewsFile(round, content) {
	const filePath = path.join(NEWS_DIR, `lotto-${round}.mdx`);
	const previous = await fs.readFile(filePath, "utf8").catch(() => null);
	if (previous === content) return false;
	await fs.writeFile(filePath, content, "utf8");
	return true;
}

async function main() {
	await fs.mkdir(NEWS_DIR, { recursive: true });

	const existingRounds = await getExistingRounds();
	const drawRows = await getDrawRows();
	if (TARGET_ROUND && drawRows.length === 0) {
		throw new Error(`No draw data found for round=${TARGET_ROUND}`);
	}
	drawRows.sort((left, right) => safeInt(left.round) - safeInt(right.round));

	let generatedCount = 0;
	let updatedCount = 0;
	let processingCount = 0;

	for (const draw of drawRows) {
		const round = safeInt(draw.round);
		if (!round) continue;
		if (!FORCE && existingRounds.has(round)) continue;
		if (MAX_GENERATE_ROUNDS > 0 && processingCount >= MAX_GENERATE_ROUNDS) {
			console.log(
				`[news] max generate rounds reached (${MAX_GENERATE_ROUNDS}), stop.`,
			);
			break;
		}
		processingCount += 1;

		const stores = await getWinningStores(round);
		const analysis = analyzeRound(draw, stores);
		const previousDraw = drawRows.find(
			(candidate) => safeInt(candidate.round) === round - 1,
		);
		const fallback = fallbackPayload(draw, analysis, previousDraw);
		const payload = await generatePayloadWithAi(
			draw,
			stores,
			analysis,
			fallback,
		);
		const mdx = renderMdx(draw, analysis, payload);
		const changed = await writeNewsFile(round, mdx);
		if (!changed) continue;

		if (existingRounds.has(round)) updatedCount += 1;
		else generatedCount += 1;

		console.log(
			`[news] generated lotto-${round}.mdx (stores=${stores.length}, ai=${USE_AI && Boolean(ZAI_API_KEY)})`,
		);
	}

	if (!TARGET_ROUND) {
		const officialLatestRound = await fetchOfficialLatestRounds(1)
			.then((rounds) => rounds[0] || 0)
			.catch(() => 0);
		if (officialLatestRound > 0) {
			const finalExistingRounds = await getExistingRounds();
			const latestNewsRound =
				finalExistingRounds.size > 0 ? Math.max(...finalExistingRounds) : 0;
			if (latestNewsRound < officialLatestRound) {
				throw new Error(
					`Latest news round is stale: news=${latestNewsRound} official=${officialLatestRound}`,
				);
			}
		}
	}

	console.log(
		`[news] done generated=${generatedCount} updated=${updatedCount}`,
	);
}

main().catch((error) => {
	console.error("[news] failed:", error);
	process.exitCode = 1;
});
