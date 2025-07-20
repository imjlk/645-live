import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, url, params }) => {
	const title = url.searchParams.get("title");
	const description = url.searchParams.get("description");
	const theme = url.searchParams.get("theme") || "light";
	const width = url.searchParams.get("width");
	const height = url.searchParams.get("height");
	const backgroundImage = url.searchParams.get("backgroundImage");
	const logo = url.searchParams.get("logo");
	const format = url.searchParams.get("format") || "png";

	if (!platform?.env.OG_645_LIVE) {
		return new Response("OG Image Worker not available", { status: 500 });
	}

	try {
		// Build the path for the OG worker
		const pathSegments = params.path
			? params.path.split("/").filter(Boolean)
			: [];
		const ogPath = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "/";

		// Create URL with the path and query parameters
		const ogUrl = new URL(`https://worker${ogPath}`);

		// Add query parameters
		if (title) ogUrl.searchParams.set("title", title);
		if (description) ogUrl.searchParams.set("description", description);
		ogUrl.searchParams.set("theme", theme);
		if (width) ogUrl.searchParams.set("width", width);
		if (height) ogUrl.searchParams.set("height", height);
		if (backgroundImage)
			ogUrl.searchParams.set("backgroundImage", backgroundImage);
		if (logo) ogUrl.searchParams.set("logo", logo);
		ogUrl.searchParams.set("format", format);

		const ogRequest = new Request(ogUrl.toString());
		const response = await platform.env.OG_645_LIVE.fetch(ogRequest);

		if (response.ok) {
			// Return the image response directly (PNG or SVG)
			return new Response(response.body, {
				headers: {
					"Content-Type":
						response.headers.get("Content-Type") ||
						(format === "svg" ? "image/svg+xml" : "image/png"),
					"Cache-Control": "public, max-age=86400",
				},
			});
		}

		return new Response("Failed to generate OG image", { status: 500 });
	} catch (error) {
		console.error("Error calling OG Image Worker:", error);
		return new Response("Internal server error", { status: 500 });
	}
};
