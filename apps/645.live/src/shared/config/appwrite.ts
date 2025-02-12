import { APPWRITE_KEY } from "$env/static/private";
import {
	PUBLIC_APPWRITE_ENDPOINT,
	PUBLIC_APPWRITE_PROJECT,
} from "$env/static/public";
import type { Cookies, RequestEvent } from "@sveltejs/kit";

import { Account, Client } from "node-appwrite";

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

export const createSessionClient = (req: RequestEvent) => {
	const client = new Client()
		.setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
		.setProject(PUBLIC_APPWRITE_PROJECT);

	const session = req.cookies.get(SESSION_COOKIE);
	console.log("Session", session);
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
