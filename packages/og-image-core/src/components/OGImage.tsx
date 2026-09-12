import type * as React from "react";
import type { CustomLayoutOptions } from "../types/index.js";
import { fitText } from "../utils/text.js";
import { getBallColors, getThemeColors, LOTTO_RANGES } from "../utils/theme.js";

/** One canvas system for the website, article previews, and existing layout aliases. */
export const OGImage: React.FC<CustomLayoutOptions> = ({
	title,
	description,
	theme = "light",
	width = 1200,
	height = 630,
	layout = "default",
	badgeText,
	metaText,
	highlightText,
	numbers,
	bonusNumber,
}) => {
	const colors = getThemeColors(theme);
	const scale = Math.min(width / 1200, height / 630);
	const px = (value: number) => value * scale;
	const contentWidth = 1088;
	const largeHeading = fitText(title, contentWidth, [72], 2);
	const heading =
		largeHeading.lines.length <= 1
			? largeHeading
			: fitText(title, contentWidth, [64, 56, 48], 2);
	const summary = fitText(description ?? "", contentWidth, [26], 2);
	const hasDraw =
		numbers?.length === 6 &&
		new Set(numbers).size === 6 &&
		numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 45);
	const drawNumbers = hasDraw ? numbers : [];
	const hasBonus =
		hasDraw &&
		bonusNumber !== undefined &&
		Number.isInteger(bonusNumber) &&
		bonusNumber >= 1 &&
		bonusNumber <= 45 &&
		!drawNumbers.includes(bonusNumber);
	const balls = hasDraw
		? drawNumbers.map((number) => ({ number, label: String(number) }))
		: LOTTO_RANGES.map((range) => ({
				number: range.from,
				label: `${range.from}–${range.to}`,
			}));
	const section =
		fitText(
			badgeText || (layout === "news" ? "회차별 소식" : "로또 6/45"),
			320,
			[22],
			1,
		).lines[0] ?? "";
	const meta = fitText(metaText ?? "", 320, [22], 1).lines[0] ?? "";
	const footer =
		fitText(
			highlightText ||
				(hasDraw
					? "로또 6/45 · 당첨번호 확인"
					: "당첨 결과 · QR 확인 · 번호 통계"),
			700,
			[20],
			1,
		).lines[0] ?? "";

	return (
		<div
			style={{
				display: "flex",
				width: "100%",
				height: "100%",
				backgroundColor: colors.backgroundColor,
				justifyContent: "center",
				alignItems: "center",
				fontFamily: "Pretendard",
				color: colors.textColor,
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					width: px(1200),
					height: px(630),
					position: "relative",
					padding: px(56),
					overflow: "hidden",
				}}
			>
				<div
					style={{
						display: "flex",
						position: "absolute",
						left: 0,
						top: 0,
						width: "100%",
						height: px(8),
					}}
				>
					{LOTTO_RANGES.map((range) => (
						<div
							key={range.from}
							style={{
								display: "flex",
								width: "20%",
								height: "100%",
								backgroundColor: theme === "dark" ? range.darkInk : range.ink,
							}}
						/>
					))}
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						height: px(81),
						paddingBottom: px(24),
						borderBottom: `${px(1)}px solid ${colors.borderColor}`,
						flexShrink: 0,
					}}
				>
					<div
						style={{
							display: "flex",
							fontSize: px(46),
							fontWeight: 700,
							letterSpacing: px(-2),
							color: colors.textColor,
						}}
					>
						645<span style={{ color: colors.accentColor }}>.live</span>
					</div>
					<div
						style={{
							display: "flex",
							gap: px(20),
							alignItems: "center",
							fontSize: px(22),
							color: colors.mutedColor,
						}}
					>
						<span>{section}</span>
						{meta && <span style={{ color: colors.mutedColor }}>{meta}</span>}
					</div>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						position: "absolute",
						top: px(171),
						left: px(56),
						width: px(contentWidth),
					}}
				>
					{heading.lines.map((line, index) => (
						<div
							key={heading.lines.slice(0, index + 1).join("\n")}
							style={{
								display: "flex",
								fontSize: px(heading.fontSize),
								fontWeight: 700,
								lineHeight: 1.16,
								letterSpacing: px(-1.6),
							}}
						>
							{line}
						</div>
					))}
					{summary.lines.length > 0 && (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								marginTop: px(18),
								color: colors.mutedColor,
							}}
						>
							{summary.lines.map((line, index) => (
								<div
									key={summary.lines.slice(0, index + 1).join("\n")}
									style={{
										display: "flex",
										fontSize: px(summary.fontSize),
										lineHeight: 1.4,
									}}
								>
									{line}
								</div>
							))}
						</div>
					)}
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						position: "absolute",
						left: px(56),
						bottom: px(115),
						gap: px(18),
						width: px(contentWidth),
					}}
				>
					{balls.map(({ number, label }) => {
						const ball = getBallColors(number, theme);
						return (
							<div
								key={number}
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									width: px(88),
									height: px(88),
									borderRadius: "50%",
									backgroundColor: ball.background,
									color: ball.color,
									fontSize: px(hasDraw ? 36 : 25),
									fontWeight: 700,
									flexShrink: 0,
								}}
							>
								{label}
							</div>
						);
					})}
					{hasBonus && (
						<>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									width: px(32),
									height: px(88),
									fontSize: px(32),
									color: colors.mutedColor,
									marginLeft: px(4),
									marginRight: px(4),
								}}
							>
								+
							</div>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									position: "relative",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										width: px(88),
										height: px(88),
										borderRadius: "50%",
										backgroundColor: getBallColors(bonusNumber, theme)
											.background,
										color: getBallColors(bonusNumber, theme).color,
										fontSize: px(36),
										fontWeight: 700,
									}}
								>
									{bonusNumber}
								</div>
								<span
									style={{
										position: "absolute",
										top: px(94),
										width: "100%",
										textAlign: "center",
										fontSize: px(15),
										lineHeight: 1,
										color: colors.mutedColor,
									}}
								>
									보너스
								</span>
							</div>
						</>
					)}
					{!hasDraw && (
						<span
							style={{
								display: "flex",
								marginLeft: px(12),
								color: colors.mutedColor,
								fontSize: px(24),
							}}
						>
							1–45 번호별 통계
						</span>
					)}
				</div>
				<div
					style={{
						display: "flex",
						position: "absolute",
						bottom: px(40),
						left: px(56),
						width: px(contentWidth),
						paddingTop: px(20),
						borderTop: `${px(1)}px solid ${colors.borderColor}`,
						justifyContent: "space-between",
						alignItems: "center",
						fontSize: px(20),
						color: colors.mutedColor,
					}}
				>
					<span>{footer}</span>
					<span style={{ color: colors.accentColor, fontWeight: 700 }}>
						645.live에서 확인하세요 →
					</span>
				</div>
			</div>
		</div>
	);
};
