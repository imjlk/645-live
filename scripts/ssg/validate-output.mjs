import { readdir, readFile } from "node:fs/promises";
import { unflatten } from "devalue";
import { getPublicDataRevision } from "./public-data.mjs";

const root = new URL(
	"../../pages/www/.svelte-kit/cloudflare/",
	import.meta.url,
);
async function walk(directory) {
	const files = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const url = new URL(
			entry.name + (entry.isDirectory() ? "/" : ""),
			directory,
		);
		if (entry.isDirectory()) files.push(...(await walk(url)));
		else files.push(url);
	}
	return files;
}

const revision = await getPublicDataRevision(
	process.env.TRAILBASE_URL || "https://trail.645.live",
);
const files = await walk(root);
const html = files.filter(
	(file) =>
		file.pathname.endsWith(".html") && !file.pathname.endsWith("/404.html"),
);
if (html.length < 170)
	throw new Error(`Only ${html.length} static HTML files were generated`);
for (const name of [
	"index.html",
	"my.html",
	"login.html",
	"qr-scan.html",
	"privacy.html",
	"stats.html",
	"n/45.html",
	"stats/numbers/45.html",
]) {
	const contents = await readFile(new URL(name, root), "utf8");
	if (!contents.includes("<h1") || !contents.includes('name="description"'))
		throw new Error(`Missing static body or metadata: ${name}`);
}
let checked = 0;
for (const file of files.filter((entry) =>
	entry.pathname.endsWith("/__data.json"),
)) {
	const payload = JSON.parse(await readFile(file, "utf8"));
	for (const node of payload.nodes ?? []) {
		if (!node?.data) continue;
		const data = unflatten(node.data);
		if (data?.session?.user)
			throw new Error(
				`Private session found in static output: ${file.pathname}`,
			);
		for (const field of ["latestRound", "totalRounds"]) {
			if (field in data && data[field] !== revision.latestRound)
				throw new Error(
					`Stale/empty ${field} in ${file.pathname}: ${data[field]} (source ${revision.latestRound})`,
				);
		}
		if (data?.freshness?.isStale)
			throw new Error(`Incomplete analysis in ${file.pathname}`);
		checked++;
	}
}
const routing = JSON.parse(
	await readFile(new URL("_routes.json", root), "utf8"),
);
if (routing.include.length + routing.exclude.length > 100)
	throw new Error("Cloudflare routing limit exceeded");
for (const path of ["/winning-stores", "/history", "/news"]) {
	const dataPath = `${path}/__data.json`;
	const matches = (rule) =>
		rule.endsWith("*")
			? dataPath.startsWith(rule.slice(0, -1))
			: dataPath === rule;
	if (!routing.include.some(matches) || routing.exclude.some(matches))
		throw new Error(`Client navigation cannot reach server data: ${dataPath}`);
}
console.log(
	`[ssg] Validated ${html.length} static HTML files and ${checked} data payloads against published round ${revision.latestRound}`,
);
