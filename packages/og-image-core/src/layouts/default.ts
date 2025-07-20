import type { LayoutStyles } from "../types/index.js";

export const defaultLayout: LayoutStyles = {
	container: {
		justifyContent: "flex-start",
		alignItems: "flex-start",
		padding: "80px",
	},
	content: {
		textAlign: "left",
		maxWidth: "80%",
	},
	title: {
		fontSize: "72px",
		marginBottom: "20px",
	},
	description: {
		fontSize: "32px",
	},
};
