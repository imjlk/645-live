export type AttendanceProgress = {
	day: number;
	serverTime: number;
	checkedIn: boolean;
	generatedToday: boolean;
	generatedCount: number;
	requiredGenerations: number;
	canCheckIn: boolean;
	attendanceExperiment: string | null;
	streak: number;
	cycleLength: number;
	canRestore: boolean;
	restoreAfterGeneration: boolean;
	restoreLimit: number;
};
type State = Pick<
	AttendanceProgress,
	"day" | "serverTime" | "generatedToday" | "checkedIn"
> &
	Partial<AttendanceProgress>;
export function attendanceReady(state: State | null | undefined) {
	return (
		!!state && (state.checkedIn || (state.canCheckIn ?? state.generatedToday))
	);
}
export function attendanceInstruction(state: State | null | undefined) {
	const target = state?.requiredGenerations ?? 1;
	return target > 1
		? `오늘 ${target}회 만들면 출석할 수 있어요. (${Math.min(state?.generatedCount ?? 0, target)}/${target}회)`
		: "오늘 번호를 한 번 만들면 출석할 수 있어요.";
}
export function mergeAttendanceProgress<T extends State>(
	previous: T | null,
	next: AttendanceProgress,
): T | null {
	if (!previous) return null;
	if (previous.day > next.day || previous.serverTime > next.serverTime)
		return previous;
	if (previous.day !== next.day) return null;
	return { ...previous, ...next };
}
