import { applyPagesOgProxyHeaders } from "./og-proxy.js";

const categoryThemes: Record<
	string,
	{ bg: string; accent: string; text: string }
> = {
	로또분석: { bg: "#1E3A8A", accent: "#3B82F6", text: "#DBEAFE" },
	당첨소식: { bg: "#78350F", accent: "#F59E0B", text: "#FEF3C7" },
	통계: { bg: "#064E3B", accent: "#10B981", text: "#D1FAE5" },
	default: { bg: "#374151", accent: "#6B7280", text: "#F3F4F6" },
};

function createSvgResponse(svg: string) {
	const headers = new Headers({
		"Content-Type": "image/svg+xml",
		"Cache-Control": "no-store",
	});
	applyPagesOgProxyHeaders(headers);

	return new Response(svg, { headers });
}

export function createGenericDevFallbackResponse(
	title: string,
	description?: string,
) {
	return createSvgResponse(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="#0f172a" />
			<stop offset="100%" stop-color="#1d4ed8" />
		</linearGradient>
	</defs>
	<rect width="1200" height="630" fill="url(#bg)" />
	<text x="80" y="250" font-family="sans-serif" font-size="56" font-weight="700" fill="#ffffff">${title}</text>
	<text x="80" y="330" font-family="sans-serif" font-size="28" fill="#dbeafe">${description ?? "645.live Open Graph preview"}</text>
	<text x="80" y="570" font-family="sans-serif" font-size="24" fill="#93c5fd">645.live</text>
</svg>`);
}

export function createNewsDevFallbackResponse(params: {
	title: string;
	description: string;
	category: string;
	date: string;
	highlight?: string;
}) {
	const theme = categoryThemes[params.category] || categoryThemes.default;
	const displayTitle =
		params.title.length > 30
			? `${params.title.substring(0, 27)}...`
			: params.title;
	const displayDesc =
		params.description.length > 50
			? `${params.description.substring(0, 47)}...`
			: params.description;

	const highlightSection = params.highlight
		? `
		<rect x="0" y="480" width="1200" height="60" fill="${theme.accent}"/>
		<text x="600" y="520" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#1F2937">
			🎉 ${params.highlight}
		</text>
	`
		: "";

	return createSvgResponse(`
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" style="stop-color:${theme.bg};stop-opacity:1" />
			<stop offset="100%" style="stop-color:#111827;stop-opacity:1" />
		</linearGradient>
		<pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
			<path d="M 60 0 L 0 0 0 60" fill="none" stroke="${theme.accent}" stroke-width="0.5" opacity="0.2"/>
		</pattern>
	</defs>
	<rect width="1200" height="630" fill="url(#bgGradient)"/>
	<rect width="1200" height="630" fill="url(#grid)"/>
	<rect x="50" y="50" width="${params.category.length * 20 + 40}" height="40" rx="20" fill="${theme.accent}"/>
	<text x="${50 + (params.category.length * 20 + 40) / 2}" y="78" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#1F2937">
		${params.category}
	</text>
	<text x="1150" y="78" font-family="sans-serif" font-size="16" text-anchor="end" fill="${theme.text}" opacity="0.8">
		${params.date}
	</text>
	<text x="600" y="280" font-family="sans-serif" font-size="52" font-weight="bold" text-anchor="middle" fill="#FFFFFF">
		${displayTitle}
	</text>
	<text x="600" y="350" font-family="sans-serif" font-size="28" text-anchor="middle" fill="${theme.text}" opacity="0.9">
		${displayDesc}
	</text>
	${
		params.category === "로또분석"
			? `
		<circle cx="100" cy="550" r="30" fill="#DC2626"/>
		<circle cx="170" cy="550" r="30" fill="#F59E0B"/>
		<circle cx="240" cy="550" r="30" fill="#10B981"/>
		<circle cx="310" cy="550" r="30" fill="#3B82F6"/>
		<circle cx="380" cy="550" r="30" fill="#8B5CF6"/>
		<circle cx="450" cy="550" r="30" fill="#EC4899"/>
	`
			: ""
	}
	${highlightSection}
	<text x="1150" y="600" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="end" fill="${theme.text}">
		645.live
	</text>
	<text x="50" y="600" font-family="sans-serif" font-size="16" text-anchor="start" fill="${theme.text}" opacity="0.7">
		로또 뉴스 &amp; 분석
	</text>
</svg>`);
}
