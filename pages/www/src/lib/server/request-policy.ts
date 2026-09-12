/** Keep public HTML and data requests independent of the member database. */
export function needsMemberDatabase(pathname: string): boolean {
	return (
		pathname.startsWith("/auth/") ||
		pathname.startsWith("/rpc/") ||
		pathname === "/sign-out" ||
		pathname === "/api/qr-scan" ||
		pathname === "/mcp" ||
		pathname === "/.well-known/mcp" ||
		pathname === "/status" ||
		pathname === "/api/status.json"
	);
}

export function isPrivateEndpoint(pathname: string): boolean {
	return (
		pathname.startsWith("/auth/") ||
		pathname.startsWith("/rpc/") ||
		pathname === "/sign-out" ||
		pathname === "/api/qr-scan"
	);
}

export function hasSessionCookie(cookie: string | null): boolean {
	return (cookie ?? "")
		.split(";")
		.some((part) =>
			/^(?:__Secure-)?better-auth\.session_token=.+$/.test(part.trim()),
		);
}

export function isCrossOriginMutation(request: Request): boolean {
	if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
	const origin = request.headers.get("origin");
	return (
		(origin !== null && origin !== new URL(request.url).origin) ||
		request.headers.get("sec-fetch-site") === "cross-site"
	);
}
