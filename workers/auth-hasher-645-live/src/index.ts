import { hashPassword, verifyPassword } from "better-auth/crypto";
import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.post("/hash", async (c) => {
	const payload = await c.req
		.json<{ password?: string }>()
		.catch((): { password?: string } => ({}));
	const password = String(payload.password ?? "");

	if (!password) {
		return c.json({ message: "Password is required." }, 400);
	}

	const hash = await hashPassword(password);
	return c.json({ hash });
});

app.post("/verify", async (c) => {
	const payload = await c
		.req
		.json<{ hash?: string; password?: string }>()
		.catch((): { hash?: string; password?: string } => ({}));
	const hash = String(payload.hash ?? "");
	const password = String(payload.password ?? "");

	if (!hash || !password) {
		return c.json({ message: "Hash and password are required." }, 400);
	}

	const valid = await verifyPassword({ hash, password });
	return c.json({ valid });
});

export default app;
