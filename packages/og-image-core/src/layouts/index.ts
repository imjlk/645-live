import type { LayoutStyles, LayoutType } from "../types/index.js";
import { blogLayout } from "./blog.js";
import { centeredLayout } from "./centered.js";
import { defaultLayout } from "./default.js";
import { eventLayout } from "./event.js";
import { heroLayout } from "./hero.js";
import { minimalLayout } from "./minimal.js";
import { newsLayout } from "./news.js";
import { productLayout } from "./product.js";
import { testimonialLayout } from "./testimonial.js";

export const layoutRegistry: Record<LayoutType, LayoutStyles> = {
	default: defaultLayout,
	centered: centeredLayout,
	minimal: minimalLayout,
	blog: blogLayout,
	news: newsLayout,
	product: productLayout,
	hero: heroLayout,
	testimonial: testimonialLayout,
	event: eventLayout,
};

export const getLayoutStyles = (layout: LayoutType): LayoutStyles => {
	return layoutRegistry[layout] || defaultLayout;
};

export const getAvailableLayouts = (): LayoutType[] => {
	return Object.keys(layoutRegistry) as LayoutType[];
};

export * from "./default.js";
export * from "./centered.js";
export * from "./minimal.js";
export * from "./blog.js";
export * from "./news.js";
export * from "./product.js";
export * from "./hero.js";
export * from "./testimonial.js";
export * from "./event.js";
