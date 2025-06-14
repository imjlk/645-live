import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
    // No server-side Trailbase calls; all data fetched client-side
    return {} as const;
};
