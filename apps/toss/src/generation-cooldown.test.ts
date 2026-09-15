import { expect, test } from "bun:test";
import { createGenerationCooldown } from "./generation-cooldown";

test("rapid taps are blocked synchronously and the response starts a fresh one-second interval", () => {
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
	time = 300;
	gate.start(); // server committed and returned the generation
	expect(timers[0].cancelled).toBe(true);
	time = 1299;
	expect(gate.blocked()).toBe(true);
	time = 1300;
	timers[1].run();
	expect(gate.blocked()).toBe(false);
	expect(gate.getSnapshot()).toBe(false);
	gate.start();
	gate.stop();
	expect(timers[2].cancelled).toBe(true);
	expect(gate.getSnapshot()).toBe(false);
	expect(gate.blocked()).toBe(false);
});
