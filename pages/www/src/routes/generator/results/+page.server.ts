import { parseGenerationResults } from "@645/lotto-core";
import { TRAILBASE_URL } from "$env/static/private";

export const prerender = true;
export const load = async () => {
	try {
		const response = await fetch(
			`${TRAILBASE_URL.replace(/\/$/, "")}/api/app/v1/lotto/generation-results`,
			{ signal: AbortSignal.timeout(8000) },
		);
		if (!response.ok) throw new Error("Results unavailable");
		return { generationResults: parseGenerationResults(await response.json()) };
	} catch {
		// The static page remains available before the API migration is deployed.
		return { generationResults: null };
	}
};
