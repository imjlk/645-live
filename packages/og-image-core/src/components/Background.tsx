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
	return (
		<>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor,
				}}
			/>

			{gradientBackground && (
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundImage: createGradientBackground(
							gradientBackground.type,
							gradientBackground.colors,
							gradientBackground.direction,
						),
					}}
				/>
			)}

			{backgroundImage && (
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundImage: `url(${backgroundImage})`,
						backgroundSize: "cover",
						backgroundPosition: "center",
						backgroundRepeat: "no-repeat",
					}}
				/>
			)}
		</>
	);
};
