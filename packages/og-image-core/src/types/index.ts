export interface OGImageOptions {
	title: string;
	description?: string;
	width?: number;
	height?: number;
	theme?: "light" | "dark";
	backgroundImage?: string;
	logo?: string;
	layout?: LayoutType;
	format?: "png" | "svg";
}

export interface LayoutStyles {
	container: {
		justifyContent: string;
		alignItems: string;
		padding: string;
	};
	content: {
		textAlign: "left" | "center" | "right";
		maxWidth: string;
	};
	title: {
		fontSize: string;
		marginBottom: string;
	};
	description: {
		fontSize: string;
	};
}

export interface ThemeColors {
	backgroundColor: string;
	textColor: string;
	accentColor: string;
}

export interface GradientBackground {
	type: "linear" | "radial";
	colors: string[];
	direction?: string;
}

export interface CustomLayoutOptions extends OGImageOptions {
	gradientBackground?: GradientBackground;
	customStyles?: Partial<LayoutStyles>;
	brandColors?: Partial<ThemeColors>;
}

export type LayoutType =
	| "default"
	| "centered"
	| "minimal"
	| "blog"
	| "news"
	| "product"
	| "hero"
	| "testimonial"
	| "event";
