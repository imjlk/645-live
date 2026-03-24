import type { OGImageOptions } from "../types/index.js";

export const validateOGImageOptions = (
	options: unknown,
): options is OGImageOptions => {
	if (!options || typeof options !== "object") return false;

	const opts = options as Record<string, unknown>;

	// Title is required
	if (!opts.title || typeof opts.title !== "string") return false;

	// Optional string fields
	if (opts.description && typeof opts.description !== "string") return false;
	if (opts.backgroundImage && typeof opts.backgroundImage !== "string")
		return false;
	if (opts.logo && typeof opts.logo !== "string") return false;
	if (opts.badgeText && typeof opts.badgeText !== "string") return false;
	if (opts.metaText && typeof opts.metaText !== "string") return false;
	if (opts.highlightText && typeof opts.highlightText !== "string") return false;

	// Optional number fields
	if (opts.width && typeof opts.width !== "number") return false;
	if (opts.height && typeof opts.height !== "number") return false;

	// Theme validation
	if (opts.theme && !["light", "dark"].includes(opts.theme as string))
		return false;

	// Layout validation
	if (
		opts.layout &&
		![
			"default",
			"centered",
			"minimal",
			"blog",
			"news",
			"product",
			"hero",
			"testimonial",
			"event",
		].includes(
			opts.layout as string,
		)
	)
		return false;

	return true;
};
