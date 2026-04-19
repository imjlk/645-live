import { AGENT_SKILLS, getAgentSkillMarkdown } from "$lib/agent/content";
import { absoluteUrl } from "$lib/seo/index.js";
import type { RequestHandler } from "./$types";

async function createDigest(value: string): Promise<string> {
	const bytes = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return `sha256:${Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("")}`;
}

export const GET: RequestHandler = async () => {
	const skills = await Promise.all(
		AGENT_SKILLS.map(async (skill) => {
			const path = `/.well-known/agent-skills/${skill.slug}/SKILL.md`;
			return {
				name: skill.name,
				type: skill.type,
				description: skill.description,
				url: absoluteUrl(path),
				digest: await createDigest(getAgentSkillMarkdown(skill.slug)),
			};
		}),
	);

	return Response.json(
		{
			$schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
			skills,
		},
		{
			headers: {
				"cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
			},
		},
	);
};
