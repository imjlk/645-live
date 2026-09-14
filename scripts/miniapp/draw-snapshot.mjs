/** Import public rows into the dedicated local depot, with repeatable derived counts. */
export function importDrawSnapshot(db, rows) {
	if (!Array.isArray(rows) || rows.length > 60)
		throw new Error("Invalid public draw snapshot.");
	const allowed = new Set(
		db
			.query("PRAGMA table_info(lotto_draw_results)")
			.all()
			.map((r) => r.name),
	);
	const numberColumns = Array.from(
		{ length: 6 },
		(_, i) => `draw_number_${i + 1}`,
	);
	for (const row of rows) {
		if (!row || typeof row !== "object") throw new Error("Invalid draw row.");
		const numbers = [...numberColumns.map((key) => row[key]), row.bonus_number];
		if (
			!Number.isSafeInteger(row.round) ||
			row.round < 1 ||
			typeof row.draw_date !== "string" ||
			new Set(numbers).size !== 7 ||
			numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 45)
		)
			throw new Error("Invalid public draw numbers.");
	}
	return db.transaction(() => {
		let changed = 0;
		for (const row of [...rows].sort((a, b) => a.round - b.round)) {
			const keys = Object.keys(row).filter((key) => allowed.has(key));
			const existing = db
				.query("SELECT * FROM lotto_draw_results WHERE round=?")
				.get(row.round);
			if (existing && keys.every((key) => existing[key] === row[key])) continue;
			// REPLACE also refreshes the legacy per-round INSERT-trigger statistics.
			db.query(
				`INSERT OR REPLACE INTO lotto_draw_results (${keys.map((key) => `"${key}"`).join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
			).run(...keys.map((key) => row[key]));
			changed += 1;
		}
		// Legacy INSERT triggers increment counts and overwrite last_round. Recompute
		// from source rows to repair previous local launches as well as corrections.
		db.exec(
			`INSERT OR IGNORE INTO lotto_number_stats(number) SELECT number FROM lotto_number_details`,
		);
		db.exec(`UPDATE lotto_number_stats SET
			draw_count=(SELECT count(*) FROM lotto_draw_results WHERE number IN (${numberColumns.join(",")})),
			bonus_count=(SELECT count(*) FROM lotto_draw_results WHERE number=bonus_number),
			last_draw_round=(SELECT max(round) FROM lotto_draw_results WHERE number IN (${numberColumns.join(",")})),
			updated_at=CURRENT_TIMESTAMP`);
		db.exec(
			`INSERT OR IGNORE INTO lotto_bonus_number_stats(number) SELECT number FROM lotto_number_details`,
		);
		db.exec(`UPDATE lotto_bonus_number_stats SET
			main_count=(SELECT draw_count FROM lotto_number_stats n WHERE n.number=lotto_bonus_number_stats.number),
			bonus_count=(SELECT bonus_count FROM lotto_number_stats n WHERE n.number=lotto_bonus_number_stats.number),
			combined_count=(SELECT draw_count+bonus_count FROM lotto_number_stats n WHERE n.number=lotto_bonus_number_stats.number),
			last_bonus_round=(SELECT max(round) FROM lotto_draw_results WHERE bonus_number=lotto_bonus_number_stats.number),
			updated_at=CURRENT_TIMESTAMP`);
		return { changed, imported: rows.length };
	})();
}
