import type * as React from "react";
import type { GradientBackground } from "../types/index.js";
import { createGradientBackground } from "../utils/theme.js";

interface BackgroundProps {
	backgroundColor: string;
	backgroundImage?: string;
	gradientBackground?: GradientBackground;
}

export const Background: React.FC<BackgroundProps> = ({
	backgroundColor,
	backgroundImage,
	gradientBackground,
}) => {
	let background = backgroundColor;

	if (gradientBackground) {
		background = createGradientBackground(
			gradientBackground.type,
			gradientBackground.colors,
			gradientBackground.direction,
		);
	} else if (backgroundImage) {
		background = `url(${backgroundImage})`;
	}

	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background,
				backgroundSize: backgroundImage ? "cover" : "initial",
				backgroundPosition: backgroundImage ? "center" : "initial",
				backgroundRepeat: backgroundImage ? "no-repeat" : "initial",
			}}
		/>
	);
};
