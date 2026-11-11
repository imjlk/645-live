import { expect, test } from "bun:test";
import {
	completionMatches,
	createAdCompletionRecovery,
	normalizeAdCompletion,
} from "./ad-completion";

function fixture() {
	const data = new Map<string, string>();
	let account = "account-a";
	let active = true;
	const events: string[] = [];
	const calls: string[] = [];
	let complete = async (_id: string, _events: string[]) => ({
		feature: "generation_continue",
	});
	const deps = {
		scope: async () => ({
			key: account,
			storage: {
				getItem: (k: string) => data.get(k) ?? null,
				setItem: (k: string, v: string) => {
					data.set(k, v);
				},
			},
		}),
		complete: (id: string, evidence: string[]) => {
			calls.push(id);
			return complete(id, evidence);
		},
		errorCode: (error: unknown) =>
			error instanceof Error ? error.message : null,
		retryable: (error: unknown) => error instanceof TypeError,
		active: () => active,
		track: (name: string) => {
			events.push(name);
		},
		wait: async () => {},
	};
	return {
		data,
		events,
		calls,
		controller: () => createAdCompletionRecovery(deps),
		setAccount: (v: string) => {
			account = v;
		},
		stop: () => {
			active = false;
		},
		complete: (fn: typeof complete) => {
			complete = fn;
		},
	};
}
const receipt = {
	placement: "generation_continue",
	id: "session-1",
	events: ["show", "userEarnedReward", "dismissed"],
	opportunityKey: "prompt-1",
};

test("lost response retries the same committed session, never another ad or grant", async () => {
	const f = fixture();
	let granted = 0;
	f.complete(async () => {
		if (!granted) {
			granted++;
			throw new TypeError("lost response");
		}
		return { feature: "generation_continue" };
	});
	const c = f.controller();
	await c.load();
	await c.save(receipt);
	await c.settle();
	expect(granted).toBe(1);
	expect(f.calls).toEqual(["session-1", "session-1"]);
	expect(c.pending).toBeNull();
	expect(JSON.parse(f.data.get("account-a") ?? "{}")).toBeNull();
	expect(f.events).toEqual(["completion_retry", "completion_recovered"]);
});
test("exhausted retry survives restart and remains bound to its original opportunity and account", async () => {
	const f = fixture();
	f.complete(async () => {
		throw new TypeError("offline");
	});
	const c = f.controller();
	await c.load();
	await c.save(receipt);
	await expect(c.settle()).rejects.toThrow();
	expect(f.calls).toHaveLength(2);
	const next = f.controller();
	await next.load();
	expect(next.pending?.id).toBe("session-1");
	if (!next.pending) throw new Error("Missing persisted receipt");
	expect(
		completionMatches(next.pending, "generation_continue", "prompt-1"),
	).toBe(true);
	expect(
		completionMatches(next.pending, "generation_continue", "prompt-2"),
	).toBe(false);
	expect(
		completionMatches(next.pending, "attendance_restore", "prompt-1"),
	).toBe(false);
	f.setAccount("account-b");
	await next.load();
	expect(next.pending).toBeNull();
	f.setAccount("account-a");
	await next.load();
	expect(next.pending?.id).toBe("session-1");
});
test("authoritative expiration clears the receipt without retrying", async () => {
	const f = fixture();
	f.complete(async () => {
		throw new Error("AD_EXPIRED");
	});
	const c = f.controller();
	await c.load();
	await c.save(receipt);
	await expect(c.settle()).rejects.toThrow("AD_EXPIRED");
	expect(f.calls).toHaveLength(1);
	expect(c.pending).toBeNull();
});
test("disposal during completion preserves the receipt and cannot apply a late result", async () => {
	const f = fixture();
	f.complete(async () => {
		f.stop();
		return { feature: "generation_continue" };
	});
	const c = f.controller();
	await c.load();
	await c.save(receipt);
	await expect(c.settle()).rejects.toThrow();
	expect(c.pending?.id).toBe("session-1");
});
test("stored receipt projection rejects fabricated events, stale entries and unrelated fields", () => {
	const value = { ...receipt, savedAt: Date.now(), token: "secret" };
	expect(normalizeAdCompletion(value)).not.toHaveProperty("token");
	expect(
		normalizeAdCompletion({ ...value, events: ["fakeReward"] }),
	).toBeNull();
	expect(
		normalizeAdCompletion({ ...value, savedAt: Date.now() - 86_400_001 }),
	).toBeNull();
	expect(normalizeAdCompletion({ ...value, placement: "purchase" })).toBeNull();
});
