import type { LayoutStyles } from "../types/index.js";

export const minimalLayout: LayoutStyles = {
	container: {
		justifyContent: "flex-start",
		alignItems: "flex-start",
		padding: "120px",
	},
	content: {
		textAlign: "left",
		maxWidth: "70%",
	},
	title: {
		fontSize: "64px",
		marginBottom: "20px",
	},
	description: {
		fontSize: "28px",
	},
};
