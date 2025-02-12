import {
	PUBLIC_APPWRITE_ENDPOINT,
	PUBLIC_APPWRITE_PROJECT,
} from "$env/static/public";
import { APPWRITE_KEY } from "$env/static/private";
import type { RequestEvent } from "@sveltejs/kit";

import { Client, Account } from "node-appwrite";

export const SESSION_COOKIE = "CUSTOM-SESSION-NAME";

export const createAdminClient = () => {
	const client = new Client()
		.setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
		.setProject(PUBLIC_APPWRITE_PROJECT)
		.setKey(APPWRITE_KEY);

	return {
		get account() {
			return new Account(client);
		},
	};
};

export const createSessionClient = (event: RequestEvent) => {
	const client = new Client()
		.setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
		.setProject(PUBLIC_APPWRITE_PROJECT);

	const session = event.cookies.get(SESSION_COOKIE);
	if (!session) {
		throw new Error("No user session");
	}

	client.setSession(session);

	return {
		get account() {
			return new Account(client);
		},
	};
};
