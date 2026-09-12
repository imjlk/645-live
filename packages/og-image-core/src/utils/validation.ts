import type { OGImageOptions } from "../types/index.js";

export const validateOGImageOptions = (
	options: unknown,
): options is OGImageOptions => {
	if (!options || typeof options !== "object") return false;
	const opts = options as Record<string, unknown>;
	if (
		typeof opts.title !== "string" ||
		!opts.title.trim() ||
		opts.title.length > 1000
	)
		return false;
	for (const key of [
		"description",
		"backgroundImage",
		"logo",
		"badgeText",
		"metaText",
		"highlightText",
	]) {
		if (opts[key] !== undefined && typeof opts[key] !== "string") return false;
	}
	for (const key of ["width", "height"]) {
		if (
			opts[key] !== undefined &&
			(typeof opts[key] !== "number" || !Number.isFinite(opts[key]))
		)
			return false;
	}
	if (
		opts.numbers !== undefined &&
		(!Array.isArray(opts.numbers) ||
			opts.numbers.length !== 6 ||
			new Set(opts.numbers).size !== 6 ||
			!opts.numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 45))
	)
		return false;
	if (
		opts.bonusNumber !== undefined &&
		(!Number.isInteger(opts.bonusNumber) ||
			Number(opts.bonusNumber) < 1 ||
			Number(opts.bonusNumber) > 45)
	)
		return false;
	if (
		opts.theme !== undefined &&
		opts.theme !== "light" &&
		opts.theme !== "dark"
	)
		return false;
	if (
		opts.format !== undefined &&
		opts.format !== "png" &&
		opts.format !== "svg"
	)
		return false;
	if (
		opts.layout !== undefined &&
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
		].includes(String(opts.layout))
	)
		return false;
	return true;
};
