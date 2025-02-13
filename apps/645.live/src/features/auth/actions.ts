import type { RequestEvent } from "@sveltejs/kit";
import { Account, Client } from "node-appwrite";
import { AUTH_COOKIE } from "./constants";

export async function getCurrent(event: RequestEvent) {
	try {
		const client = new Client()
			.setEndpoint(import.meta.env.VITE_PUBLIC_APPWRITE_ENDPOINT)
			.setProject(import.meta.env.VITE_PUBLIC_APPWRITE_PROJECT);

		const session = event.cookies.get(AUTH_COOKIE);
		if (!session) return null;

		client.setSession(session);

		const account = new Account(client);
		return await account.get();
	} catch (error) {
		return null;
	}
}
