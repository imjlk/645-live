import { expect, test } from "bun:test";
import { createGenerationCooldown } from "./generation-cooldown";

test("rapid taps share one interval measured from the initial tap", () => {
	let time = 0;
	const timers: { run: () => void; cancelled: boolean; delay: number }[] = [];
	const gate = createGenerationCooldown(
		() => time,
		(run, delay) => {
			const timer = { run, cancelled: false, delay };
			timers.push(timer);
			return () => {
				timer.cancelled = true;
			};
		},
	);
	gate.start();
	expect(gate.blocked()).toBe(true);
	expect(gate.getSnapshot()).toBe(true);
	time = 999;
	expect(gate.blocked()).toBe(true);
	time = 1000;
	timers[0].run();
	expect(gate.blocked()).toBe(false);
	expect(gate.getSnapshot()).toBe(false);
	gate.start();
	gate.stop();
	expect(timers[1].cancelled).toBe(true);
	expect(gate.getSnapshot()).toBe(false);
	expect(gate.blocked()).toBe(false);
});
