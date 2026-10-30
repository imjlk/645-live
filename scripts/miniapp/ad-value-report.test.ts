import { expect, test } from "bun:test";
import { type AdValueRow, compareAdValue } from "./ad-value-report";

const rows: AdValueRow[] = [
	{
		variant: "control",
		periodStart: "2026-11-01T00:00:00Z",
		periodEnd: "2026-11-08T00:00:00Z",
		currency: "KRW",
		exposedUsers: 100,
		adRevenue: 1000,
		promotionCost: 2000,
	},
	{
		variant: "short",
		periodStart: "2026-11-01T00:00:00Z",
		periodEnd: "2026-11-08T00:00:00Z",
		currency: "KRW",
		exposedUsers: 100,
		adRevenue: 2300,
		promotionCost: 2000,
	},
];
test("compares settled contribution per exposed user, not gross impressions", () => {
	const result = compareAdValue(rows);
	expect(result.netPerUserDifference).toBe(13);
	expect(result.variants[0].netContribution).toBe(-1000);
	expect(
		compareAdValue(rows.map((row) => ({ ...row, exposedUsers: 0 })))
			.netPerUserDifference,
	).toBeNull();
});
test("rejects mixed periods, currency, duplicate arms and invalid totals", () => {
	for (const patch of [
		{ currency: "USD" },
		{ periodEnd: "2026-11-09T00:00:00Z" },
		{ exposedUsers: -1 },
		{ adRevenue: NaN },
		{ variant: "control" as const },
	])
		expect(() => compareAdValue([rows[0], { ...rows[1], ...patch }])).toThrow();
});
