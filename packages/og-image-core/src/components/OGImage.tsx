import type * as React from "react";
import { getLayoutStyles } from "../layouts/index.js";
import type { CustomLayoutOptions } from "../types/index.js";
import { getThemeColors } from "../utils/theme.js";
import { Background } from "./Background.js";
import { Brand } from "./Brand.js";

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
}) => {
	const baseLayoutStyles = getLayoutStyles(layout);
	const layoutStyles = customStyles
		? { ...baseLayoutStyles, ...customStyles }
		: baseLayoutStyles;
	const themeColors = getThemeColors(theme);
	const colors = brandColors ? { ...themeColors, ...brandColors } : themeColors;

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

				<h1
					style={{
						fontSize: layoutStyles.title.fontSize,
						fontWeight: "bold",
						color: colors.textColor,
						lineHeight: "1.2",
						margin: 0,
						marginBottom: layoutStyles.title.marginBottom,
					}}
				>
					{title}
				</h1>

				{description && (
					<p
						style={{
							fontSize: layoutStyles.description.fontSize,
							color: colors.textColor,
							opacity: 0.8,
							margin: 0,
							lineHeight: "1.4",
						}}
					>
						{description}
					</p>
				)}
			</div>

			<Brand accentColor={colors.accentColor} textColor={colors.textColor} />
		</div>
	);
};
