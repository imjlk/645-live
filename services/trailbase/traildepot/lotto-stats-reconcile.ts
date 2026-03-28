import { query, transaction } from "./trailbase.js";

type DerivedTableHealth = {
	table: string;
	latestRound: number;
	rowCount: number;
	lastUpdatedAt: string | null;
};

type LottoStatsHealth = {
	latestDrawRound: number;
	drawCount: number;
	staleSources: string[];
	latestDrawUpdatedAt: string | null;
};

type LottoStatsReconcileResult = {
	rebuilt: boolean;
	latestDrawRound: number;
	drawCount: number;
	staleSources: string[];
	lastUpdatedAt: string | null;
};

const PER_DRAW_TABLES = [
	{ table: "lotto_draw_odd_even_stats", label: "홀짝 통계" },
	{ table: "lotto_draw_color_stats", label: "색상 통계" },
	{ table: "lotto_draw_section_stats", label: "구간 통계" },
	{ table: "lotto_draw_consecutive_stats", label: "연속번호 통계" },
	{ table: "lotto_draw_high_low_stats", label: "고저 통계" },
	{ table: "lotto_draw_repeat_stats", label: "반복번호 통계" },
	{ table: "lotto_draw_unit_digit_stats", label: "끝수 통계" },
	{ table: "lotto_draw_ac_stats", label: "AC 통계" },
	{ table: "lotto_draw_bonus_stats", label: "보너스 통계" },
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

function asNumber(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return 0;
}

function readValue(row: unknown, ...keys: string[]): unknown {
	if (Array.isArray(row)) {
		return row[0];
	}

	const record = asRecord(row);
	if (!record) {
		return undefined;
	}

	for (const key of keys) {
		if (key in record) {
			return record[key];
		}
	}

	const firstKey = Object.keys(record)[0];
	return firstKey ? record[firstKey] : undefined;
}

function readStringValue(row: unknown, ...keys: string[]): string | null {
	const value = readValue(row, ...keys);
	return typeof value === "string" && value.trim().length > 0 ? value : null;
}

async function getLatestDrawHealth(): Promise<{
	latestDrawRound: number;
	drawCount: number;
	lastUpdatedAt: string | null;
}> {
	const rows = await query(
		`SELECT
			COALESCE(MAX(round), 0) as latest_round,
			COUNT(*) as draw_count,
			MAX(updated_at) as last_updated_at
		FROM lotto_draw_results`,
		[],
	);
	const row = rows[0];

	return {
		latestDrawRound: asNumber(readValue(row, "latest_round")),
		drawCount: asNumber(readValue(row, "draw_count")),
		lastUpdatedAt: readStringValue(row, "last_updated_at"),
	};
}

async function getPerDrawTableHealth(table: string): Promise<DerivedTableHealth> {
	const rows = await query(
		`SELECT
			COALESCE(MAX(round), 0) as latest_round,
			COUNT(*) as row_count,
			MAX(updated_at) as last_updated_at
		FROM ${table}`,
		[],
	);
	const row = rows[0];

	return {
		table,
		latestRound: asNumber(readValue(row, "latest_round")),
		rowCount: asNumber(readValue(row, "row_count")),
		lastUpdatedAt: readStringValue(row, "last_updated_at"),
	};
}

async function getNumberStatsHealth() {
	const rows = await query(
		`SELECT
			COALESCE(MAX(last_draw_round), 0) as latest_round,
			COUNT(*) as row_count,
			COALESCE(SUM(draw_count), 0) as draw_sum,
			COALESCE(SUM(bonus_count), 0) as bonus_sum,
			MAX(updated_at) as last_updated_at
		FROM lotto_number_stats`,
		[],
	);
	const row = rows[0];

	return {
		latestRound: asNumber(readValue(row, "latest_round")),
		rowCount: asNumber(readValue(row, "row_count")),
		drawSum: asNumber(readValue(row, "draw_sum")),
		bonusSum: asNumber(readValue(row, "bonus_sum")),
		lastUpdatedAt: readStringValue(row, "last_updated_at"),
	};
}

async function getPairStatsHealth() {
	const rows = await query(
		`SELECT
			COUNT(*) as row_count,
			COALESCE(SUM(pair_count), 0) as pair_sum,
			MAX(updated_at) as last_updated_at
		FROM lotto_number_pair_stats`,
		[],
	);
	const row = rows[0];

	return {
		rowCount: asNumber(readValue(row, "row_count")),
		pairSum: asNumber(readValue(row, "pair_sum")),
		lastUpdatedAt: readStringValue(row, "last_updated_at"),
	};
}

async function getBonusNumberStatsHealth() {
	const rows = await query(
		`SELECT
			COUNT(*) as row_count,
			COALESCE(SUM(main_count), 0) as main_sum,
			COALESCE(SUM(bonus_count), 0) as bonus_sum,
			COALESCE(SUM(combined_count), 0) as combined_sum,
			COALESCE(MAX(last_bonus_round), 0) as latest_bonus_round,
			MAX(updated_at) as last_updated_at
		FROM lotto_bonus_number_stats`,
		[],
	);
	const row = rows[0];

	return {
		rowCount: asNumber(readValue(row, "row_count")),
		mainSum: asNumber(readValue(row, "main_sum")),
		bonusSum: asNumber(readValue(row, "bonus_sum")),
		combinedSum: asNumber(readValue(row, "combined_sum")),
		latestBonusRound: asNumber(readValue(row, "latest_bonus_round")),
		lastUpdatedAt: readStringValue(row, "last_updated_at"),
	};
}

async function getLottoStatsHealth(): Promise<LottoStatsHealth> {
	const latestDraw = await getLatestDrawHealth();
	if (latestDraw.drawCount === 0) {
		return {
			latestDrawRound: 0,
			drawCount: 0,
			staleSources: [],
			latestDrawUpdatedAt: null,
		};
	}

	const [perDrawTables, numberStats, pairStats, bonusNumberStats] =
		await Promise.all([
		Promise.all(PER_DRAW_TABLES.map((item) => getPerDrawTableHealth(item.table))),
		getNumberStatsHealth(),
		getPairStatsHealth(),
		getBonusNumberStatsHealth(),
	]);

	const staleSources: string[] = [];

	for (const item of PER_DRAW_TABLES) {
		const health = perDrawTables.find((table) => table.table === item.table);
		if (!health) continue;

		if (
			health.latestRound !== latestDraw.latestDrawRound ||
			health.rowCount !== latestDraw.drawCount
		) {
			staleSources.push(item.label);
		}
	}

	if (
		numberStats.latestRound !== latestDraw.latestDrawRound ||
		numberStats.rowCount !== 45 ||
		numberStats.drawSum !== latestDraw.drawCount * 6 ||
		numberStats.bonusSum !== latestDraw.drawCount
	) {
		staleSources.push("번호별 통계");
	}

	if (pairStats.pairSum !== latestDraw.drawCount * 15) {
		staleSources.push("번호쌍 통계");
	}

	if (
		bonusNumberStats.rowCount !== 45 ||
		bonusNumberStats.mainSum !== latestDraw.drawCount * 6 ||
		bonusNumberStats.bonusSum !== latestDraw.drawCount ||
		bonusNumberStats.combinedSum !== latestDraw.drawCount * 7 ||
		bonusNumberStats.latestBonusRound !== latestDraw.latestDrawRound
	) {
		staleSources.push("보너스 번호 통계");
	}

	return {
		latestDrawRound: latestDraw.latestDrawRound,
		drawCount: latestDraw.drawCount,
		staleSources,
		latestDrawUpdatedAt: latestDraw.lastUpdatedAt,
	};
}

async function rebuildDerivedStats(): Promise<void> {
	await transaction(async (tx) => {
		await tx.execute("DELETE FROM lotto_draw_odd_even_stats", []);
		await tx.execute("DELETE FROM lotto_draw_color_stats", []);
		await tx.execute("DELETE FROM lotto_draw_section_stats", []);
		await tx.execute("DELETE FROM lotto_draw_consecutive_stats", []);
		await tx.execute("DELETE FROM lotto_draw_high_low_stats", []);
		await tx.execute("DELETE FROM lotto_draw_repeat_stats", []);
		await tx.execute("DELETE FROM lotto_draw_unit_digit_stats", []);
		await tx.execute("DELETE FROM lotto_draw_ac_stats", []);
		await tx.execute("DELETE FROM lotto_draw_bonus_stats", []);
		await tx.execute("DELETE FROM lotto_number_stats", []);
		await tx.execute("DELETE FROM lotto_number_pair_stats", []);
		await tx.execute("DELETE FROM lotto_bonus_number_stats", []);
		await tx.execute(
			"DELETE FROM sqlite_sequence WHERE name = 'lotto_number_pair_stats'",
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_draw_odd_even_stats (round, odd_count, even_count, numbers_sum, updated_at)
			SELECT
				round,
				((draw_number_1 % 2) + (draw_number_2 % 2) + (draw_number_3 % 2) + (draw_number_4 % 2) + (draw_number_5 % 2) + (draw_number_6 % 2)),
				(6 - ((draw_number_1 % 2) + (draw_number_2 % 2) + (draw_number_3 % 2) + (draw_number_4 % 2) + (draw_number_5 % 2) + (draw_number_6 % 2))),
				(draw_number_1 + draw_number_2 + draw_number_3 + draw_number_4 + draw_number_5 + draw_number_6),
				CURRENT_TIMESTAMP
			FROM lotto_draw_results
			ORDER BY round`,
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_draw_color_stats (round, yellow_count, blue_count, red_count, grey_count, green_count, updated_at)
			SELECT
				r.round,
				SUM(CASE WHEN d.color = 'yellow' THEN 1 ELSE 0 END),
				SUM(CASE WHEN d.color = 'blue' THEN 1 ELSE 0 END),
				SUM(CASE WHEN d.color = 'red' THEN 1 ELSE 0 END),
				SUM(CASE WHEN d.color = 'grey' THEN 1 ELSE 0 END),
				SUM(CASE WHEN d.color = 'green' THEN 1 ELSE 0 END),
				CURRENT_TIMESTAMP
			FROM lotto_draw_results r
			JOIN lotto_number_details d
				ON d.number IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6)
			GROUP BY r.round
			ORDER BY r.round`,
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_draw_section_stats (round, section_1_10, section_11_20, section_21_30, section_31_40, section_41_45, updated_at)
			SELECT
				r.round,
				SUM(CASE WHEN d.section = 1 THEN 1 ELSE 0 END),
				SUM(CASE WHEN d.section = 2 THEN 1 ELSE 0 END),
				SUM(CASE WHEN d.section = 3 THEN 1 ELSE 0 END),
				SUM(CASE WHEN d.section = 4 THEN 1 ELSE 0 END),
				SUM(CASE WHEN d.section = 5 THEN 1 ELSE 0 END),
				CURRENT_TIMESTAMP
			FROM lotto_draw_results r
			JOIN lotto_number_details d
				ON d.number IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6)
			GROUP BY r.round
			ORDER BY r.round`,
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_draw_consecutive_stats (round, consecutive_pairs_count, updated_at)
			SELECT
				round,
				(CASE WHEN draw_number_2 = draw_number_1 + 1 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_3 = draw_number_2 + 1 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_4 = draw_number_3 + 1 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_5 = draw_number_4 + 1 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_6 = draw_number_5 + 1 THEN 1 ELSE 0 END),
				CURRENT_TIMESTAMP
			FROM lotto_draw_results
			ORDER BY round`,
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_draw_high_low_stats (round, low_count, high_count, updated_at)
			SELECT
				round,
				(CASE WHEN draw_number_1 BETWEEN 1 AND 22 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_2 BETWEEN 1 AND 22 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_3 BETWEEN 1 AND 22 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_4 BETWEEN 1 AND 22 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_5 BETWEEN 1 AND 22 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_6 BETWEEN 1 AND 22 THEN 1 ELSE 0 END),
				(CASE WHEN draw_number_1 BETWEEN 23 AND 45 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_2 BETWEEN 23 AND 45 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_3 BETWEEN 23 AND 45 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_4 BETWEEN 23 AND 45 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_5 BETWEEN 23 AND 45 THEN 1 ELSE 0 END +
				 CASE WHEN draw_number_6 BETWEEN 23 AND 45 THEN 1 ELSE 0 END),
				CURRENT_TIMESTAMP
			FROM lotto_draw_results
			ORDER BY round`,
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_draw_unit_digit_stats (round, digit_0_count, digit_1_count, digit_2_count, digit_3_count, digit_4_count, digit_5_count, digit_6_count, digit_7_count, digit_8_count, digit_9_count, updated_at)
			SELECT
				round,
				(CASE WHEN draw_number_1 % 10 = 0 THEN 1 ELSE 0 END + CASE WHEN draw_number_2 % 10 = 0 THEN 1 ELSE 0 END + CASE WHEN draw_number_3 % 10 = 0 THEN 1 ELSE 0 END + CASE WHEN draw_number_4 % 10 = 0 THEN 1 ELSE 0 END + CASE WHEN draw_number_5 % 10 = 0 THEN 1 ELSE 0 END + CASE WHEN draw_number_6 % 10 = 0 THEN 1 ELSE 0 END),
				(CASE WHEN draw_number_1 % 10 = 1 THEN 1 ELSE 0 END + CASE WHEN draw_number_2 % 10 = 1 THEN 1 ELSE 0 END + CASE WHEN draw_number_3 % 10 = 1 THEN 1 ELSE 0 END + CASE WHEN draw_number_4 % 10 = 1 THEN 1 ELSE 0 END + CASE WHEN draw_number_5 % 10 = 1 THEN 1 ELSE 0 END + CASE WHEN draw_number_6 % 10 = 1 THEN 1 ELSE 0 END),
				(CASE WHEN draw_number_1 % 10 = 2 THEN 1 ELSE 0 END + CASE WHEN draw_number_2 % 10 = 2 THEN 1 ELSE 0 END + CASE WHEN draw_number_3 % 10 = 2 THEN 1 ELSE 0 END + CASE WHEN draw_number_4 % 10 = 2 THEN 1 ELSE 0 END + CASE WHEN draw_number_5 % 10 = 2 THEN 1 ELSE 0 END + CASE WHEN draw_number_6 % 10 = 2 THEN 1 ELSE 0 END),
				(CASE WHEN draw_number_1 % 10 = 3 THEN 1 ELSE 0 END + CASE WHEN draw_number_2 % 10 = 3 THEN 1 ELSE 0 END + CASE WHEN draw_number_3 % 10 = 3 THEN 1 ELSE 0 END + CASE WHEN draw_number_4 % 10 = 3 THEN 1 ELSE 0 END + CASE WHEN draw_number_5 % 10 = 3 THEN 1 ELSE 0 END + CASE WHEN draw_number_6 % 10 = 3 THEN 1 ELSE 0 END),
				(CASE WHEN draw_number_1 % 10 = 4 THEN 1 ELSE 0 END + CASE WHEN draw_number_2 % 10 = 4 THEN 1 ELSE 0 END + CASE WHEN draw_number_3 % 10 = 4 THEN 1 ELSE 0 END + CASE WHEN draw_number_4 % 10 = 4 THEN 1 ELSE 0 END + CASE WHEN draw_number_5 % 10 = 4 THEN 1 ELSE 0 END + CASE WHEN draw_number_6 % 10 = 4 THEN 1 ELSE 0 END),
				(CASE WHEN draw_number_1 % 10 = 5 THEN 1 ELSE 0 END + CASE WHEN draw_number_2 % 10 = 5 THEN 1 ELSE 0 END + CASE WHEN draw_number_3 % 10 = 5 THEN 1 ELSE 0 END + CASE WHEN draw_number_4 % 10 = 5 THEN 1 ELSE 0 END + CASE WHEN draw_number_5 % 10 = 5 THEN 1 ELSE 0 END + CASE WHEN draw_number_6 % 10 = 5 THEN 1 ELSE 0 END),
				(CASE WHEN draw_number_1 % 10 = 6 THEN 1 ELSE 0 END + CASE WHEN draw_number_2 % 10 = 6 THEN 1 ELSE 0 END + CASE WHEN draw_number_3 % 10 = 6 THEN 1 ELSE 0 END + CASE WHEN draw_number_4 % 10 = 6 THEN 1 ELSE 0 END + CASE WHEN draw_number_5 % 10 = 6 THEN 1 ELSE 0 END + CASE WHEN draw_number_6 % 10 = 6 THEN 1 ELSE 0 END),
				(CASE WHEN draw_number_1 % 10 = 7 THEN 1 ELSE 0 END + CASE WHEN draw_number_2 % 10 = 7 THEN 1 ELSE 0 END + CASE WHEN draw_number_3 % 10 = 7 THEN 1 ELSE 0 END + CASE WHEN draw_number_4 % 10 = 7 THEN 1 ELSE 0 END + CASE WHEN draw_number_5 % 10 = 7 THEN 1 ELSE 0 END + CASE WHEN draw_number_6 % 10 = 7 THEN 1 ELSE 0 END),
				(CASE WHEN draw_number_1 % 10 = 8 THEN 1 ELSE 0 END + CASE WHEN draw_number_2 % 10 = 8 THEN 1 ELSE 0 END + CASE WHEN draw_number_3 % 10 = 8 THEN 1 ELSE 0 END + CASE WHEN draw_number_4 % 10 = 8 THEN 1 ELSE 0 END + CASE WHEN draw_number_5 % 10 = 8 THEN 1 ELSE 0 END + CASE WHEN draw_number_6 % 10 = 8 THEN 1 ELSE 0 END),
				(CASE WHEN draw_number_1 % 10 = 9 THEN 1 ELSE 0 END + CASE WHEN draw_number_2 % 10 = 9 THEN 1 ELSE 0 END + CASE WHEN draw_number_3 % 10 = 9 THEN 1 ELSE 0 END + CASE WHEN draw_number_4 % 10 = 9 THEN 1 ELSE 0 END + CASE WHEN draw_number_5 % 10 = 9 THEN 1 ELSE 0 END + CASE WHEN draw_number_6 % 10 = 9 THEN 1 ELSE 0 END),
				CURRENT_TIMESTAMP
			FROM lotto_draw_results
			ORDER BY round`,
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_draw_repeat_stats (round, repeat_count, updated_at)
			SELECT
				r.round,
				COALESCE(
					CASE WHEN prev.draw_number_1 IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6) THEN 1 ELSE 0 END +
					CASE WHEN prev.draw_number_2 IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6) THEN 1 ELSE 0 END +
					CASE WHEN prev.draw_number_3 IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6) THEN 1 ELSE 0 END +
					CASE WHEN prev.draw_number_4 IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6) THEN 1 ELSE 0 END +
					CASE WHEN prev.draw_number_5 IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6) THEN 1 ELSE 0 END +
					CASE WHEN prev.draw_number_6 IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6) THEN 1 ELSE 0 END,
					0
				),
				CURRENT_TIMESTAMP
			FROM lotto_draw_results r
			LEFT JOIN lotto_draw_results prev ON prev.round = r.round - 1
			ORDER BY r.round`,
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_draw_ac_stats (round, ac_value, updated_at)
			SELECT
				r.round,
				(
					SELECT COUNT(DISTINCT diff_val) - 1
					FROM (
						SELECT ABS(r.draw_number_2 - r.draw_number_1) AS diff_val
						UNION SELECT ABS(r.draw_number_3 - r.draw_number_1)
						UNION SELECT ABS(r.draw_number_4 - r.draw_number_1)
						UNION SELECT ABS(r.draw_number_5 - r.draw_number_1)
						UNION SELECT ABS(r.draw_number_6 - r.draw_number_1)
						UNION SELECT ABS(r.draw_number_3 - r.draw_number_2)
						UNION SELECT ABS(r.draw_number_4 - r.draw_number_2)
						UNION SELECT ABS(r.draw_number_5 - r.draw_number_2)
						UNION SELECT ABS(r.draw_number_6 - r.draw_number_2)
						UNION SELECT ABS(r.draw_number_4 - r.draw_number_3)
						UNION SELECT ABS(r.draw_number_5 - r.draw_number_3)
						UNION SELECT ABS(r.draw_number_6 - r.draw_number_3)
						UNION SELECT ABS(r.draw_number_5 - r.draw_number_4)
						UNION SELECT ABS(r.draw_number_6 - r.draw_number_4)
						UNION SELECT ABS(r.draw_number_6 - r.draw_number_5)
					)
				),
				CURRENT_TIMESTAMP
			FROM lotto_draw_results r
			ORDER BY r.round`,
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_draw_bonus_stats (round, bonus_number, color, section, is_odd, is_high, updated_at)
			SELECT
				r.round,
				r.bonus_number,
				d.color,
				d.section,
				CASE WHEN r.bonus_number % 2 = 1 THEN 1 ELSE 0 END,
				CASE WHEN r.bonus_number >= 23 THEN 1 ELSE 0 END,
				CURRENT_TIMESTAMP
			FROM lotto_draw_results r
			JOIN lotto_number_details d ON d.number = r.bonus_number
			ORDER BY r.round`,
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_number_stats (number, draw_count, bonus_count, last_draw_round, updated_at)
			SELECT
				d.number,
				COALESCE(SUM(CASE WHEN d.number IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6) THEN 1 ELSE 0 END), 0),
				COALESCE(SUM(CASE WHEN d.number = r.bonus_number THEN 1 ELSE 0 END), 0),
				MAX(CASE WHEN d.number IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6) THEN r.round END),
				CURRENT_TIMESTAMP
			FROM lotto_number_details d
			LEFT JOIN lotto_draw_results r ON d.number IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6, r.bonus_number)
			GROUP BY d.number
			ORDER BY d.number`,
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_bonus_number_stats (number, bonus_count, main_count, combined_count, last_bonus_round, updated_at)
			SELECT
				d.number,
				COALESCE(SUM(CASE WHEN r.bonus_number = d.number THEN 1 ELSE 0 END), 0),
				COALESCE(SUM(CASE WHEN d.number IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6) THEN 1 ELSE 0 END), 0),
				COALESCE(SUM(CASE WHEN d.number IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6) THEN 1 ELSE 0 END), 0) +
				COALESCE(SUM(CASE WHEN r.bonus_number = d.number THEN 1 ELSE 0 END), 0),
				MAX(CASE WHEN r.bonus_number = d.number THEN r.round END),
				CURRENT_TIMESTAMP
			FROM lotto_number_details d
			LEFT JOIN lotto_draw_results r ON d.number IN (r.draw_number_1, r.draw_number_2, r.draw_number_3, r.draw_number_4, r.draw_number_5, r.draw_number_6, r.bonus_number)
			GROUP BY d.number
			ORDER BY d.number`,
			[],
		);

		await tx.execute(
			`INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at)
			SELECT
				number_a,
				number_b,
				COUNT(*) as pair_count,
				CURRENT_TIMESTAMP
			FROM (
				SELECT MIN(draw_number_1, draw_number_2) as number_a, MAX(draw_number_1, draw_number_2) as number_b FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_1, draw_number_3), MAX(draw_number_1, draw_number_3) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_1, draw_number_4), MAX(draw_number_1, draw_number_4) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_1, draw_number_5), MAX(draw_number_1, draw_number_5) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_1, draw_number_6), MAX(draw_number_1, draw_number_6) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_2, draw_number_3), MAX(draw_number_2, draw_number_3) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_2, draw_number_4), MAX(draw_number_2, draw_number_4) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_2, draw_number_5), MAX(draw_number_2, draw_number_5) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_2, draw_number_6), MAX(draw_number_2, draw_number_6) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_3, draw_number_4), MAX(draw_number_3, draw_number_4) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_3, draw_number_5), MAX(draw_number_3, draw_number_5) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_3, draw_number_6), MAX(draw_number_3, draw_number_6) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_4, draw_number_5), MAX(draw_number_4, draw_number_5) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_4, draw_number_6), MAX(draw_number_4, draw_number_6) FROM lotto_draw_results
				UNION ALL SELECT MIN(draw_number_5, draw_number_6), MAX(draw_number_5, draw_number_6) FROM lotto_draw_results
			) pairs
			GROUP BY number_a, number_b
			ORDER BY number_a, number_b`,
			[],
		);
	});
}

export async function executeLottoStatsReconcile(
	force = false,
): Promise<LottoStatsReconcileResult> {
	const health = await getLottoStatsHealth();
	if (health.drawCount === 0) {
		return {
			rebuilt: false,
			latestDrawRound: 0,
			drawCount: 0,
			staleSources: [],
			lastUpdatedAt: null,
		};
	}

	if (!force && health.staleSources.length === 0) {
		console.info(
			`[${new Date().toISOString()}] ℹ️ lotto derived stats already in sync through round ${health.latestDrawRound}`,
		);
		return {
			rebuilt: false,
			latestDrawRound: health.latestDrawRound,
			drawCount: health.drawCount,
			staleSources: [],
			lastUpdatedAt: health.latestDrawUpdatedAt,
		};
	}

	console.info(
		`[${new Date().toISOString()}] 🔄 rebuilding lotto derived stats${force ? " (forced)" : ""}: ${health.staleSources.join(", ")}`,
	);

	await rebuildDerivedStats();

	return {
		rebuilt: true,
		latestDrawRound: health.latestDrawRound,
		drawCount: health.drawCount,
		staleSources: health.staleSources,
		lastUpdatedAt: new Date().toISOString(),
	};
}
