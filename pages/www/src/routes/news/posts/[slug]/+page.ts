import { error } from "@sveltejs/kit";
import type { Component } from "svelte";
import {
	type NewsMetadata,
	normalizeNewsDescriptions,
} from "$lib/components/news/metadata.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
	const modules = import.meta.glob<{
		metadata?: NewsMetadata;
		default: Component;
	}>("/src/content/news/*.mdx");

	const path = `/src/content/news/${params.slug}.mdx`;
	const loader = modules[path];

	if (!loader) {
		throw error(404, "기사를 찾을 수 없습니다.");
	}

	try {
		const post = await loader();
		const meta = post.metadata || {};

		return {
			content: post.default,
			meta: { ...meta, ...normalizeNewsDescriptions(meta) },
			slug: params.slug,
		};
	} catch {
		throw error(500, "기사를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.");
	}
};
