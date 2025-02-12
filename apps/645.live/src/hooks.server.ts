import { createSessionClient } from "$lib/appwrite";
import { redirect, type Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
	try {
		const { account } = createSessionClient(event);

		event.locals.user = await account.get();
	} catch {
		console.log("No user session detected.");
	}

	return resolve(event);
};
