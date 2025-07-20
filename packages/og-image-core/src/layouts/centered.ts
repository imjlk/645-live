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
		fontSize: "80px",
		marginBottom: "30px",
	},
	description: {
		fontSize: "36px",
	},
};
