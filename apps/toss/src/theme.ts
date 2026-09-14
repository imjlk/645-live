export function useTheme() {
	// Apps in Toss requires a light miniapp theme, including on dark-mode devices.
	return {
		dark: false,
		background: "#FFFFFF",
		surface: "#F2F4F6",
		text: "#191F28",
		muted: "#6B7684",
		line: "#E5E8EB",
		blue: "#3182F6",
		positive: "#168352",
	};
}
