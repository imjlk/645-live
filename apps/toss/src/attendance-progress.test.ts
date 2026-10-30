import { expect, test } from "bun:test";
import {
	type AttendanceProgress,
	attendanceInstruction,
	attendanceReady,
	mergeAttendanceProgress,
} from "./attendance-progress";

const progress: AttendanceProgress = {
	day: 100,
	serverTime: 1000,
	checkedIn: false,
	generatedToday: true,
	generatedCount: 1,
	requiredGenerations: 4,
	canCheckIn: false,
	attendanceExperiment: "generation-cadence-v3",
	streak: 0,
	cycleLength: 7,
	canRestore: false,
	restoreAfterGeneration: false,
	restoreLimit: 1,
};
test("one generation cannot unlock multi-generation attendance; checked-in and legacy users stay compatible", () => {
	expect(attendanceReady(progress)).toBe(false);
	expect(attendanceInstruction(progress)).toContain("(1/4회)");
	expect(
		attendanceReady({ ...progress, generatedCount: 4, canCheckIn: true }),
	).toBe(true);
	expect(attendanceReady({ ...progress, checkedIn: true })).toBe(true);
	expect(
		attendanceReady({
			day: 100,
			serverTime: 1,
			generatedToday: true,
			checkedIn: false,
		}),
	).toBe(true);
});
test("confirmed generation progress preserves rewards, ignores stale responses and refreshes at midnight", () => {
	const previous = { ...progress, promotions: [{ status: "pending" }] };
	const next = mergeAttendanceProgress(previous, {
		...progress,
		serverTime: 2000,
		generatedCount: 4,
		canCheckIn: true,
	});
	expect(next?.generatedCount).toBe(4);
	expect(next?.promotions).toEqual(previous.promotions);
	expect(mergeAttendanceProgress(next, progress)).toBe(next);
	expect(
		mergeAttendanceProgress(next, { ...progress, day: 101, serverTime: 3000 }),
	).toBeNull();
});
