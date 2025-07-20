import type { ThemeColors } from "../types/index.js";

export const getThemeColors = (theme: "light" | "dark"): ThemeColors => {
	const isDark = theme === "dark";

	return {
		backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
		textColor: isDark ? "#ffffff" : "#000000",
		accentColor: isDark ? "#3b82f6" : "#2563eb",
	};
};

export const createGradientBackground = (
	type: "linear" | "radial",
	colors: string[],
	direction?: string,
): string => {
	const gradient = colors.join(", ");

	if (type === "linear") {
		const dir = direction || "45deg";
		return `linear-gradient(${dir}, ${gradient})`;
	}

	return `radial-gradient(circle, ${gradient})`;
};
