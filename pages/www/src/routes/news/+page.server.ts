import type { PageServerLoad } from './$types';
import { getAllNewsPosts } from '$lib/server/news.js';

const PAGE_SIZE = 12;

export const load: PageServerLoad = async ({ url }) => {
	const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10);
	const safeRequestedPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const newsPosts = getAllNewsPosts();

	const totalPosts = newsPosts.length;
	const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
	const page = Math.min(safeRequestedPage, totalPages);
	const start = (page - 1) * PAGE_SIZE;
	const paginatedPosts = newsPosts.slice(start, start + PAGE_SIZE);

	return {
		posts: paginatedPosts,
		feedInsertions: [],
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
