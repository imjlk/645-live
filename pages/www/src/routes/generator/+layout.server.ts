import { getGenerationPreview } from "$lib/server/generation-preview";
export const prerender = true;
export const load = async () => ({
	generationPreview: await getGenerationPreview(),
});
