import type { LayoutStyles } from "../types/index.js";

export const centeredLayout: LayoutStyles = {
	container: {
		justifyContent: "center",
		alignItems: "center",
		padding: "80px",
	},
	content: {
		textAlign: "center",
		maxWidth: "90%",
	},
	title: {
		fontSize: "74px",
		lineHeight: "1.08",
		fontWeight: "800",
		letterSpacing: "-0.035em",
		marginBottom: "26px",
	},
	description: {
		fontSize: "32px",
		lineHeight: "1.34",
		opacity: "0.9",
	},
};
