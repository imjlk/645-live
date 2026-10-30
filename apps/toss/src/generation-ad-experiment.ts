import type { GenerationAdPolicy } from "./generation-ad-counter";
import {
	GENERATION_AD_INTERVALS,
	GENERATION_AD_SETTINGS,
	type GenerationAdSettings,
} from "./generation-ad-settings";

export const GENERATION_AD_EXPERIMENT = "generation-cadence-v2";

/** Stable 50:50 allocation; the internal principal is never sent to analytics. */
export function generationAdVariant(principal: string): "control" | "short" {
	let hash = 2166136261;
	for (const char of `${GENERATION_AD_EXPERIMENT}:${principal}`) {
		hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
	}
	hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
	hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
	hash ^= hash >>> 16;
	return (hash >>> 0) % 2 === 0 ? "control" : "short";
}

export function generationExperimentPolicy(
	base: GenerationAdPolicy | undefined,
	principal: string,
	settings: GenerationAdSettings = GENERATION_AD_SETTINGS,
): GenerationAdPolicy | undefined {
	// A server policy change is also a kill switch; never override other policies.
	if (
		!principal ||
		base?.counter !== "device" ||
		base.firstGenerations !== 5 ||
		base.minGenerations !== 5 ||
		base.maxGenerations !== 30
	)
		return base;
	const variant = generationAdVariant(principal);
	return {
		...base,
		experiment: GENERATION_AD_EXPERIMENT,
		variant,
		...GENERATION_AD_INTERVALS[
			settings.mode === "relaxed" ? "relaxed" : variant
		],
	};
}

export function requiresAttendanceForGeneration(
	policy: GenerationAdPolicy | undefined,
	settings: GenerationAdSettings = GENERATION_AD_SETTINGS,
) {
	return (
		settings.mode === "experiment" &&
		settings.returningDailyAd &&
		policy?.experiment === GENERATION_AD_EXPERIMENT &&
		policy.variant === "short"
	);
}

/** One explicit daily ad opportunity before repeat-attendance users generate. */
export function dailyGenerationAdRequired(
	policy: GenerationAdPolicy | undefined,
	attendance: {
		day: number;
		streak: number;
		generatedToday: boolean;
		checkedIn: boolean;
	} | null,
	continuedDay: number | undefined,
	settings: GenerationAdSettings = GENERATION_AD_SETTINGS,
) {
	return (
		requiresAttendanceForGeneration(policy, settings) &&
		!!attendance &&
		attendance.streak >= 1 &&
		!attendance.generatedToday &&
		!attendance.checkedIn &&
		continuedDay !== attendance.day
	);
}
