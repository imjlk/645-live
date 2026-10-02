import { expect, mock } from "bun:test";

mock.module("$env/static/private", () => ({
	TRAILBASE_URL: "https://preview.invalid",
}));
const validCounts = () =>
	Array.from({ length: 45 }, (_, index) => (index < 6 ? 1 : 0));
let feed = { totalGenerations: 1, numberCounts: validCounts() };
let context = { targetRound: 100, serverTime: 1 };
let previewFailure = false;
mock.module("../../pages/www/src/lib/server/generation-preview", () => ({
	getGenerationPreview: async () => {
		if (previewFailure) throw new Error("preview unavailable");
		return { context, feed };
	},
}));
mock.module(
	Bun.resolveSync("trailbase", `${import.meta.dir}/../../pages/www`),
	() => ({
		initClient: () => ({
			records: () => ({ list: async () => ({ records: [] }) }),
		}),
	}),
);
globalThis.fetch = (async (input: string | URL | Request) =>
	String(input).includes("/activity")
		? new Response("not deployed", { status: 404 })
		: Response.json(feed)) as typeof fetch;
const { getActivityPreview } = await import(
	"../../pages/www/src/lib/server/activity-preview"
);
expect((await getActivityPreview())?.round).toBe(100);
feed = { ...feed, numberCounts: [1] };
expect(await getActivityPreview()).toBeNull();
feed = { totalGenerations: 1, numberCounts: validCounts() };
context = { ...context, serverTime: 1.5 };
expect(await getActivityPreview()).toBeNull();
context = { targetRound: 99, serverTime: 1 };
expect(await getActivityPreview(100)).toBeNull();
previewFailure = true;
expect(await getActivityPreview()).toBeNull();
previewFailure = false;
context = { targetRound: 100, serverTime: 1 };
feed = { ...feed, numberCounts: [1] };

const draw = { drwNo: 100, drwtNo1: 1 };
mock.module("$lib/server/activity-preview", () => ({ getActivityPreview }));
mock.module("$lib/utils/lotto-api", () => ({
	getLatestLottoRound: async () => ({ drwNo: 100 }),
	getLottoNumbers: async () => draw,
}));
const { load } = await import(
	"../../pages/www/src/routes/history/+page.server"
);
const result = await load({
	url: new URL("https://preview.invalid/history"),
} as Parameters<typeof load>[0]);
expect(result).toMatchObject({
	error: null,
	activity: null,
	lottoNumbers: draw,
	targetRound: 100,
});
console.log("optional malformed activity never suppresses draw results");
