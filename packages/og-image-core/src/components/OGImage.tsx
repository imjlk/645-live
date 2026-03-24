import type * as React from "react";
import { getLayoutStyles } from "../layouts/index.js";
import type { CustomLayoutOptions } from "../types/index.js";
import { getThemeColors } from "../utils/theme.js";
import { Background } from "./Background.js";
import { Brand } from "./Brand.js";

function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function scoreBalancedLines(lines: string[]): number {
	const lengths = lines.map((line) => line.length);
	const maxLength = Math.max(...lengths);
	const minLength = Math.min(...lengths);
	let score = maxLength - minLength;

	const lastLineWords = lines.at(-1)?.split(" ").filter(Boolean).length ?? 0;
	if (lastLineWords === 1) {
		score += 24;
	}

	const lastLineLength = lines.at(-1)?.length ?? 0;
	if (lastLineLength > 0 && lastLineLength < Math.ceil(maxLength * 0.42)) {
		score += 12;
	}

	return score;
}

function balanceText(text: string, maxLines: number): string[] {
	const normalized = normalizeWhitespace(text);
	if (!normalized) {
		return [text];
	}

	const words = normalized.split(" ");
	if (words.length <= 2 || maxLines <= 1) {
		return [normalized];
	}

	let bestLines = [normalized];
	let bestScore = Number.POSITIVE_INFINITY;
	const lastWordIndex = words.length - 1;

	const tryBreaks = (breaks: number[], startIndex: number, remaining: number) => {
		if (remaining === 0) {
			const indices = [...breaks, words.length];
			let previous = 0;
			const lines = indices.map((index) => {
				const line = words.slice(previous, index).join(" ");
				previous = index;
				return line;
			});

			const score = scoreBalancedLines(lines);
			if (score < bestScore) {
				bestScore = score;
				bestLines = lines;
			}
			return;
		}

		for (let index = startIndex; index <= lastWordIndex - remaining; index += 1) {
			tryBreaks([...breaks, index], index + 1, remaining - 1);
		}
	};

	for (let lines = 2; lines <= Math.min(maxLines, words.length); lines += 1) {
		tryBreaks([], 1, lines - 1);
	}

	return bestLines;
}

function balanceTitle(text: string, layout: CustomLayoutOptions["layout"]): string[] {
	const normalized = normalizeWhitespace(text);

	if (layout === "news") {
		const commaIndex = normalized.indexOf(",");
		if (commaIndex > 0 && commaIndex < normalized.length - 1) {
			return [
				normalized.slice(0, commaIndex + 1).trim(),
				normalized.slice(commaIndex + 1).trim(),
			];
		}
	}

	return balanceText(
		normalized,
		layout === "hero" || layout === "centered" ? 2 : 3,
	);
}

export const OGImage: React.FC<CustomLayoutOptions> = ({
	title,
	description,
	theme = "light",
	backgroundImage,
	gradientBackground,
	logo,
	layout = "default",
	customStyles,
	brandColors,
	badgeText,
	metaText,
	highlightText,
}) => {
	const baseLayoutStyles = getLayoutStyles(layout);
	const layoutStyles = customStyles
		? { ...baseLayoutStyles, ...customStyles }
		: baseLayoutStyles;
	const themeColors = getThemeColors(theme);
	const colors = brandColors ? { ...themeColors, ...brandColors } : themeColors;
	const titleLines = balanceTitle(title, layout);
	const descriptionText = description ? normalizeWhitespace(description) : undefined;
	const descriptionLines = descriptionText
		? balanceText(descriptionText, layout === "news" ? 3 : 2)
		: [];
	const hasNewsMeta = (badgeText && badgeText.length > 0) || (metaText && metaText.length > 0);
	const newsAccent = colors.accentColor;
	const titleBlock = (
		<h1
			style={{
				fontSize: layoutStyles.title.fontSize,
				fontWeight: layoutStyles.title.fontWeight ?? "700",
				color: colors.textColor,
				lineHeight: layoutStyles.title.lineHeight ?? "1.2",
				letterSpacing: layoutStyles.title.letterSpacing ?? "-0.02em",
				margin: 0,
				marginBottom: layoutStyles.title.marginBottom,
			}}
		>
			{titleLines.map((line, index) => (
				<span
					key={`${line}-${index}`}
					style={{
						display: "block",
					}}
				>
					{line}
				</span>
			))}
		</h1>
	);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				position: "relative",
				fontFamily: "Arial, sans-serif",
				padding: layoutStyles.container.padding,
				justifyContent: layoutStyles.container.justifyContent,
				alignItems: layoutStyles.container.alignItems,
			}}
		>
			<Background
				backgroundColor={colors.backgroundColor}
				backgroundImage={backgroundImage}
				gradientBackground={gradientBackground}
			/>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "20px",
					maxWidth: layoutStyles.content.maxWidth,
					textAlign: layoutStyles.content.textAlign,
					position: "relative",
					width: "100%",
				}}
			>
				{logo && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							marginBottom: "40px",
						}}
					>
						<img
							src={logo}
							alt="Logo"
							style={{
								width: "60px",
								height: "60px",
								borderRadius: "8px",
							}}
						/>
					</div>
				)}

				{layout === "news" ? (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "28px",
							width: "100%",
						}}
					>
						{hasNewsMeta && (
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									gap: "20px",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "16px",
									}}
								>
									{badgeText && (
										<div
											style={{
												display: "flex",
												alignItems: "center",
												padding: "10px 18px",
												borderRadius: "999px",
												backgroundColor: newsAccent,
												color: colors.backgroundColor,
												fontSize: "24px",
												fontWeight: "800",
												letterSpacing: "-0.02em",
											}}
										>
											{badgeText}
										</div>
									)}
									<div
										style={{
											width: "14px",
											height: "14px",
											borderRadius: "999px",
											backgroundColor: newsAccent,
											opacity: 0.55,
										}}
									/>
								</div>
								{metaText && (
									<div
										style={{
											fontSize: "22px",
											color: colors.textColor,
											opacity: 0.72,
											textAlign: "right",
										}}
									>
										{metaText}
									</div>
								)}
							</div>
						)}

						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "stretch",
								gap: "36px",
								width: "100%",
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-between",
									gap: "24px",
									flex: "1 1 auto",
									maxWidth: "76%",
								}}
							>
								{titleBlock}

								{descriptionLines.length > 0 && (
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "8px",
											padding: "22px 24px",
											borderRadius: "26px",
											backgroundColor:
												theme === "dark"
													? "rgba(255,255,255,0.08)"
													: "rgba(15,23,42,0.08)",
											border:
												theme === "dark"
													? "1px solid rgba(255,255,255,0.10)"
													: "1px solid rgba(15,23,42,0.08)",
										}}
									>
										{descriptionLines.map((line, index) => (
											<p
												key={`${line}-${index}`}
												style={{
													fontSize: layoutStyles.description.fontSize,
													color: colors.textColor,
													opacity: layoutStyles.description.opacity ?? "0.92",
													margin: 0,
													lineHeight:
														layoutStyles.description.lineHeight ?? "1.38",
												}}
											>
												{line}
											</p>
										))}
									</div>
								)}
							</div>

							<div
								style={{
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-between",
									gap: "20px",
									width: "220px",
								}}
							>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										justifyContent: "space-between",
										padding: "26px 24px",
										borderRadius: "32px",
										background:
											theme === "dark"
												? "rgba(255,255,255,0.06)"
												: "rgba(255,255,255,0.75)",
										border:
											theme === "dark"
												? "1px solid rgba(255,255,255,0.12)"
												: "1px solid rgba(15,23,42,0.08)",
										minHeight: "250px",
									}}
								>
									<div
										style={{
											fontSize: "18px",
											color: colors.textColor,
											opacity: 0.58,
											textTransform: "uppercase",
											letterSpacing: "0.18em",
										}}
									>
										Lotto News
									</div>
									<div
										style={{
											width: "72px",
											height: "8px",
											borderRadius: "999px",
											backgroundColor: newsAccent,
										}}
									/>
									<div
										style={{
											fontSize: "88px",
											fontWeight: "800",
											lineHeight: "0.95",
											letterSpacing: "-0.05em",
											color: colors.textColor,
										}}
									>
										{badgeText?.includes("회")
											? badgeText.replace(/[^\d]/g, "") || "645"
											: "645"}
									</div>
									<div
										style={{
											fontSize: "24px",
											color: colors.textColor,
											opacity: 0.7,
										}}
									>
										{badgeText || "뉴스 브리프"}
									</div>
								</div>

								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "12px",
										padding: "14px 18px",
										borderRadius: "999px",
										backgroundColor:
											theme === "dark"
												? "rgba(15,23,42,0.36)"
												: "rgba(255,255,255,0.7)",
										border:
											theme === "dark"
												? "1px solid rgba(255,255,255,0.08)"
												: "1px solid rgba(15,23,42,0.08)",
									}}
								>
									<div
										style={{
											width: "12px",
											height: "12px",
											borderRadius: "999px",
											backgroundColor: newsAccent,
										}}
									/>
									<div
										style={{
											fontSize: "20px",
											color: colors.textColor,
											opacity: 0.8,
										}}
									>
										{highlightText || "당첨 흐름 요약"}
									</div>
								</div>
							</div>
						</div>
					</div>
				) : (
					<>
						{titleBlock}

						{descriptionText && (
							<p
								style={{
									fontSize: layoutStyles.description.fontSize,
									color: colors.textColor,
									opacity: layoutStyles.description.opacity ?? "0.84",
									margin: 0,
									lineHeight: layoutStyles.description.lineHeight ?? "1.4",
								}}
							>
								{descriptionText}
							</p>
						)}
					</>
				)}
			</div>

			<Brand accentColor={colors.accentColor} textColor={colors.textColor} />
		</div>
	);
};
