import { OGImage, pathToTitle } from "@645/og-image-core";
import { ImageResponse } from "@cf-wasm/og";
import type { Context } from "hono";

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;

const NEWS_GRADIENTS = [
	["#0f172a", "#1d4ed8", "#38bdf8"],
	["#1e293b", "#7c3aed", "#a78bfa"],
	["#111827", "#059669", "#34d399"],
	["#1f2937", "#b45309", "#f59e0b"],
];

function safeDecode(value: string | null): string | undefined {
	if (!value) {
		return undefined;
	}

	try {
		return decodeURIComponent(value).trim();
	} catch {
		return value.trim();
	}
}

function parseIntWithRange(
	value: string | null,
	fallback: number,
	min: number,
	max: number,
): number {
	const parsed = Number.parseInt(value ?? "", 10);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	return Math.min(max, Math.max(min, parsed));
}

function parseRoundFromPath(path: string): string | undefined {
	const match = path.match(/(?:^|\/|-)lotto-(\d{3,5})(?:$|[/.])/i);
	if (match?.[1]) {
		return match[1];
	}

	const fallback = path.match(/(?:^|\/|-)(\d{3,5})(?:$|[/.])/);
	return fallback?.[1];
}

function parseNumbers(raw: string | undefined): number[] {
	if (!raw) {
		return [];
	}

	return raw
		.split(/[, ]+/)
		.map((v) => Number.parseInt(v.trim(), 10))
		.filter((v) => Number.isInteger(v) && v >= 1 && v <= 45)
		.slice(0, 6);
}

function normalizeRound(path: string, roundQuery: string | null): string | undefined {
	const queryRound = roundQuery?.trim();
	if (queryRound && /^\d{3,5}$/.test(queryRound)) {
		return queryRound;
	}
	return parseRoundFromPath(path);
}

function pickGradient(round: string | undefined): string[] {
	if (!round) {
		return NEWS_GRADIENTS[0];
	}
	const idx = Number.parseInt(round, 10) % NEWS_GRADIENTS.length;
	return NEWS_GRADIENTS[idx];
}

function buildTitle(path: string, rawTitle: string | undefined, round: string | undefined): string {
	const baseTitle = rawTitle || pathToTitle(path) || "로또 뉴스";
	if (round && !baseTitle.includes(round)) {
		return `제${round}회 로또 ${baseTitle}`;
	}
	return baseTitle;
}

function buildDescription(params: {
	rawDescription: string | undefined;
	round: string | undefined;
	winnerCount: string | undefined;
	firstPrize: string | undefined;
	numbers: number[];
	bonus: number | null;
}): string {
	if (params.rawDescription) {
		return params.rawDescription;
	}

	const chunks: string[] = [];
	if (params.round) {
		chunks.push(`제${params.round}회`);
	}

	if (params.numbers.length === 6) {
		const numbersText = params.numbers.join(", ");
		const bonusText = params.bonus ? ` + ${params.bonus}` : "";
		chunks.push(`당첨번호 ${numbersText}${bonusText}`);
	}

	if (params.winnerCount) {
		chunks.push(`1등 ${params.winnerCount}명`);
	}

	if (params.firstPrize) {
		chunks.push(`1인당 ${params.firstPrize}`);
	}

	if (chunks.length === 0) {
		return "로또 당첨 결과 분석과 통계 정보";
	}

	return `${chunks.join(" · ")} 분석`;
}

function normalizeTheme(value: string | null): "light" | "dark" {
	return value === "light" ? "light" : "dark";
}

function formatMetaDate(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return "최신 업데이트";
	}

	if (trimmed.includes("T")) {
		return trimmed.split("T")[0] ?? trimmed;
	}

	return trimmed;
}

export const handleNews = async (c: Context) => {
	try {
		const url = new URL(c.req.url);
		const path = url.pathname;

		const rawTitle = safeDecode(url.searchParams.get("title"));
		const rawDescription = safeDecode(url.searchParams.get("description"));
		const round = normalizeRound(path, url.searchParams.get("round"));
		const category = safeDecode(url.searchParams.get("category")) || "로또분석";
		const date = safeDecode(url.searchParams.get("date")) || "최신 업데이트";
		const highlight = safeDecode(url.searchParams.get("highlight"));
		const winnerCount = safeDecode(url.searchParams.get("winnerCount"));
		const firstPrize = safeDecode(url.searchParams.get("firstPrize"));
		const numbers = parseNumbers(safeDecode(url.searchParams.get("numbers")));
		const bonus = Number.parseInt(url.searchParams.get("bonus") ?? "", 10);
		const bonusNumber = Number.isInteger(bonus) && bonus >= 1 && bonus <= 45 ? bonus : null;

		const title = buildTitle(path, rawTitle, round);
		const description = buildDescription({
			rawDescription,
			round,
			winnerCount,
			firstPrize,
			numbers,
			bonus: bonusNumber,
		});

		const theme = normalizeTheme(url.searchParams.get("theme"));
		const width = parseIntWithRange(url.searchParams.get("width"), DEFAULT_WIDTH, 800, 2400);
		const height = parseIntWithRange(url.searchParams.get("height"), DEFAULT_HEIGHT, 418, 1260);
		const format = (url.searchParams.get("format") as "png" | "svg") || "png";
		const cacheControl =
			format === "png"
				? "public, max-age=31536000, immutable"
				: "no-store";

		const layout = "news";
		const contentType = format === "svg" ? "image/svg+xml" : "image/png";
		const gradientColors = pickGradient(round);

		const customOptions = {
			backgroundImage: url.searchParams.get("backgroundImage") || undefined,
			logo: url.searchParams.get("logo") || undefined,
			badgeText: round ? `제${round}회` : category,
				metaText: formatMetaDate(date),
			highlightText: highlight || category,
			gradientBackground: {
				type: "linear" as const,
				colors: gradientColors,
				direction: "135deg",
			},
			brandColors: {
				backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc",
				textColor: theme === "dark" ? "#e2e8f0" : "#0f172a",
				accentColor: gradientColors[1],
			},
		};

		const response = new ImageResponse(
			<OGImage
				title={title}
				description={description}
				theme={theme}
				layout={layout}
				width={width}
				height={height}
				{...customOptions}
			/>,
			{
				width,
				height,
				format,
				headers: {
					"Content-Type": contentType,
					"Cache-Control": cacheControl,
					"X-OG-Source": "news-generated",
				},
			},
		);

		return response;
	} catch (error) {
		console.error("Error generating news OG image:", error);
		return c.json({ error: "Failed to generate news OG image" }, 500);
	}
};
