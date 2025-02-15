import { createAdminClient } from "@/shared/config/appwrite";
import { sessionMiddleware } from "@/shared/middleware/session-middleware";
import { typiaValidator } from "@hono/typia-validator";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { ID } from "node-appwrite";
import { http, createValidate, validate } from "typia";
import { AUTH_COOKIE } from "../constants";

type Login = {
	email: string;
	password: string;
};
type Register = {
	name: string;
	email: string;
	password: string;
};

const loginValidate = createValidate<Login>();

const authRoute = new Hono()
	.get("/current", sessionMiddleware, (c) => {
		const user = c.get("user");

		return c.json({
			data: user,
		});
	})
	.post("/login", typiaValidator("json", validate<Login>), async (c) => {
		const { email, password } = c.req.valid("json");

		const { account } = await createAdminClient();
		const session = await account.createEmailPasswordSession(email, password);

		// Store session in cookie
		setCookie(c, AUTH_COOKIE, session.secret, {
			path: "/",
			httpOnly: true,
			sameSite: "strict",
			secure: true,
			maxAge: 60 * 60 * 24 * 30,
		});

		return c.json({
			success: true,
		});
	})
	.post("/register", typiaValidator("json", validate<Register>), async (c) => {
		const { name, email, password } = c.req.valid("json");

		const { account } = await createAdminClient();

		await account.create(ID.unique(), email, password, name);

		const session = await account.createEmailPasswordSession(email, password);

		// Store session in cookie
		setCookie(c, AUTH_COOKIE, session.secret, {
			path: "/",
			httpOnly: true,
			sameSite: "strict",
			secure: true,
			maxAge: 60 * 60 * 24 * 30,
		});
		return c.json({
			success: true,
		});
	})
	.post("/logout", sessionMiddleware, async (c) => {
		const account = c.get("account");

		deleteCookie(c, AUTH_COOKIE);
		await account.deleteSession("current");

		return c.json({
			success: true,
		});
	});

export default authRoute;
