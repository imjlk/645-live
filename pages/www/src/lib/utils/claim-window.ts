const KST_TIMEZONE_SUFFIX = "+09:00";
const FIRST_DRAW_DATE = "2002-12-07";

function parseKstDate(date: string): Date {
	return new Date(`${date}T00:00:00${KST_TIMEZONE_SUFFIX}`);
}

function formatDateOnly(date: Date): string {
	return new Date(date.getTime() + 9 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setUTCDate(next.getUTCDate() + days);
	return next;
}

function addYears(date: Date, years: number): Date {
	const next = new Date(date);
	next.setUTCFullYear(next.getUTCFullYear() + years);
	return next;
}

export type ClaimWindow = {
	drawDate: string;
	claimStartDate: string;
	claimDeadlineDate: string;
	claimStartAt: string;
	claimDeadlineAt: string;
};

export function calculateClaimWindow(drawDate: string): ClaimWindow {
	const draw = parseKstDate(drawDate);
	const claimStart = addDays(draw, 1);
	const claimDeadline = addYears(claimStart, 1);
	const claimDeadlineEnd = new Date(
		`${formatDateOnly(claimDeadline)}T23:59:59.999${KST_TIMEZONE_SUFFIX}`,
	);

	return {
		drawDate,
		claimStartDate: formatDateOnly(claimStart),
		claimDeadlineDate: formatDateOnly(claimDeadline),
		claimStartAt: claimStart.toISOString(),
		claimDeadlineAt: claimDeadlineEnd.toISOString(),
	};
}

export function estimateDrawDateFromRound(round: number): string {
	const firstDraw = parseKstDate(FIRST_DRAW_DATE);
	const estimated = addDays(firstDraw, Math.max(round - 1, 0) * 7);
	return formatDateOnly(estimated);
}

export function isClaimExpired(
	claimDeadlineAt: Date | string | null | undefined,
	referenceDate = new Date(),
): boolean {
	if (!claimDeadlineAt) {
		return false;
	}

	const deadline =
		claimDeadlineAt instanceof Date
			? claimDeadlineAt
			: new Date(claimDeadlineAt);

	if (Number.isNaN(deadline.getTime())) {
		return false;
	}

	return referenceDate.getTime() > deadline.getTime();
}
