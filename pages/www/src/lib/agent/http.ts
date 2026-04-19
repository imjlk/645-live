import {
	estimateMarkdownTokens,
	getDiscoveryLinkHeaderTargets,
	type AgentPage,
	serializeAgentPageMarkdown,
} from "$lib/agent/content";

const MARKDOWN_PATHS = new Set(["/", "/docs", "/developers", "/compare", "/status"]);

export function acceptsMarkdown(request: Request): boolean {
	return request.headers.get("accept")?.includes("text/markdown") ?? false;
}

export function acceptsJson(request: Request): boolean {
	return request.headers.get("accept")?.includes("application/json") ?? false;
}

export function pathSupportsMarkdown(pathname: string): boolean {
	return MARKDOWN_PATHS.has(pathname);
}

export function appendVaryHeader(headers: Headers, value: string) {
	const existing = headers.get("vary");
	if (!existing) {
		headers.set("vary", value);
		return;
	}

	const entries = existing
		.split(",")
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);

	if (!entries.includes(value.toLowerCase())) {
		headers.set("vary", `${existing}, ${value}`);
	}
}

export function appendLinkHeaders(pathname: string, headers: Headers) {
	for (const link of getDiscoveryLinkHeaderTargets(pathname)) {
		headers.append("Link", `<${link.href}>; rel="${link.rel}"`);
	}
}

export function applyAgentResponseHeaders(
	request: Request,
	response: Response,
): Response {
	const headers = new Headers(response.headers);
	appendLinkHeaders(new URL(request.url).pathname, headers);

	if (pathSupportsMarkdown(new URL(request.url).pathname)) {
		appendVaryHeader(headers, "Accept");
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export function createMarkdownResponse(request: Request, page: AgentPage): Response {
	const markdown = serializeAgentPageMarkdown(page);
	const headers = new Headers({
		"content-type": "text/markdown; charset=utf-8",
		"x-markdown-tokens": String(estimateMarkdownTokens(markdown)),
	});
	appendVaryHeader(headers, "Accept");
	appendLinkHeaders(new URL(request.url).pathname, headers);

	return new Response(markdown, {
		status: 200,
		headers,
	});
}

export function createJsonErrorResponse(
	status: number,
	code: string,
	message: string,
	hint?: string,
): Response {
	return Response.json(
		{
			error: code.toLowerCase(),
			code,
			message,
			...(hint ? { hint } : {}),
		},
		{ status },
	);
}
