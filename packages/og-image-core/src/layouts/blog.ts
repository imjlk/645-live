import type { LayoutStyles } from "../types/index.js";

export const blogLayout: LayoutStyles = {
	container: {
		justifyContent: "center",
		alignItems: "flex-start",
		padding: "80px",
	},
	content: {
		textAlign: "left",
		maxWidth: "85%",
	},
	title: {
		fontSize: "68px",
		lineHeight: "1.1",
		fontWeight: "780",
		letterSpacing: "-0.03em",
		marginBottom: "25px",
	},
	description: {
		fontSize: "30px",
		lineHeight: "1.36",
		opacity: "0.92",
	},
};
