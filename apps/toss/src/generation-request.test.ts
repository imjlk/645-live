import { describe, expect, test } from "bun:test";
import { EMPTY_OPTIONS, type RoundContext } from "@645/lotto-core";
import {
	createGenerationRequest,
	type GenerationResponse,
} from "./generation-request";

const context: RoundContext = {
	targetRound: 1242,
	serverTime: 1,
	closesAt: 2,
	drawsAt: 3,
	latestDraw: null,
};
const response: GenerationResponse = {
	generation: {
		id: 1,
		round: 1242,
		numbers: [1, 2, 3, 4, 5, 6],
		displayName: "tester",
		createdAt: 1,
	},
	replayed: false,
};
function fixture(errors: string[] = []) {
	const calls: { id: string; round: number; local: boolean | undefined }[] = [];
	let gets = 0;
	let ids = 0;
	const generate = createGenerationRequest({
		context: async () => {
			gets++;
			return { ...context, targetRound: 1243 };
		},
		generate: async (id, round, _options, local) => {
			calls.push({ id, round, local });
			const error = errors.shift();
			if (error) throw error;
			return response;
		},
		errorCode: (error) => (typeof error === "string" ? error : null),
		newRequestId: () => `request-${++ids}`,
	});
	return { generate, calls, gets: () => gets };
}
describe("generation request path", () => {
	test("normal generation needs one POST and no preflight GET", async () => {
		const f = fixture();
		expect((await f.generate(EMPTY_OPTIONS, context, true)).response).toBe(
			response,
		);
		expect(f.gets()).toBe(0);
		expect(f.calls).toEqual([{ id: "request-1", round: 1242, local: true }]);
	});
	test("a server round rollover refreshes once and retries a new request", async () => {
		const f = fixture(["ROUND_CHANGED"]);
		await f.generate(EMPTY_OPTIONS, context, true);
		expect(f.gets()).toBe(1);
		expect(f.calls.map((c) => [c.id, c.round])).toEqual([
			["request-1", 1242],
			["request-2", 1243],
		]);
	});
	test("network retries preserve the ID to avoid publishing or counting twice", async () => {
		const f = fixture(["NETWORK"]);
		await expect(f.generate(EMPTY_OPTIONS, context, true)).rejects.toBe(
			"NETWORK",
		);
		await f.generate(EMPTY_OPTIONS, context, true);
		expect(f.calls.map((c) => c.id)).toEqual(["request-1", "request-1"]);
	});
	test("invalid options and expired passes discard the failed request", async () => {
		for (const code of [
			"INVALID_OPTIONS",
			"PASS_REQUIRED",
			"GENERATION_DELETED",
		]) {
			const f = fixture([code]);
			await expect(f.generate(EMPTY_OPTIONS, context, false)).rejects.toBe(
				code,
			);
			await f.generate(EMPTY_OPTIONS, context, false);
			expect(f.calls.map((c) => c.id)).toEqual(["request-1", "request-2"]);
		}
	});
	test("a second rollover error stops without an unbounded retry loop", async () => {
		const f = fixture(["ROUND_CHANGED", "ROUND_CHANGED"]);
		await expect(f.generate(EMPTY_OPTIONS, context, true)).rejects.toBe(
			"ROUND_CHANGED",
		);
		expect(f.gets()).toBe(1);
		expect(f.calls).toHaveLength(2);
	});
});
