import { describe, expect, test } from "bun:test";
import {
	type IndexNowManifest,
	scanCountMilestone,
} from "@645/shared/indexnow";
import {
	applySuccessfulOperations,
	classifyIndexNowStatus,
	diffManifest,
	operationUrls,
	parseManifestText,
	reconcileRetryReservation,
	retryAfterAt,
	retryDelayMs,
} from "./policy";

const manifest: IndexNowManifest = {
	schemaVersion: 1,
	generatedAt: "2026-08-22T00:00:00.000Z",
	groups: [
		{
			id: "news:lotto-1234",
			kind: "news",
			version: "v2",
			urls: ["https://645.live/news/posts/lotto-1234"],
		},
		{
			id: "scan:overview",
			kind: "scan",
			version: "1234:20",
			urls: ["https://645.live/", "https://645.live/qr-scan"],
		},
	],
};

describe("IndexNow manifest policy", () => {
	test("batches scan changes into progressively wider milestones", () => {
		expect(scanCountMilestone(20)).toBe(20);
		expect(scanCountMilestone(24)).toBe(20);
		expect(scanCountMilestone(99)).toBe(95);
		expect(scanCountMilestone(109)).toBe(100);
		expect(scanCountMilestone(1_234)).toBe(1_200);
	});

	test("validates canonical same-host URLs", () => {
		expect(
			parseManifestText(JSON.stringify(manifest), "https://645.live"),
		).toEqual(manifest);
		expect(() =>
			parseManifestText(
				JSON.stringify({
					...manifest,
					groups: [
						{
							...manifest.groups[0],
							urls: ["https://example.com/news/posts/lotto-1234"],
						},
					],
				}),
				"https://645.live",
			),
		).toThrow("INDEXNOW_MANIFEST_URL_NONCANONICAL");
	});

	test("finds changed groups and removed news without deleting runtime groups", () => {
		const published = {
			"news:lotto-1233": {
				id: "news:lotto-1233",
				kind: "news" as const,
				version: "v1",
				urls: ["https://645.live/news/posts/lotto-1233"],
			},
			"scan:missing-source": {
				id: "scan:missing-source",
				kind: "scan" as const,
				version: "v1",
				urls: ["https://645.live/n/1"],
			},
		};
		const operations = diffManifest(manifest, published);

		expect(
			operations.map((operation) => [operation.action, operation.group.id]),
		).toEqual([
			["delete", "news:lotto-1233"],
			["upsert", "news:lotto-1234"],
			["upsert", "scan:overview"],
		]);
		expect(operationUrls(operations)).toContain(
			"https://645.live/news/posts/lotto-1233",
		);
		expect(
			applySuccessfulOperations(published, operations)["news:lotto-1233"],
		).toBeUndefined();
		expect(
			applySuccessfulOperations(published, operations)["scan:missing-source"],
		).toBeDefined();
	});

	test("classifies responses and calculates bounded retries", () => {
		expect(classifyIndexNowStatus(200)).toBe("success");
		expect(classifyIndexNowStatus(202)).toBe("success");
		expect(classifyIndexNowStatus(422)).toBe("permanent-failure");
		expect(classifyIndexNowStatus(429)).toBe("retry");
		expect(retryDelayMs(0, 0)).toBe(4 * 60_000);
		expect(retryDelayMs(99, 1)).toBe(432 * 60_000);
		expect(retryAfterAt("120", 1_000)).toBe(121_000);
	});

	test("keeps the host retry floor when new content changes the batch", () => {
		const retrying = reconcileRetryReservation(
			{
				attemptCount: 2,
				blocked: false,
				nextAttemptAt: 20_000,
				signature: "old",
			},
			"new",
			10_000,
		);
		expect(retrying).toEqual({
			attemptCount: 2,
			blocked: false,
			nextAttemptAt: 20_000,
		});

		const corrected = reconcileRetryReservation(
			{
				attemptCount: 1,
				blocked: true,
				nextAttemptAt: 20_000,
				signature: "bad-config",
			},
			"corrected-config",
			10_000,
		);
		expect(corrected).toEqual({
			attemptCount: 0,
			blocked: false,
			nextAttemptAt: 10_000,
		});
	});
});
