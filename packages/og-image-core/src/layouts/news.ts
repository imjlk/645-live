import type { LayoutStyles } from "../types/index.js";

export const newsLayout: LayoutStyles = {
	container: {
		justifyContent: "flex-start",
		alignItems: "stretch",
		padding: "64px 72px",
	},
	content: {
		textAlign: "left",
		maxWidth: "92%",
	},
	title: {
		fontSize: "68px",
		lineHeight: "1.14",
		fontWeight: "800",
		letterSpacing: "-0.03em",
		marginBottom: "20px",
	},
	description: {
		fontSize: "30px",
		lineHeight: "1.35",
		opacity: "0.96",
	},
};
