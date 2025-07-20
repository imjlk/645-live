export const pathToTitle = (path: string): string => {
	if (!path || path === "/" || path === "") return "645.live";

	return path
		.split("/")
		.filter(Boolean)
		.map((segment) => {
			try {
				// Decode percent-encoded segments
				return decodeURIComponent(segment);
			} catch {
				// If decoding fails, use original segment
				return segment;
			}
		})
		.map((segment) => segment.replace(/-/g, " "))
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" | ");
};
