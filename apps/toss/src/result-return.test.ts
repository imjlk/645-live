import { expect, test } from "bun:test";
import {
	type Draw,
	normalizeSaved,
	resultFingerprint,
	type SavedCombination,
} from "@645/lotto-core";
import { savedParams, unreadSavedRounds } from "./result-return";
import { createSavedStore } from "./saved-store";

const draw: Draw = {
	round: 1243,
	numbers: [1, 2, 3, 4, 5, 6],
	bonus: 7,
	drawDate: "2026-09-26",
};
const item = (id: number, round = 1243): SavedCombination => ({
	version: 1,
	id: String(id),
	generationId: id,
	round,
	numbers: [1, 2, 3, 4, 5, 6],
	savedAt: id,
});
test("saved deep links accept a positive round and ignore untrusted or malformed filters", () => {
	expect(
		savedParams({ round: "1243", entry: "notification", userId: "private" }),
	).toEqual({ round: 1243, entry: "notification" });
	for (const round of [
		0,
		-1,
		NaN,
		Infinity,
		true,
		null,
		[],
		"1.5",
		"1e3",
		"",
		"9007199254740992",
	])
		expect(savedParams({ round, entry: "unknown" })).toEqual({});
	expect(savedParams(undefined)).toEqual({});
});
test("read markers survive restart, retain saves, and reopen corrected or newly saved results", async () => {
	let raw = JSON.stringify([item(1), item(2), item(3, 1244)]);
	const storage = {
		getItem: () => raw,
		setItem: (_: string, value: string) => {
			raw = value;
		},
	};
	const store = createSavedStore(storage, "saved");
	expect(unreadSavedRounds(await store.read(), { 1243: draw })).toEqual([1243]);
	await Promise.all([
		store.viewResults(["1", "2"], resultFingerprint(draw)),
		store.add(item(4)),
	]);
	const restored = await createSavedStore(storage, "saved").read();
	expect(restored).toHaveLength(4);
	expect(restored.find((i) => i.id === "4")?.viewedResult).toBeUndefined();
	expect(unreadSavedRounds(restored, { 1243: draw })).toEqual([1243]);
	await store.viewResults(["4"], resultFingerprint(draw));
	expect(unreadSavedRounds(await store.read(), { 1243: draw })).toEqual([]);
	expect(
		unreadSavedRounds(await store.read(), { 1243: { ...draw, bonus: 8 } }),
	).toEqual([1243]);
	expect(normalizeSaved([item(1)])[0].viewedResult).toBeUndefined();
	expect(() => normalizeSaved([{ ...item(1), viewedResult: 99 }])).toThrow();
});
