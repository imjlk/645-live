import assert from "node:assert/strict";
import { test } from "node:test";
import { getPublicDataRevision } from "./public-data.mjs";

function recordFor(url) {
	if (url.pathname.endsWith("lotto_draw_results"))
		return {
			round: 1241,
			draw_date: "2026-09-12",
			...Object.fromEntries(
				[1, 2, 3, 4, 5, 6].map((n) => [`draw_number_${n}`, n]),
			),
		};
	return {
		round: 1241,
		last_draw_round: 1241,
		last_bonus_round: 1241,
		updated_at: "2026-09-12",
	};
}

test("preflight and postbuild revision checks survive a temporary 503", async () => {
	let failed = false;
	const revision = await getPublicDataRevision(
		"https://trail.example",
		async (url) => {
			if (!failed) {
				failed = true;
				return new Response("no available server", { status: 503 });
			}
			return Response.json({ records: [recordFor(url)] });
		},
	);
	assert.equal(revision.latestRound, 1241);
	assert.match(revision.revision, /^[a-f0-9]{64}$/);
});

test("missing and incomplete public data still stop publication", async () => {
	await assert.rejects(
		getPublicDataRevision("https://trail.example", async () =>
			Response.json({ records: [] }),
		),
		/is empty/,
	);
	await assert.rejects(
		getPublicDataRevision("https://trail.example", async (url) => {
			const row = recordFor(url);
			if (url.pathname.endsWith("lotto_draw_color_stats")) row.round = 1240;
			return Response.json({ records: [row] });
		}),
		/has not caught up/,
	);
});
