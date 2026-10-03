import { expect, test } from "bun:test";
import type { RoundContext } from "@645/lotto-core";
import { createProductTelemetry } from "./product-telemetry";
import { createSavedStore } from "./saved-store";
import { loadLottoStartup } from "./startup";

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}
const context: RoundContext = {
	targetRound: 1244,
	latestDraw: null,
	serverTime: 1,
	closesAt: 2,
	drawsAt: 3,
};
const flush = async () => {
	for (let i = 0; i < 12; i++) await Promise.resolve();
};
test("context and account start independently; private state does not wait for local collection reads", async () => {
	const round = deferred<RoundContext>();
	const stored = deferred<string | null>();
	const steps: string[] = [];
	const api = {
		context: () => round.promise,
		ensure: async () => {
			steps.push("session");
			return { id: "local", displayName: "" };
		},
		saved: () =>
			createSavedStore(
				{ getItem: () => stored.promise, setItem: () => {} },
				"saved",
			),
	};
	const loading = loadLottoStartup(api, {
		active: () => true,
		context: () => steps.push("context"),
		user: () => steps.push("user"),
		saved: () => steps.push("saved"),
		private: async () => {
			steps.push("private");
		},
		track: createProductTelemetry(() => {}),
	});
	await flush();
	expect(steps).toEqual(["session", "user", "private"]);
	round.resolve(context);
	stored.resolve(null);
	await loading;
	expect(steps).toContain("context");
	expect(steps).toContain("saved");
});
test("late bootstrap replies cannot publish after cancellation", async () => {
	const round = deferred<RoundContext>();
	const account = deferred<{ id: string; displayName: string }>();
	let active = true;
	const steps: string[] = [];
	const loading = loadLottoStartup(
		{
			context: () => round.promise,
			ensure: () => account.promise,
			saved: () =>
				createSavedStore({ getItem: () => null, setItem: () => {} }, "saved"),
		},
		{
			active: () => active,
			context: () => steps.push("context"),
			user: () => steps.push("user"),
			saved: () => steps.push("saved"),
			private: async () => {
				steps.push("private");
			},
			track: createProductTelemetry(() => {}),
		},
	);
	active = false;
	round.resolve(context);
	account.resolve({ id: "old", displayName: "" });
	await loading;
	expect(steps).toEqual([]);
});

const callbacks = () => ({
	active: () => true,
	context: () => {},
	user: () => {},
	saved: () => {},
	private: async () => {},
	track: createProductTelemetry(() => {}),
});

test("context failures are reported while an unrelated local read is still pending", async () => {
	const stored = deferred<string | null>();
	let error: unknown;
	const loading = loadLottoStartup(
		{
			context: async () => {
				throw new Error("context offline");
			},
			ensure: async () => ({ id: "local", displayName: "" }),
			saved: () =>
				createSavedStore(
					{ getItem: () => stored.promise, setItem: () => {} },
					"saved",
				),
		},
		callbacks(),
	).catch((value) => {
		error = value;
	});
	await flush();
	expect(error).toBeInstanceOf(Error);
	expect((error as Error).message).toBe("context offline");
	stored.resolve(null);
	await loading;
});

test("saved read failures are reported while private state is still pending", async () => {
	const privateState = deferred<void>();
	let error: unknown;
	const loading = loadLottoStartup(
		{
			context: async () => context,
			ensure: async () => ({ id: "local", displayName: "" }),
			saved: () =>
				createSavedStore(
					{
						getItem: () => Promise.reject(new Error("storage offline")),
						setItem: () => {},
					},
					"saved",
				),
		},
		{ ...callbacks(), private: () => privateState.promise },
	).catch((value) => {
		error = value;
	});
	await flush();
	expect(error).toBeInstanceOf(Error);
	expect((error as Error).message).toBe("storage offline");
	privateState.resolve();
	await loading;
});
