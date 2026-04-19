import { AGENT_SKILLS, getAgentSkillMarkdown } from "$lib/agent/content";
import { createJsonErrorResponse } from "$lib/agent/http";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
	const skill = AGENT_SKILLS.find((item) => item.slug === params.slug);
	if (!skill) {
		return createJsonErrorResponse(
			404,
			"SKILL_NOT_FOUND",
			`No agent skill exists for slug "${params.slug}".`,
		);
	}

	return new Response(getAgentSkillMarkdown(skill.slug), {
		headers: {
			"content-type": "text/markdown; charset=utf-8",
			"cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
		},
	});
};
