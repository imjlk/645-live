import { writeFileSync } from "node:fs";
import path from "node:path";
import cloudflare from "@sveltejs/adapter-cloudflare";

function matchesRule(pathname, rule) {
	return rule.endsWith("*")
		? pathname.startsWith(rule.slice(0, -1))
		: pathname === rule;
}

export function runtimeRouting(routes, prerenderedPaths) {
	const rules = new Set(["/.well-known/*"]);
	for (const route of routes) {
		if (route.prerender === true) continue;
		const id = route.id.replace(/\/\([^/]+\)/g, "") || "/";
		const dynamic = id.indexOf("[");
		if (dynamic >= 0) rules.add(`${id.slice(0, dynamic)}*`);
		else {
			rules.add(id);
			if (id !== "/") rules.add(`${id}/`);
			// Client navigation requests server load data separately from the HTML.
			if (route.page?.methods.includes("GET")) {
				const dataPath = id.endsWith(".html")
					? `${id}__data.json`
					: `${id.replace(/\/$/, "")}/__data.json`;
				if (!prerenderedPaths.includes(dataPath)) rules.add(dataPath);
			}
		}
	}
	const include = [...rules].filter(
		(rule) =>
			![...rules].some(
				(other) =>
					other !== rule &&
					other.endsWith("*") &&
					rule.startsWith(other.slice(0, -1)),
			),
	);
	const exclude = prerenderedPaths.filter(
		(pathname) =>
			!pathname.endsWith("/__data.json") &&
			include.some((rule) => matchesRule(pathname, rule)) &&
			!["/", "/docs", "/compare", "/methodology", "/contact"].includes(
				pathname,
			),
	);
	if (include.length + exclude.length > 100) {
		throw new Error(
			`Pages routing needs ${include.length + exclude.length} rules (limit 100). Compress routes before deploying.`,
		);
	}
	return {
		version: 1,
		description:
			"Static pages bypass Functions; APIs and negotiated representations use SvelteKit.",
		include,
		exclude,
	};
}

export default function adapter() {
	const base = cloudflare({
		routes: { exclude: ["<build>", "<files>", "/sitemap.xml"] },
	});
	return {
		...base,
		name: "645-pages-static",
		async adapt(builder) {
			await base.adapt(builder);
			const output = builder.getBuildDirectory("cloudflare");
			const relative = (target) =>
				`./${path.relative(output, target).split(path.sep).join("/")}`;
			const manifest = builder.generateManifest({
				relativePath: relative(builder.getServerDirectory()),
			});
			const entry =
				`import { Server } from ${JSON.stringify(`${relative(builder.getServerDirectory())}/index.js`)};\n` +
				`import { createPagesWorker } from ${JSON.stringify(relative(path.resolve("adapter/worker.mjs")))};\n` +
				`const manifest = ${manifest};\n` +
				`export default createPagesWorker({ Server, manifest, prerendered: new Set(${JSON.stringify(builder.prerendered.paths)}) });\n`;
			writeFileSync(path.join(output, "_worker.js"), entry);
			const routing = runtimeRouting(builder.routes, builder.prerendered.paths);
			writeFileSync(
				path.join(output, "_routes.json"),
				`${JSON.stringify(routing, null, 2)}\n`,
			);
			builder.log.info(
				`${builder.prerendered.pages.size} static HTML pages; ${routing.include.length} runtime include / ${routing.exclude.length} exclude rules.`,
			);
		},
	};
}
