import { readFileSync } from "node:fs";
export type AdValueRow = {
	variant: "control" | "short";
	periodStart: string;
	periodEnd: string;
	currency: string;
	exposedUsers: number;
	adRevenue: number;
	promotionCost: number;
};
/** Aggregated, settled amounts only. Never infer revenue from SDK completion events. */
export function compareAdValue(rows: AdValueRow[]) {
	if (
		rows.length !== 2 ||
		new Set(rows.map((row) => row.variant)).size !== 2 ||
		!rows.some((row) => row.variant === "control") ||
		!rows.some((row) => row.variant === "short")
	)
		throw Error("One aggregate per variant is required");
	const reference = rows[0];
	for (const row of rows) {
		if (
			!Number.isFinite(Date.parse(row.periodStart)) ||
			!Number.isFinite(Date.parse(row.periodEnd)) ||
			Date.parse(row.periodStart) >= Date.parse(row.periodEnd)
		)
			throw Error("Invalid reporting period");
		if (
			row.periodStart !== reference.periodStart ||
			row.periodEnd !== reference.periodEnd ||
			!row.currency ||
			row.currency !== reference.currency
		)
			throw Error("Periods and currency must match");
		if (
			!Number.isSafeInteger(row.exposedUsers) ||
			row.exposedUsers < 0 ||
			!Number.isFinite(row.adRevenue) ||
			row.adRevenue < 0 ||
			!Number.isFinite(row.promotionCost) ||
			row.promotionCost < 0
		)
			throw Error("Invalid aggregate totals");
	}
	const variants = rows.map((row) => ({
		...row,
		netContribution: row.adRevenue - row.promotionCost,
		netPerExposedUser: row.exposedUsers
			? (row.adRevenue - row.promotionCost) / row.exposedUsers
			: null,
	}));
	const control = variants.find((row) => row.variant === "control");
	const treatment = variants.find((row) => row.variant === "short");
	return {
		variants,
		netPerUserDifference:
			control?.netPerExposedUser != null && treatment?.netPerExposedUser != null
				? treatment.netPerExposedUser - control.netPerExposedUser
				: null,
	};
}
if (import.meta.main) {
	const file = process.argv[2];
	if (!file)
		throw Error(
			"Usage: bun scripts/miniapp/ad-value-report.ts aggregates.json",
		);
	console.log(
		JSON.stringify(
			compareAdValue(JSON.parse(readFileSync(file, "utf8"))),
			null,
			2,
		),
	);
}
