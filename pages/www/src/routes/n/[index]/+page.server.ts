import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

// Helper functions for mathematical properties
function isPrime(n: number): boolean {
	if (n < 2) return false;
	if (n === 2) return true;
	if (n % 2 === 0) return false;
	for (let i = 3; i * i <= n; i += 2) {
		if (n % i === 0) return false;
	}
	return true;
}

function isPerfectSquare(n: number): boolean {
	const sqrt = Math.sqrt(n);
	return sqrt === Math.floor(sqrt);
}

function isFibonacci(n: number): boolean {
	const fibNumbers = [1, 1, 2, 3, 5, 8, 13, 21, 34];
	return fibNumbers.includes(n);
}

function getNumberColor(num: number): string {
	if (num >= 1 && num <= 10) return "yellow";
	if (num >= 11 && num <= 20) return "blue";
	if (num >= 21 && num <= 30) return "red";
	if (num >= 31 && num <= 40) return "grey";
	if (num >= 41 && num <= 45) return "green";
	return "grey";
}

// Define specific types for data records
interface NumberDetails {
	number: number;
	color: string;
	section: number;
}

interface PairStat {
	id: number;
	number_a: number;
	number_b: number;
	pair_count: number;
}

export const load: PageServerLoad = async ({ params }) => {
	try {
		const ballNumber = Number(params.index);

		if (Number.isNaN(ballNumber) || ballNumber < 1 || ballNumber > 45) {
			error(404, { message: "Ball number must be between 1 and 45" });
		}

		const totalRoundsResponse = await client
			.records("lotto_draw_results")
			.list({ pagination: { limit: 1 } });
		const totalRounds = totalRoundsResponse.total_count || 0;

		const numberStatsResponse = await client
			.records("lotto_number_stats")
			.list({
				filters: [
					{ column: "number", op: "equal", value: ballNumber.toString() },
				],
				pagination: { limit: 1 },
			});

		let numberStats = null;
		if (numberStatsResponse.records.length > 0) {
			const stats = numberStatsResponse.records[0] as {
				count: number;
				last_draw_round: number;
			};
			numberStats = {
				frequency: stats.count,
				lastDrawRound: stats.last_draw_round,
				averageFrequency:
					totalRounds > 0
						? ((stats.count / totalRounds) * 100).toFixed(2)
						: "0.00",
				expectedFrequency: totalRounds > 0 ? (totalRounds * 6) / 45 : 0,
				deviation: totalRounds > 0 ? stats.count - (totalRounds * 6) / 45 : 0,
			};
		}

		const numberDetailsResponse = await client
			.records("lotto_number_details")
			.list({
				filters: [
					{ column: "number", op: "equal", value: ballNumber.toString() },
				],
				pagination: { limit: 1 },
			});
		const numberDetails =
			numberDetailsResponse.records.length > 0
				? (numberDetailsResponse.records[0] as unknown as NumberDetails)
				: null;

		// Get pair stats for this number from both number_a and number_b
		const [pairStatsA, pairStatsB] = await Promise.all([
			client.records("lotto_number_pair_stats").list({
				filters: [
					{ column: "number_a", op: "equal", value: ballNumber.toString() },
				],
			}),
			client.records("lotto_number_pair_stats").list({
				filters: [
					{ column: "number_b", op: "equal", value: ballNumber.toString() },
				],
			}),
		]);

		// Combine and aggregate pair counts
		const pairMap = new Map<number, number>();
		
		// Add pairs where our number is number_a
		for (const record of pairStatsA.records) {
			const otherNumber = record.number_b as number;
			pairMap.set(otherNumber, (pairMap.get(otherNumber) || 0) + (record.pair_count as number));
		}
		
		// Add pairs where our number is number_b
		for (const record of pairStatsB.records) {
			const otherNumber = record.number_a as number;
			pairMap.set(otherNumber, (pairMap.get(otherNumber) || 0) + (record.pair_count as number));
		}

		// Convert to array and sort
		const allPairs = Array.from(pairMap.entries()).map(([otherNumber, pair_count]) => ({
			otherNumber,
			pair_count,
			otherNumberDetails: { color: getNumberColor(otherNumber) },
		}));

		// Get top and bottom pairs
		const sortedPairs = allPairs.sort((a, b) => b.pair_count - a.pair_count);
		const topPairs = sortedPairs.slice(0, 5);
		const bottomPairs = sortedPairs.slice(-5).reverse();

		// Get mathematical properties
		const mathematicalProperties = {
			isPrime: isPrime(ballNumber),
			isPerfectSquare: isPerfectSquare(ballNumber),
			isFibonacci: isFibonacci(ballNumber),
			isEven: ballNumber % 2 === 0,
		};



		const latestRoundResponse = await client
			.records("lotto_draw_results")
			.list({
				order: ["-round"],
				pagination: { limit: 1 },
			});
		const latestRound =
			latestRoundResponse.records.length > 0
				? (latestRoundResponse.records[0] as { round: number }).round
				: 0;

		return {
			ballNumber,
			numberStats,
			numberDetails,
			topPairs,
			bottomPairs,
			mathematicalProperties,
			latestRound,
		};
	} catch (e) {
		console.error("Failed to load number stats:", e);
		error(500, "Failed to load number statistics");
	}
};
