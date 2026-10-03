import { expect, test } from "bun:test";
import { createPrivateRefresh } from "./private-refresh";

test("ordinary refreshes share work; settlement waits for old work then requires a fresh read", async () => {
	let reads = 0;
	let release!: () => void;
	const refresh = createPrivateRefresh(async () => {
		reads++;
		if (reads === 1)
			await new Promise<void>((resolve) => {
				release = resolve;
			});
	});
	const old = refresh();
	const duplicate = refresh();
	await Promise.resolve();
	expect(reads).toBe(1);
	const afterMutation = refresh(true);
	const another = refresh(true);
	await Promise.resolve();
	expect(reads).toBe(1);
	release();
	await Promise.all([old, duplicate, afterMutation, another]);
	expect(reads).toBe(2);
	await refresh();
	expect(reads).toBe(3);
});
test("an older failed read cannot prevent mutation settlement from checking again", async () => {
	let calls = 0;
	const refresh = createPrivateRefresh(async () => {
		if (++calls === 1) throw new Error("lost response");
	});
	const prior = refresh();
	const settled = refresh(true);
	await expect(prior).rejects.toThrow("lost response");
	await settled;
	expect(calls).toBe(2);
});
