/** A QR request contains one or more complete six-number games for one round. */
export function validateScanGames(
	games: unknown[],
): Array<{ round?: number; numbers: number[] }> {
	return games.map((value) => {
		if (!value || typeof value !== "object")
			throw new Error("Invalid game object");
		const game = value as { round?: unknown; numbers?: unknown };
		if (
			!Array.isArray(game.numbers) ||
			game.numbers.length !== 6 ||
			game.numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 45) ||
			new Set(game.numbers).size !== 6
		)
			throw new Error("Each game requires six distinct numbers from 1 to 45");
		if (
			game.round !== undefined &&
			(!Number.isInteger(game.round) ||
				Number(game.round) < 1 ||
				Number(game.round) > 9999)
		)
			throw new Error("Invalid round number");
		return {
			...(game.round !== undefined ? { round: Number(game.round) } : {}),
			numbers: [...game.numbers].sort((a, b) => a - b),
		};
	});
}
