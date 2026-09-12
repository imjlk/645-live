import { redirect } from "@sveltejs/kit";
import { getAllNewsPosts } from "$lib/server/news.js";
import type { PageServerLoad } from "./$types";

const PAGE_SIZE = 12;

export const load: PageServerLoad = async ({ url }) => {
	const rawPage = url.searchParams.get("page");
	const requestedPage = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
	const safePage =
		Number.isSafeInteger(requestedPage) && requestedPage > 0
			? requestedPage
			: 1;
	const newsPosts = getAllNewsPosts();
	const totalPosts = newsPosts.length;
	const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
	const page = Math.min(safePage, totalPages);

	if (
		rawPage !== null &&
		(page === 1 ||
			rawPage !== String(page) ||
			url.searchParams.getAll("page").length > 1)
	) {
		redirect(308, page === 1 ? "/news" : `/news?page=${page}`);
	}

	return {
		posts: newsPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
		pagination: {
			page,
			pageSize: PAGE_SIZE,
			totalPages,
			totalPosts,
			hasPrev: page > 1,
			hasNext: page < totalPages,
			prevPage: page > 1 ? page - 1 : null,
			nextPage: page < totalPages ? page + 1 : null,
		},
	};
};
