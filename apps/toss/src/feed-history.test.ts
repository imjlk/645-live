import { expect, test } from "bun:test";
import type { Feed, Generation } from "@645/lotto-core";
import { shuffleAdGroups, withFeedAds } from "./feed-ad-slots";
import { createFeedHistory, deletedGenerationId } from "./feed-history";

const entries = (high: number, low: number, round = 1242): Generation[] =>
	Array.from({ length: Math.max(0, high - low + 1) }, (_, i) => ({
		id: high - i,
		round,
		numbers: [1, 2, 3, 4, 5, 6],
		displayName: "테스트",
		createdAt: high - i,
	}));
const page = (
	high: number,
	low: number,
	nextCursor: string | null,
	serverTime = high,
	round = 1242,
): Feed => ({
	round,
	generations: entries(high, low, round),
	nextCursor,
	serverTime,
	totalGenerations: high,
	numberCounts: Array(45).fill(0),
	activeUsers: 1,
});
const deferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
};

test("paging retains the reading snapshot during new inserts and concurrent deletions", async () => {
	const pending = deferred<Feed>();
	let calls = 0;
	const history = createFeedHistory(async (round, _signal, cursor) => {
		expect(round).toBe(1242);
		expect(cursor).toBe("1242:31");
		calls++;
		return pending.promise;
	});
	history.receive(page(60, 31, "1242:31"));
	history.follow(false);
	const loading = history.loadMore();
	await history.loadMore();
	expect(calls).toBe(1);
	history.receive(page(65, 36, "1242:36"));
	history.remove(45);
	history.remove(20);
	pending.resolve(page(30, 1, null));
	await loading;
	const state = history.getSnapshot();
	expect(state.items.map((g) => g.id)).toEqual(
		entries(60, 1)
			.map((g) => g.id)
			.filter((id) => id !== 45 && id !== 20),
	);
	expect(state.hasNewer).toBe(true);
	expect(state.nextCursor).toBeNull();
	history.receive(page(66, 37, "1242:37"));
	expect(history.getSnapshot().items).toHaveLength(58);
	history.showLatest();
	expect(history.getSnapshot().items[0].id).toBe(66);
	expect(history.getSnapshot().items.some((g) => g.id === 45)).toBe(false);
});

test("refresh and round rollover ignore slow pages from an earlier snapshot", async () => {
	const pending = deferred<Feed>();
	let signal: AbortSignal | undefined;
	const history = createFeedHistory(async (_round, nextSignal) => {
		signal = nextSignal;
		return pending.promise;
	});
	history.receive(page(60, 31, "1242:31"));
	const oldPage = history.loadMore();
	history.receive(page(70, 70, null, 100, 1243));
	expect(signal?.aborted).toBe(true);
	pending.resolve(page(30, 1, null));
	await oldPage;
	expect(history.getSnapshot().items.map((g) => g.id)).toEqual([70]);
	expect(history.getSnapshot().round).toBe(1243);
	history.receive(page(60, 31, "1242:31", 200));
	expect(history.getSnapshot().round).toBe(1243);
});

test("failed pages remain retryable without clearing already loaded entries", async () => {
	let fail = true;
	const history = createFeedHistory(async () => {
		if (fail) throw new Error("연결 끊김");
		return page(30, 1, null);
	});
	history.receive(page(60, 31, "1242:31"));
	await history.loadMore();
	expect(history.getSnapshot().items).toHaveLength(30);
	expect(history.getSnapshot().nextCursor).toBe("1242:31");
	expect(history.getSnapshot().error).toBe("연결 끊김");
	fail = false;
	await history.loadMore();
	expect(history.getSnapshot().items).toHaveLength(60);
	expect(history.getSnapshot().error).toBeNull();
});

test("pages deleted during loading advance automatically even without a list size change", async () => {
	const first = deferred<Feed>();
	const cursors: string[] = [];
	const history = createFeedHistory(async (_round, _signal, cursor) => {
		cursors.push(cursor);
		return cursors.length === 1 ? first.promise : page(0, 1, null);
	});
	history.receive(page(60, 31, "1242:31"));
	const pending = history.loadMore();
	for (let id = 1; id <= 30; id++) history.remove(id);
	first.resolve(page(30, 1, "1242:1"));
	await pending;
	expect(cursors).toEqual(["1242:31", "1242:1"]);
	expect(history.getSnapshot().nextCursor).toBeNull();
	expect(history.getSnapshot().loading).toBe(false);
});

test("live first-page snapshots remove deleted entries without offset pagination", () => {
	const history = createFeedHistory(async () => page(0, 1, null));
	history.receive(page(5, 1, null));
	history.follow(false);
	history.receive({
		...page(5, 1, null, 6),
		generations: entries(5, 1).filter((g) => g.id !== 3),
	});
	expect(history.getSnapshot().items.map((g) => g.id)).toEqual([5, 4, 2, 1]);
	expect(deletedGenerationId('{"Delete":{"id":3}}')).toBe(3);
	for (const value of [
		"null",
		'{"Insert":{"id":3}}',
		"invalid",
		'{"Delete":{"id":"3"}}',
	])
		expect(deletedGenerationId(value)).toBeNull();
});

test("feed ad pools rotate without adjacent duplicate groups and stay stable on append", () => {
	const pool = shuffleAdGroups([" a ", "b", "a", "c", ""], () => 0);
	expect(new Set(pool).size).toBe(3);
	const initial = withFeedAds(entries(90, 61), pool);
	const extended = withFeedAds(entries(90, 1), pool);
	const slots = extended.filter((row) => row.kind === "ad");
	expect(slots).toHaveLength(5);
	for (let i = 1; i < slots.length; i++)
		expect(slots[i].groupId).not.toBe(slots[i - 1].groupId);
	expect(extended.slice(0, initial.length)).toEqual(initial);
	expect(
		withFeedAds(entries(20, 1), []).filter((r) => r.kind === "ad"),
	).toHaveLength(0);
});
