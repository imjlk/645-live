import { getStatusPageContent } from "$lib/agent/content";
import { getPublicStatusDocument } from "$lib/server/agent-api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
	return {
		page: getStatusPageContent(),
		status: getPublicStatusDocument(event),
	};
};
