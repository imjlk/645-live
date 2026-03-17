import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";

function getConfiguredTrailbaseUrl(): string {
	const configuredUrl = env.PUBLIC_TRAILBASE_URL;
	if (!configuredUrl) {
		throw new Error("PUBLIC_TRAILBASE_URL is not configured");
	}

	return configuredUrl;
}

export function getTrailbaseBrowserBaseUrl(): string {
	const configuredUrl = getConfiguredTrailbaseUrl();

	if (!browser) {
		return configuredUrl;
	}

	if (!import.meta.env.DEV) {
		return configuredUrl;
	}

	try {
		const configuredOrigin = new URL(configuredUrl, window.location.origin)
			.origin;
		if (configuredOrigin !== window.location.origin) {
			return window.location.origin;
		}
	} catch (error) {
		console.warn("Failed to resolve TrailBase browser base URL:", error);
	}

	return configuredUrl;
}
