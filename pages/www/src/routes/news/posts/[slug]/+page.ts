import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const modules = import.meta.glob('/src/content/news/*.mdx');

	const path = `/src/content/news/${params.slug}.mdx`;
	const loader = modules[path];
	
	if (!loader) {
		throw error(404, `Could not find ${params.slug} (path: ${path})`);
	}

	try {
		const post = await loader() as any;
		const meta = post.metadata || {};
		
		return {
			content: post.default,
			meta,
			slug: params.slug
		};
	} catch {
		throw error(500, `Could not load ${params.slug}`);
	}
};
