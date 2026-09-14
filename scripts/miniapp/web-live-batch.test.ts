import { afterAll, afterEach, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { Feed, Generation, RoundContext } from "@645/lotto-core";
import { compileModule } from "svelte/compiler";

// Exercise the actual rune-compiled client model, rather than a second copy of it.
const source = new URL(
	"../../pages/www/src/lib/generator/live.svelte.ts",
	import.meta.url,
);
const artifact = new URL(
	`../../.cache/web-live-test-${process.pid}.mjs`,
	import.meta.url,
);
mkdirSync(new URL("../../.cache/", import.meta.url), { recursive: true });
const js = new Bun.Transpiler({ loader: "ts" }).transformSync(
	readFileSync(source, "utf8"),
);
writeFileSync(
	artifact,
	compileModule(js, {
		filename: source.pathname,
		generate: "client",
	}).js.code.replace('"./api"', '"../pages/www/src/lib/generator/api.ts"'),
);
const { createLiveGenerations } = (await import(
	artifact.href
)) as typeof import("../../pages/www/src/lib/generator/live.svelte");
afterAll(() => rmSync(artifact));

const originals = new Map(
	[
		"fetch",
		"EventSource",
		"document",
		"window",
		"setTimeout",
		"clearTimeout",
	].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
);
let stop: (() => void) | undefined;
afterEach(() => {
	stop?.();
	stop = undefined;
	for (const [key, descriptor] of originals) {
		if (descriptor) Object.defineProperty(globalThis, key, descriptor);
		else Reflect.deleteProperty(globalThis, key);
	}
});
const settle = async () => {
	for (let i = 0; i < 20; i++) await Promise.resolve();
};
const context: RoundContext = {
	targetRound: 1242,
	serverTime: 1000,
	closesAt: 100000,
	drawsAt: 100000,
	latestDraw: null,
};
const baseline = (): Feed => ({
	round: 1242,
	serverTime: 1000,
	totalGenerations: 0,
	numberCounts: Array(45).fill(0),
	generations: [],
	nextCursor: null,
	activeUsers: 0,
});

function environment(initial: Feed | null = baseline()) {
	let now = 0;
	let nextTimer = 0;
	const jobs = new Map<number, { at: number; callback: () => void }>();
	class Stream {
		static all: Stream[] = [];
		onopen: (() => void) | null = null;
		onmessage: ((event: { data: string }) => void) | null = null;
		onerror: (() => void) | null = null;
		constructor(public url: string) {
			Stream.all.push(this);
		}
		close() {}
		emit(value: unknown) {
			this.onmessage?.({ data: JSON.stringify(value) });
		}
	}
	let load: (url: string) => Promise<Feed | RoundContext> = async (url) =>
		url.includes("round-context") ? context : (initial ?? baseline());
	const globals = {
		fetch: async (url: unknown) =>
			new Response(JSON.stringify(await load(String(url)))),
		EventSource: Stream,
		document: Object.assign(new EventTarget(), { visibilityState: "visible" }),
		window: new EventTarget(),
		setTimeout: (callback: () => void, delay = 0) => {
			const id = ++nextTimer;
			jobs.set(id, { at: now + delay, callback });
			return id;
		},
		clearTimeout: (id: number) => {
			jobs.delete(id);
		},
	};
	for (const [key, value] of Object.entries(globals))
		Object.defineProperty(globalThis, key, {
			configurable: true,
			writable: true,
			value,
		});
	const live = createLiveGenerations(
		{ context, feed: initial },
		() => "https://fixture.invalid",
	);
	stop = live.start();
	return {
		live,
		load: (next: typeof load) => {
			load = next;
		},
		async advance(ms: number) {
			const until = now + ms;
			for (;;) {
				const next = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
				if (!next || next[1].at > until) break;
				now = next[1].at;
				jobs.delete(next[0]);
				next[1].callback();
				await settle();
			}
			now = until;
			await settle();
		},
		counts(values: number[], total: number, at: number, round = 1242) {
			const record = {
				round,
				total_generations: total,
				updated_at: at,
				...Object.fromEntries(
					values.map((v, i) => [`generation_count_${i + 1}`, v]),
				),
			};
			const stream = Stream.all
				.filter((s) => s.url.includes("lotto_draw_generation_counts"))
				.at(-1);
			if (!stream) throw new Error("Counts subscription missing");
			stream.emit({ Update: record });
		},
		insert(id: number) {
			const numbers: Generation["numbers"] = [1, 9, 17, 25, 33, 41];
			const stream = Stream.all.find((s) =>
				s.url.includes("lotto_public_generations"),
			);
			if (!stream) throw new Error("Generations subscription missing");
			stream.emit({
				Insert: {
					id,
					round: 1242,
					display_name: "테스트",
					created_at: 1000 + id,
					...Object.fromEntries(numbers.map((n, i) => [`number_${i + 1}`, n])),
				},
			});
		},
	};
}

test("all 45 counters and rows commit together once per window; duplicate and stale frames do not animate again", async () => {
	const env = environment();
	await settle();
	const values = Array<number>(45).fill(0);
	for (let i = 1; i <= 200; i++) {
		for (let n = 0; n < 6; n++) values[(i + n) % 45]++;
		env.insert(i);
		env.counts([...values], i, 1000 + i);
	}
	expect(env.live.feed?.totalGenerations).toBe(0);
	await env.advance(999);
	expect(env.live.feed?.totalGenerations).toBe(0);
	await env.advance(1);
	expect(env.live.feed?.totalGenerations).toBe(200);
	expect(env.live.feed?.generations).toHaveLength(200);
	expect(env.live.feed?.numberCounts).toEqual(values);
	expect(env.live.deltas).toEqual(values);
	expect(env.live.previousCounts).toEqual(Array(45).fill(0));
	const pulses = [...env.live.pulses];
	env.counts([...values], 200, 1200);
	env.counts(Array(45).fill(0), 0, 1100);
	await env.advance(1000);
	expect(env.live.feed?.numberCounts).toEqual(values);
	expect(env.live.pulses).toEqual(pulses);
	await env.advance(600);
	expect(env.live.deltas).toEqual(Array(45).fill(0));
	// A correction is applied exactly, without a fictitious positive increment.
	env.counts(Array(45).fill(0), 0, 2000);
	await env.advance(1000);
	expect(env.live.feed?.totalGenerations).toBe(0);
	expect(env.live.deltas).toEqual(Array(45).fill(0));
});

test("events racing the initial fetch become a baseline instead of waiting for silence", async () => {
	const env = environment(null);
	let finish!: (feed: Feed) => void;
	const pending = new Promise<Feed>((resolve) => {
		finish = resolve;
	});
	env.load(async (url) => (url.includes("round-context") ? context : pending));
	await settle();
	const values = Array<number>(45).fill(0);
	[1, 9, 17, 25, 33, 41].forEach((n) => {
		values[n - 1] = 3;
	});
	for (let i = 1; i <= 3; i++) env.insert(i);
	env.counts(values, 3, 1100);
	finish(baseline());
	await settle();
	expect(env.live.feed?.totalGenerations).toBe(3);
	expect(env.live.feed?.generations).toHaveLength(3);
	expect(env.live.feed?.numberCounts).toEqual(values);
	expect(env.live.deltas).toEqual(Array(45).fill(0));
	await env.advance(1000);
	expect(env.live.feed?.totalGenerations).toBe(3);
});

test("a busy first snapshot retains a cursor when incoming rows exceed the display window", async () => {
	const env = environment(null);
	let finish!: (feed: Feed) => void;
	const pending = new Promise<Feed>((resolve) => {
		finish = resolve;
	});
	env.load(async (url) => (url.includes("round-context") ? context : pending));
	await settle();
	for (let id = 1; id <= 500; id++) env.insert(id);
	env.counts([500, 500, 500, 500, 500, 500, ...Array(39).fill(0)], 500, 2000);
	finish(baseline());
	await settle();
	expect(env.live.feed?.generations).toHaveLength(300);
	expect(env.live.feed?.generations.at(-1)?.id).toBe(201);
	expect(env.live.feed?.nextCursor).toBe("1242:201");
	expect(env.live.feed?.totalGenerations).toBe(500);
});

test("unmount cancels a pending burst and late events cannot change the displayed feed", async () => {
	const env = environment();
	await settle();
	env.counts(Array(45).fill(2), 15, 1100);
	stop?.();
	stop = undefined;
	env.insert(2);
	env.counts(Array(45).fill(3), 22, 1200);
	await env.advance(2000);
	expect(env.live.feed?.totalGenerations).toBe(0);
});

test("pagination preserves pending counter updates and a round switch cancels the old frame", async () => {
	const seed = baseline();
	seed.nextCursor = "1242:31";
	seed.totalGenerations = 1;
	seed.numberCounts = [1, 1, 1, 1, 1, 1, ...Array(39).fill(0)];
	seed.generations = [
		{
			id: 31,
			round: 1242,
			numbers: [1, 2, 3, 4, 5, 6],
			createdAt: 1000,
			displayName: "테스트",
		},
	];
	const env = environment(seed);
	await settle();
	let finish!: (feed: Feed) => void;
	const pending = new Promise<Feed>((resolve) => {
		finish = resolve;
	});
	env.load(async (url) =>
		url.includes("cursor=")
			? pending
			: url.includes("round-context")
				? context
				: seed,
	);
	const page = env.live.more();
	const values = [3, 3, 3, 3, 3, 3, ...Array(39).fill(0)];
	env.counts(values, 3, 1100);
	finish({
		...seed,
		generations: [{ ...seed.generations[0], id: 30 }],
		nextCursor: null,
	});
	await page;
	await env.advance(1000);
	expect(env.live.feed?.generations.map((g) => g.id)).toEqual([31, 30]);
	expect(env.live.feed?.numberCounts).toEqual(values);
	expect(env.live.deltas).toEqual([2, 2, 2, 2, 2, 2, ...Array(39).fill(0)]);
	env.counts(Array(45).fill(10), 75, 1200);
	env.load(async (url) =>
		url.includes("round-context")
			? { ...context, targetRound: 1243 }
			: { ...baseline(), round: 1243 },
	);
	await env.live.refresh();
	await env.advance(2000);
	env.counts(Array(45).fill(20), 150, 2000, 1242);
	await env.advance(1000);
	expect(env.live.feed?.round).toBe(1243);
	expect(env.live.feed?.numberCounts).toEqual(Array(45).fill(0));
	expect(env.live.deltas).toEqual(Array(45).fill(0));
});
