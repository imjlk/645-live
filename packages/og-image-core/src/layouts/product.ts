import type { LayoutStyles } from "../types/index.js";

export const productLayout: LayoutStyles = {
	container: {
		justifyContent: "space-between",
		alignItems: "flex-start",
		padding: "60px",
	},
	content: {
		textAlign: "left",
		maxWidth: "60%",
	},
	title: {
		fontSize: "76px",
		marginBottom: "35px",
	},
	description: {
		fontSize: "34px",
	},
};
