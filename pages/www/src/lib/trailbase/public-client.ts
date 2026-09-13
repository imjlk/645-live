import { initClient } from "trailbase";
import { browser, building } from "$app/environment";
import { withBuildReadRetries } from "./read-retry.js";

export function createPublicTrailbaseClient(baseUrl: string | URL) {
	const client = initClient(baseUrl);
	return !browser && building ? withBuildReadRetries(client) : client;
}
