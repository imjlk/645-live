import { expect, test } from "bun:test";
import { createPromotionRefresh } from "./promotion-refresh";

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
test("all 22 pending claims receive three checks in fair batches of at most five", async () => {
	const clock = timers();
	const calls: string[][] = [];
	const controller = createPromotionRefresh(async (ids) => {
		calls.push(ids);
	}, clock.schedule);
	const ids = Array.from({ length: 22 }, (_, i) => `claim-${i}`);
	controller.update([...ids, ids[0], ""]);
	for (let i = 0; i < 20; i++) await clock.next();
	expect(calls.every((batch) => batch.length <= 5)).toBe(true);
	for (const id of ids)
		expect(calls.flat().filter((value) => value === id)).toHaveLength(3);
	expect(new Set(calls.slice(0, 5).flat()).size).toBe(22);
	expect(clock.pending()).toBe(0);
});
test("busy and pending-set transitions preserve each claim's attempt budget", async () => {
	const clock = timers();
	const calls: string[][] = [];
	const controller = createPromotionRefresh(async (ids) => {
		calls.push(ids);
	}, clock.schedule);
	controller.update(["a"]);
	await clock.next();
	controller.update(["a"], true);
	expect(clock.pending()).toBe(0);
	controller.update(["a"]);
	await clock.next();
	controller.update(["a", "b"], true);
	controller.update(["a", "b"]);
	for (let i = 0; i < 6; i++) await clock.next();
	controller.update(["a", "b"], true);
	controller.update(["a", "b"]);
	expect(clock.pending()).toBe(0);
	expect(calls.flat().filter((id) => id === "a")).toHaveLength(3);
	expect(calls.flat().filter((id) => id === "b")).toHaveLength(3);
});
test("busy transitions during an in-flight request cannot overlap requests", async () => {
	const clock = timers();
	let release = () => {};
	const response = new Promise<void>((resolve) => {
		release = resolve;
	});
	const calls: string[][] = [];
	const controller = createPromotionRefresh(async (ids) => {
		calls.push(ids);
		await response;
	}, clock.schedule);
	controller.update(["a"]);
	await clock.next();
	controller.update(["a"], true);
	controller.update(["a", "b"]);
	expect(clock.pending()).toBe(0);
	expect(calls).toEqual([["a"]]);
	release();
	await clock.next();
	expect(clock.pending()).toBe(1);
	controller.dispose();
	expect(clock.pending()).toBe(0);
});
test("closing during an in-flight request prevents subsequent checks", async () => {
	const clock = timers();
	let release = () => {};
	const result = new Promise<void>((resolve) => {
		release = resolve;
	});
	let calls = 0;
	const controller = createPromotionRefresh(async () => {
		calls++;
		await result;
	}, clock.schedule);
	controller.update(["a"]);
	await clock.next();
	controller.dispose();
	release();
	await clock.next();
	expect(calls).toBe(1);
	expect(clock.pending()).toBe(0);
});
test("empty claims and repeated errors remain bounded", async () => {
	const clock = timers();
	let calls = 0;
	const controller = createPromotionRefresh(async () => {
		calls++;
		throw new Error("offline");
	}, clock.schedule);
	controller.update([]);
	expect(clock.pending()).toBe(0);
	controller.update(["a", "a", ""]);
	for (let i = 0; i < 5; i++) await clock.next();
	expect(calls).toBe(3);
	expect(clock.pending()).toBe(0);
});
