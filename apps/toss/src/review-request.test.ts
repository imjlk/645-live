import { expect, test } from "bun:test";
import { createReviewRequest, REVIEW_COOLDOWN_MS } from "./review-request";

function fixture() {
	let raw: string | null = null;
	let now = 1_000_000;
	let calls = 0;
	const sources: string[] = [];
	const deps = {
		key: "review",
		storage: {
			getItem: () => raw,
			setItem: (_: string, value: string) => {
				raw = value;
			},
		},
		supported: () => true,
		request: async () => {
			calls++;
		},
		onRequested: (source: string) => sources.push(source),
		now: () => now,
	};
	return {
		deps,
		calls: () => calls,
		sources,
		advance: () => {
			now += REVIEW_COOLDOWN_MS;
		},
		setRaw: (value: string) => {
			raw = value;
		},
	};
}
const opportunity = {
	source: "save" as const,
	eligible: true,
	canShow: () => true,
};

test("successful task requests are limited to one session and thirty days across sessions", async () => {
	const f = fixture();
	const first = createReviewRequest(f.deps);
	expect(await first.consider(opportunity)).toBe(true);
	expect(await first.consider({ ...opportunity, source: "results" })).toBe(
		false,
	);
	expect(await createReviewRequest(f.deps).consider(opportunity)).toBe(false);
	f.advance();
	expect(
		await createReviewRequest(f.deps).consider({
			...opportunity,
			source: "results",
		}),
	).toBe(true);
	expect(f.calls()).toBe(2);
	expect(f.sources).toEqual(["save", "results"]);
});

test("ineligible, unsupported and hidden opportunities do not touch storage or invoke the SDK", async () => {
	const f = fixture();
	const reviews = createReviewRequest({
		...f.deps,
		storage: {
			...f.deps.storage,
			getItem: () => {
				throw new Error("must not read");
			},
		},
	});
	expect(await reviews.consider({ ...opportunity, eligible: false })).toBe(
		false,
	);
	expect(await reviews.consider({ ...opportunity, canShow: () => false })).toBe(
		false,
	);
	expect(
		await createReviewRequest({ ...f.deps, supported: () => false }).consider(
			opportunity,
		),
	).toBe(false);
	expect(f.calls()).toBe(0);
});

test("pending storage reads deduplicate concurrent requests and recheck the screen before calling", async () => {
	const f = fixture();
	let release!: (value: string | null) => void;
	let visible = true;
	const reviews = createReviewRequest({
		...f.deps,
		storage: {
			...f.deps.storage,
			getItem: () =>
				new Promise<string | null>((resolve) => {
					release = resolve;
				}),
		},
	});
	const pending = reviews.consider({ ...opportunity, canShow: () => visible });
	expect(await reviews.consider(opportunity)).toBe(false);
	visible = false;
	release(null);
	expect(await pending).toBe(false);
	expect(f.calls()).toBe(0);
});

test("SDK and persistence failures do not reject or repeat the completed user action", async () => {
	const f = fixture();
	const reviews = createReviewRequest({
		...f.deps,
		request: async () => {
			throw new Error("suppressed");
		},
		storage: {
			...f.deps.storage,
			setItem: () => {
				throw new Error("storage unavailable");
			},
		},
	});
	expect(await reviews.consider(opportunity)).toBe(true);
	expect(await reviews.consider(opportunity)).toBe(false);
	expect(f.sources).toEqual(["save"]);
});

test("storage-read outages skip the optional prompt instead of interrupting the task", async () => {
	const f = fixture();
	expect(
		await createReviewRequest({
			...f.deps,
			storage: {
				...f.deps.storage,
				getItem: () => Promise.reject(new Error("read unavailable")),
			},
		}).consider(opportunity),
	).toBe(false);
	expect(f.calls()).toBe(0);
});

test("malformed metadata cannot imply a previous review and clock rollback does not spam", async () => {
	const f = fixture();
	f.setRaw("not json");
	expect(await createReviewRequest(f.deps).consider(opportunity)).toBe(true);
	f.setRaw(JSON.stringify(9_000_000));
	expect(await createReviewRequest(f.deps).consider(opportunity)).toBe(false);
	expect(f.calls()).toBe(1);
});
