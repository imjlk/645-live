import type { Context } from "hono";
import { renderOgImage } from "../lib/render.js";
import {
	normalizeOgFormat,
	normalizeOgTheme,
	parseDrawNumbers,
	parseOgDimensions,
	readOgText,
} from "../lib/request.js";

export const handleNews = async (c: Context) => {
	try {
		const url = new URL(c.req.url);
		const params = url.searchParams;
		const rawRound =
			params.get("round") ||
			url.pathname.match(/(?:lotto-|\/)(\d{1,5})(?:$|[/.])/)?.[1];
		const round =
			rawRound && /^\d{1,5}$/.test(rawRound) && Number(rawRound) > 0
				? Number(rawRound)
				: undefined;
		const title =
			readOgText(params, "title", 160) ||
			(round ? `제${round}회 로또 당첨 결과` : "회차별 로또 소식");
		const description =
			readOgText(params, "description") ||
			"당첨 결과와 번호 통계, 지역별 당첨 판매점을 확인하세요.";
		const numbers = parseDrawNumbers(params.get("numbers"));
		const rawBonus = params.get("bonus");
		const bonusNumber =
			rawBonus && /^\d{1,2}$/.test(rawBonus) ? Number(rawBonus) : undefined;
		const date = readOgText(params, "date", 28)?.split("T")[0];
		return await renderOgImage(
			{
				title,
				description,
				numbers,
				bonusNumber,
				...parseOgDimensions(params),
				format: normalizeOgFormat(params.get("format")),
				theme: normalizeOgTheme(params.get("theme")),
				layout: "news",
				badgeText: round
					? `제${round}회`
					: readOgText(params, "category", 24) || "회차별 소식",
				metaText: date,
				highlightText:
					readOgText(params, "highlight", 48) ||
					"회차별 소식 · 당첨 결과와 판매점",
			},
			"news-generated",
		);
	} catch (error) {
		console.error("Error generating news OG image:", error);
		return c.json({ error: "Failed to generate news OG image" }, 500);
	}
};
