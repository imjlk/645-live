import { error } from "@sveltejs/kit";
import { getActivityPreview } from "$lib/server/activity-preview";
export const prerender = true;
export const entries = () => [{ source: "generated" }, { source: "scanned" }];
export const load = async ({ params }) => {
	if (params.source !== "generated" && params.source !== "scanned")
		error(404, "집계 출처를 확인해 주세요.");
	return {
		source: params.source as "generated" | "scanned",
		activity: await getActivityPreview(),
	};
};
