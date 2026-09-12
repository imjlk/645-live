// Normal HTML is a Pages asset. Only negotiated representations and runtime routes use SvelteKit.
export const negotiatedPaths = new Set([
	"/",
	"/docs",
	"/developers",
	"/compare",
	"/status",
	"/methodology",
	"/contact",
]);

export function wantsServerRepresentation(request) {
	const url = new URL(request.url);
	return (
		negotiatedPaths.has(url.pathname) &&
		((request.headers.get("accept") ?? "").includes("text/markdown") ||
			(url.pathname === "/" && url.searchParams.get("mode") === "agent"))
	);
}

export function createPagesWorker({ Server, manifest, prerendered }) {
	let server;
	let ready;
	return {
		async fetch(request, env, ctx) {
			const url = new URL(request.url);
			const pathname = url.pathname;
			const filename = pathname.slice(1);
			const isRead = request.method === "GET" || request.method === "HEAD";
			const asset =
				prerendered.has(pathname) ||
				manifest.assets.has(filename) ||
				pathname.startsWith(`/${manifest.appPath}/immutable/`) ||
				pathname === `/${manifest.appPath}/version.json`;
			if (isRead && asset && !wantsServerRepresentation(request)) {
				const response = await env.ASSETS.fetch(request);
				if (!negotiatedPaths.has(pathname)) return response;
				const headers = new Headers(response.headers);
				headers.set(
					"Vary",
					[headers.get("Vary"), "Accept"].filter(Boolean).join(", "),
				);
				return new Response(response.body, {
					status: response.status,
					headers,
				});
			}
			const alternate = pathname.endsWith("/")
				? pathname.slice(0, -1)
				: `${pathname}/`;
			if (isRead && alternate && prerendered.has(alternate)) {
				return new Response(null, {
					status: 308,
					headers: { location: `${alternate}${url.search}` },
				});
			}
			if (!ready) {
				server = new Server(manifest);
				ready = server.init({
					env,
					read: async (file) => {
						const response = await env.ASSETS.fetch(
							new URL(`/${file}`, url.origin),
						);
						if (!response.ok)
							throw new Error(`Asset read failed (${response.status})`);
						return response.body;
					},
				});
			}
			await ready;
			return server.respond(request, {
				platform: {
					env,
					ctx,
					context: ctx,
					caches: globalThis.caches,
					cf: request.cf,
				},
				getClientAddress: () =>
					request.headers.get("cf-connecting-ip") ?? "127.0.0.1",
			});
		},
	};
}
