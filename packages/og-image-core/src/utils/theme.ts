import type { ThemeColors } from "../types/index.js";

export const getThemeColors = (theme: "light" | "dark"): ThemeColors => {
	const isDark = theme === "dark";

	return {
		backgroundColor: isDark ? "#131c29" : "#ffffff",
		textColor: isDark ? "#ecf1f8" : "#172338",
		accentColor: isDark ? "#a5beff" : "#2458cc",
		mutedColor: isDark ? "#aebdce" : "#5c6a7e",
		borderColor: isDark ? "#34465c" : "#dce3ec",
		surfaceColor: isDark ? "#1c2939" : "#f5f7fa",
	};
};

// Keep these ranges aligned with pages/www/src/app.css.
export const LOTTO_RANGES = [
	{
		from: 1,
		to: 10,
		light: "#f9edbf",
		dark: "#4d4121",
		ink: "#72520a",
		darkInk: "#ffe6a1",
	},
	{
		from: 11,
		to: 20,
		light: "#dfebff",
		dark: "#243f63",
		ink: "#244f8d",
		darkInk: "#c8e0ff",
	},
	{
		from: 21,
		to: 30,
		light: "#fbe3e0",
		dark: "#522e32",
		ink: "#8b332b",
		darkInk: "#ffd1ca",
	},
	{
		from: 31,
		to: 40,
		light: "#e6eaf0",
		dark: "#394757",
		ink: "#3f4b5d",
		darkInk: "#e7edf5",
	},
	{
		from: 41,
		to: 45,
		light: "#ddf0e5",
		dark: "#254b3a",
		ink: "#28573f",
		darkInk: "#c0eed6",
	},
] as const;

export function getBallColors(number: number, theme: "light" | "dark") {
	const range =
		LOTTO_RANGES.find((range) => number >= range.from && number <= range.to) ??
		LOTTO_RANGES[0];
	return {
		background: theme === "dark" ? range.dark : range.light,
		color: theme === "dark" ? range.darkInk : range.ink,
	};
}

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
