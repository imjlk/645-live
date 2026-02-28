
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 9;

export const load: PageServerLoad = async ({ url }) => {
	const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10);
	const safeRequestedPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

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

	const totalPosts = newsPosts.length;
	const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
	const page = Math.min(safeRequestedPage, totalPages);
	const start = (page - 1) * PAGE_SIZE;
	const paginatedPosts = newsPosts.slice(start, start + PAGE_SIZE);

	return {
		posts: paginatedPosts,
		pagination: {
			page,
			pageSize: PAGE_SIZE,
			totalPages,
			totalPosts,
			hasPrev: page > 1,
			hasNext: page < totalPages,
			prevPage: page > 1 ? page - 1 : null,
			nextPage: page < totalPages ? page + 1 : null
		}
	};
};
