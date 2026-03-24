import type { LayoutStyles } from "../types/index.js";

export const heroLayout: LayoutStyles = {
	container: {
		justifyContent: "center",
		alignItems: "center",
		padding: "56px 68px",
	},
	content: {
		textAlign: "center",
		maxWidth: "88%",
	},
	title: {
		fontSize: "88px",
		lineHeight: "1.05",
		fontWeight: "800",
		letterSpacing: "-0.045em",
		marginBottom: "28px",
	},
	description: {
		fontSize: "34px",
		lineHeight: "1.32",
		opacity: "0.92",
	},
};
