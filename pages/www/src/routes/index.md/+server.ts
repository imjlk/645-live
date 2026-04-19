import {
	createMarkdownResponse,
} from "$lib/agent/http";
import { getHomePageContent } from "$lib/agent/content";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
	return createMarkdownResponse(request, getHomePageContent());
};
