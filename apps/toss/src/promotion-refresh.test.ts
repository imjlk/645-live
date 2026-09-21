import { expect, test } from "bun:test";
import { startPromotionRefresh } from "./promotion-refresh";

function timers() {
	const callbacks: (() => void)[] = [];
	return {
		schedule(fn: () => void) {
			callbacks.push(fn);
			return () => {
				const i = callbacks.indexOf(fn);
				if (i >= 0) callbacks.splice(i, 1);
			};
		},
		async next() {
			callbacks.shift()?.();
			await Promise.resolve();
			await Promise.resolve();
		},
		pending: () => callbacks.length,
	};
}
test("pending claims refresh sequentially at most three times and are deduplicated", async () => {
	const clock = timers();
	const calls: string[][] = [];
	startPromotionRefresh(
		["a", "a", "b", ""],
		async (ids) => {
			calls.push(ids);
		},
		clock.schedule,
	);
	for (let i = 0; i < 5; i++) await clock.next();
	expect(calls).toEqual([
		["a", "b"],
		["a", "b"],
		["a", "b"],
	]);
	expect(clock.pending()).toBe(0);
});
test("closing a sheet during an in-flight refresh prevents further requests", async () => {
	const clock = timers();
	let release: () => void = () => {};
	const result = new Promise<void>((resolve) => {
		release = resolve;
	});
	let calls = 0;
	const cancel = startPromotionRefresh(
		["a"],
		async () => {
			calls++;
			await result;
		},
		clock.schedule,
	);
	await clock.next();
	expect(clock.pending()).toBe(0);
	cancel();
	release();
	await clock.next();
	expect(calls).toBe(1);
	expect(clock.pending()).toBe(0);
});
test("no claims never starts requests and persistent errors remain bounded", async () => {
	const clock = timers();
	let calls = 0;
	startPromotionRefresh(
		[],
		async () => {
			calls++;
		},
		clock.schedule,
	);
	expect(clock.pending()).toBe(0);
	startPromotionRefresh(
		["a"],
		async () => {
			calls++;
			throw new Error("offline");
		},
		clock.schedule,
	);
	for (let i = 0; i < 5; i++) await clock.next();
	expect(calls).toBe(3);
	expect(clock.pending()).toBe(0);
});
