import { Database, type SQLQueryBindings } from "bun:sqlite";
import {
	afterEach,
	beforeEach,
	expect,
	mock,
	setSystemTime,
	spyOn,
	test,
} from "bun:test";
import { readFileSync } from "node:fs";

// Run the production job against an in-memory database with the real migrations.
// Only the WASI database boundary, clock and external HTTP calls are substituted.
let db: Database;
const read = async (sql: string, params: SQLQueryBindings[]) =>
	db.query(sql).values(...params);
const query = mock(read);
mock.module("../../services/trailbase/wasm-guest/src/trailbase-compat", () => ({
	query,
	execute: () => {
		throw new Error("Unexpected execute call");
	},
	transaction: () => {
		throw new Error("Unexpected transaction call");
	},
	HttpError: Error,
	StatusCodes: {},
}));
const { executeLottoUpdate } = await import(
	"../../services/trailbase/wasm-guest/src/lotto-utils"
);
const migrations = [
	"U1750770000__create_lotto_draw_results.sql",
	"U1750771000__create_lotto_number_stats.sql",
	"U1774670400__create_lotto_bonus_stats.sql",
].map((name) =>
	readFileSync(
		new URL(
			`../../services/trailbase/traildepot/migrations/${name}`,
			import.meta.url,
		),
		"utf8",
	),
);

const originals = new Map(
	["fetch", "setTimeout", "clearTimeout"].map((key) => [
		key,
		Object.getOwnPropertyDescriptor(globalThis, key),
	]),
);
const requests = mock(
	async (_input: unknown, _init?: RequestInit): Promise<Response> =>
		new Response("Unavailable", { status: 503 }),
);
const timers = new Map<number, { delay: number; callback: () => void }>();
let nextTimer = 0;
let logs: ReturnType<typeof spyOn>[] = [];

beforeEach(() => {
	setSystemTime(new Date("2026-09-15T09:05:00+09:00"));
	db = new Database(":memory:");
	for (const sql of migrations) db.exec(sql);
	db.exec(`INSERT INTO lotto_draw_results (
		round, draw_date, total_sell_amount, first_prize_amount,
		first_prize_winner_count, first_prize_accumulated_amount,
		draw_number_1, draw_number_2, draw_number_3,
		draw_number_4, draw_number_5, draw_number_6, bonus_number
	) VALUES (1241, '2026-09-12', 1000000, 100000, 2, 200000, 1, 9, 17, 25, 33, 41, 45)`);
	query.mockClear().mockImplementation(read);
	requests
		.mockClear()
		.mockImplementation(
			async () => new Response("Unavailable", { status: 503 }),
		);
	timers.clear();
	nextTimer = 0;
	logs = ["log", "info", "warn", "error"].map((key) =>
		spyOn(console, key as "log").mockImplementation(() => {}),
	);
	for (const [key, value] of Object.entries({
		fetch: requests,
		setTimeout: (callback: () => void, delay: number) => {
			const id = ++nextTimer;
			timers.set(id, { delay, callback });
			return id;
		},
		clearTimeout: (id: number) => timers.delete(id),
	}))
		Object.defineProperty(globalThis, key, {
			configurable: true,
			writable: true,
			value,
		});
});

afterEach(() => {
	for (const spy of logs) spy.mockRestore();
	for (const [key, descriptor] of originals) {
		if (descriptor) Object.defineProperty(globalThis, key, descriptor);
		else Reflect.deleteProperty(globalThis, key);
	}
	setSystemTime();
	db.close();
});

function publishedResult(round = 1242, amount = 300000) {
	return {
		data: {
			list: [
				{
					ltEpsd: round,
					ltRflYmd: round === 1241 ? "20260912" : "20260919",
					rlvtEpsdSumNtslAmt: 2000000,
					rnk1WnAmt: amount,
					rnk1WnNope: 2,
					rnk1SumWnAmt: 600000,
					tm1WnNo: 2,
					tm2WnNo: 10,
					tm3WnNo: 18,
					tm4WnNo: 26,
					tm5WnNo: 34,
					tm6WnNo: 42,
					bnsWnNo: 44,
				},
			],
		},
	};
}

test.each([
	"2026-09-15T09:05:00+09:00", // The production failure: Tuesday daily reconcile.
	"2026-09-19T09:05:00+09:00", // Saturday daily reconcile is still before the draw.
	"2026-09-19T20:39:59.999+09:00",
])("a complete database skips the upcoming draw at %s", async (at) => {
	setSystemTime(new Date(at));
	await expect(executeLottoUpdate()).resolves.toBeUndefined();
	expect(requests).not.toHaveBeenCalled();
	expect(timers.size).toBe(0);
	expect(
		db.query("SELECT MAX(round) FROM lotto_draw_results").values(),
	).toEqual([[1241]]);
});

test("the weekly run at 20:40 KST saves the due draw and its statistics once", async () => {
	setSystemTime(new Date("2026-09-19T20:40:00+09:00"));
	requests.mockImplementation(async () => Response.json(publishedResult()));
	await executeLottoUpdate();
	await executeLottoUpdate();
	expect(requests).toHaveBeenCalledTimes(1);
	expect(String(requests.mock.calls[0][0])).toContain("srchLtEpsd=1242");
	expect(
		db.query("SELECT MAX(round) FROM lotto_draw_results").values(),
	).toEqual([[1242]]);
	expect(
		db
			.query("SELECT draw_count FROM lotto_number_stats WHERE number = 2")
			.values(),
	).toEqual([[1]]);
	expect(timers.size).toBe(0);
});

test("a weekday run repairs incomplete stored results before skipping the future draw", async () => {
	db.exec(
		"UPDATE lotto_draw_results SET first_prize_amount = 0 WHERE round = 1241",
	);
	requests.mockImplementation(async () => Response.json(publishedResult(1241)));
	await executeLottoUpdate();
	expect(requests).toHaveBeenCalledTimes(1);
	expect(String(requests.mock.calls[0][0])).toContain("srchLtEpsd=1241");
	expect(
		db
			.query("SELECT round, first_prize_amount FROM lotto_draw_results")
			.values(),
	).toEqual([[1241, 300000]]);
	expect(timers.size).toBe(0);
});

test.each([
	"unpublished",
	"http",
	"network",
	"invalid-json",
	"incomplete",
])("%s results fail once and can recover at the next scheduled invocation", async (failure) => {
	setSystemTime(new Date("2026-09-19T20:40:00+09:00"));
	requests.mockImplementation(async () => {
		if (failure === "network") throw new Error("Connection reset");
		if (failure === "http") return new Response("Unavailable", { status: 503 });
		if (failure === "invalid-json")
			return new Response("{", {
				headers: { "content-type": "application/json" },
			});
		return Response.json(
			failure === "unpublished"
				? { data: { list: [] } }
				: publishedResult(1242, 0),
		);
	});
	await expect(executeLottoUpdate()).rejects.toThrow("1242");
	expect(requests).toHaveBeenCalledTimes(1);
	expect(timers.size).toBe(0); // No one-minute retry or leaked request timer.

	setSystemTime(new Date("2026-09-19T21:10:00+09:00"));
	requests.mockImplementation(async () => Response.json(publishedResult()));
	await executeLottoUpdate();
	expect(requests).toHaveBeenCalledTimes(2);
	expect(
		db
			.query(
				"SELECT first_prize_amount FROM lotto_draw_results WHERE round = 1242",
			)
			.values(),
	).toEqual([[300000]]);
	expect(timers.size).toBe(0);
});

test.each([
	"latest",
	"incomplete",
	"empty",
	"invalid",
])("a %s database failure cannot become a successful pre-draw skip", async (failure) => {
	query.mockImplementation(async (sql, params) => {
		if (failure === "latest") throw new Error("Database unavailable");
		if (failure === "incomplete" && sql.includes("WHERE round >="))
			throw new Error("Database unavailable");
		if (failure === "empty") return [];
		if (failure === "invalid") return [["invalid"]];
		return read(sql, params);
	});
	await expect(executeLottoUpdate()).rejects.toThrow();
	expect(requests).not.toHaveBeenCalled();
	expect(timers.size).toBe(0);
});

test("the ten-second HTTP deadline also cancels a stalled response body", async () => {
	setSystemTime(new Date("2026-09-19T20:40:00+09:00"));
	let bodyStarted!: () => void;
	const readingBody = new Promise<void>((resolve) => {
		bodyStarted = resolve;
	});
	let signal: AbortSignal | null | undefined;
	requests.mockImplementation(async (_input, init) => {
		signal = init?.signal;
		const response = Response.json(publishedResult());
		response.text = () =>
			new Promise((_resolve, reject) => {
				signal?.addEventListener("abort", () => {
					reject(new DOMException("Timed out", "AbortError"));
				});
				bodyStarted();
			});
		return response;
	});
	const run = executeLottoUpdate();
	await readingBody;
	expect(signal?.aborted).toBe(false);
	expect(timers.size).toBe(1);
	const timer = [...timers.values()][0];
	expect(timer.delay).toBe(10000);
	timer.callback();
	expect(signal?.aborted).toBe(true);
	await expect(run).rejects.toThrow("1242");
	expect(requests).toHaveBeenCalledTimes(1);
	expect(timers.size).toBe(0);
});
