import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	// Use absolute path glob for better reliability
	const modules = import.meta.glob('/src/content/news/*.mdx');
	
    // Debug logging
    console.log('Available modules:', Object.keys(modules));
    console.log('Looking for:', `/src/content/news/${params.slug}.mdx`);

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
	} catch (e) {
        console.error('Error loading MDX:', e);
		throw error(500, `Could not load ${params.slug}`);
	}
};
