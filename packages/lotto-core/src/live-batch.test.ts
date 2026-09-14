import { expect, test } from "bun:test";
import { type BatchTimer, createLiveBatch, LIVE_BATCH_MS } from "./live-batch";

function clock() {
	let now = 0;
	const jobs = new Map<() => void, number>();
	const timer: BatchTimer = (callback, delay) => {
		jobs.set(callback, now + delay);
		return () => {
			jobs.delete(callback);
		};
	};
	return {
		timer,
		advance(ms: number) {
			const until = now + ms;
			for (;;) {
				const next = [...jobs].sort((a, b) => a[1] - b[1])[0];
				if (!next || next[1] > until) break;
				now = next[1];
				jobs.delete(next[0]);
				next[0]();
			}
			now = until;
		},
	};
}

test("continuous bursts publish the latest absolute counters once per second without starving", () => {
	const time = clock();
	const frames: number[][] = [];
	const batch = createLiveBatch<number[]>(
		(value) => frames.push(value),
		time.timer,
	);
	const counts = Array<number>(45).fill(0);
	for (let second = 0; second < 5; second++) {
		for (let event = 0; event < 1000; event++) {
			for (let n = 0; n < 6; n++) counts[(event + n) % 45]++;
			batch.push([...counts]);
			time.advance(1);
		}
		expect(frames).toHaveLength(second + 1);
		expect(frames.at(-1)).toEqual(counts);
		expect(frames.at(-1)?.reduce((a, b) => a + b, 0)).toBe((second + 1) * 6000);
	}
	time.advance(LIVE_BATCH_MS);
	expect(frames).toHaveLength(5);
});

test("explicit baseline flush and cancellation cannot replay stale rounds or unmounted work", () => {
	const time = clock();
	const frames: string[] = [];
	const batch = createLiveBatch<string>(
		(value) => frames.push(value),
		time.timer,
	);
	batch.push("baseline");
	batch.flush();
	time.advance(LIVE_BATCH_MS);
	expect(frames).toEqual(["baseline"]);
	batch.push("old round");
	time.advance(900);
	batch.cancel();
	batch.push("new round");
	time.advance(100);
	expect(frames).toEqual(["baseline"]);
	time.advance(900);
	expect(frames).toEqual(["baseline", "new round"]);
	batch.push("unmounted");
	batch.cancel();
	batch.flush();
	time.advance(2000);
	expect(frames).toEqual(["baseline", "new round"]);
});

test("void subscription signals from both streams coalesce into one refresh", () => {
	const time = clock();
	let calls = 0;
	const batch = createLiveBatch<void>(() => {
		calls++;
	}, time.timer);
	for (let i = 0; i < 1000; i++) batch.push();
	time.advance(999);
	expect(calls).toBe(0);
	time.advance(1);
	expect(calls).toBe(1);
});
