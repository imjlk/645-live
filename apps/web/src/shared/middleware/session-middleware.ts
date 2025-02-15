import { APPWRITE_KEY } from "$env/static/private";
import {
	PUBLIC_APPWRITE_ENDPOINT,
	PUBLIC_APPWRITE_PROJECT,
} from "$env/static/public";
import { AUTH_COOKIE } from "@/features/auth/constants";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import {
	Account,
	type Account as AccountType,
	Client,
	Databases,
	type Databases as DatabasesType,
	type Models,
	Storage,
	type Storage as StorageType,
	Users,
	type Users as UsersType,
} from "node-appwrite";

type AdditionalContext = {
	Variables: {
		account: AccountType;
		databases: DatabasesType;
		storage: StorageType;
		users: UsersType;
		user: Models.User<Models.Preferences>;
	};
};
export const sessionMiddleware = createMiddleware<AdditionalContext>(
	async (c, next) => {
		const client = new Client()
			.setEndpoint(PUBLIC_APPWRITE_ENDPOINT) // Your API Endpoint
			.setProject(PUBLIC_APPWRITE_PROJECT); // Your project ID

		const session = getCookie(c, AUTH_COOKIE);

		if (!session) {
			return c.json(
				{
					error: "Unauthorized",
				},
				401,
			);
		}

		client.setSession(session);

		const account = new Account(client);
		const databases = new Databases(client);
		const storage = new Storage(client);

		const user = await account.get();

		c.set("account", account);
		c.set("databases", databases);
		c.set("storage", storage);
		c.set("user", user);

		await next();
	},
);
