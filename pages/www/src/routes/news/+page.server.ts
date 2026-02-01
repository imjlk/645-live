
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const posts = import.meta.glob('/src/content/news/*.mdx', { eager: true });

	const newsPosts = Object.entries(posts).map(([path, module]: [string, any]) => {
		const slug = path.split('/').pop()?.replace('.mdx', '');
		const metadata = module.metadata || {};
		
		return {
			slug,
			title: metadata.title || '제목 없음',
			date: metadata.date || new Date().toISOString().split('T')[0],
			description: metadata.description || '',
			category: metadata.category || '뉴스',
			thumbnail: metadata.thumbnail || `https://picsum.photos/seed/${slug}/800/400`,
			tags: metadata.tags || [],
			author: metadata.author || '645.live',
			highlight: metadata.highlight || undefined  // Special issue highlight
		};
	}).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return {
		posts: newsPosts
	};
};
