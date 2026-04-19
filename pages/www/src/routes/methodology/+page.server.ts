import { getMethodologyPageContent } from "$lib/agent/content";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	return {
		page: getMethodologyPageContent(),
	};
};
