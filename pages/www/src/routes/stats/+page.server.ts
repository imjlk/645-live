import { getStatsHubData } from "$lib/server/stats-hub";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	return getStatsHubData();
};
