import { expect, mock } from "bun:test";

const stored = new Map<string, string>();
let writes = 0;
let identity = "fixture-account-a";
let identityFailure = false;
mock.module("@apps-in-toss/framework", () => ({
	Storage: {
		getItem: async (key: string) => stored.get(key) ?? null,
		setItem: async (key: string, value: string) => {
			writes++;
			stored.set(key, value);
		},
	},
	getAnonymousKey: async () => {
		if (identityFailure) throw new Error("native identity unavailable");
		return { type: "HASH", hash: identity };
	},
}));

// Keep the real kit identity/session manager. Only the SDK transport is replaced.
mock.module("trailbase", () => ({
	initClient: (
		base: string,
		{ tokens }: { tokens: Record<string, string> },
	) => ({
		tokens: () => tokens,
		fetch: (path: string, options: RequestInit) =>
			fetch(`${base}${path}`, {
				...options,
				headers: {
					...options.headers,
					Authorization: `Bearer ${tokens.auth_token}`,
				},
			}),
	}),
}));
const jwt = (user: string, expiry = Math.floor(Date.now() / 1000) + 3600) =>
	`fixture.${Buffer.from(JSON.stringify({ sub: user, exp: expiry })).toString("base64url")}.fixture`;
const principal = (hash: string) => (hash.endsWith("a") ? "user-a" : "user-b");
const user = (id: string) => ({ id, displayName: id });
let bootstraps = 0;
let refreshes = 0;
let dataFailure = 0;
let refreshFailure = 0;
let rejectProbe = false;
const probeAttempts: { id: string; body: unknown }[] = [];
let bootstrapWait: Promise<void> | undefined;
let bootstrapSignal: AbortSignal | undefined;
globalThis.fetch = (async (
	input: string | URL | Request,
	options?: RequestInit,
) => {
	const path = new URL(String(input)).pathname;
	if (path.endsWith("/bootstrap")) {
		bootstraps++;
		bootstrapSignal = options?.signal ?? undefined;
		await bootstrapWait;
		const id = principal(JSON.parse(String(options?.body)).anonymousHash);
		return Response.json({
			user: user(id),
			authTokens: { authToken: jwt(id), refreshToken: id },
		});
	}
	if (path === "/api/auth/v1/refresh") {
		refreshes++;
		if (refreshFailure)
			return Response.json(
				{ message: "refresh unavailable" },
				{ status: refreshFailure },
			);
		const id = JSON.parse(String(options?.body)).refresh_token;
		return Response.json({ auth_token: jwt(id), csrf_token: "csrf" });
	}
	const token = new Headers(options?.headers)
		.get("Authorization")
		?.split(" ")[1];
	const id = JSON.parse(
		Buffer.from(token?.split(".")[1] ?? "", "base64url").toString(),
	).sub;
	if (path.endsWith("/me")) {
		if (dataFailure)
			return Response.json(
				{ error: { message: "data unavailable" } },
				{ status: dataFailure },
			);
		return Response.json({ user: user(id) });
	}
	probeAttempts.push({
		id,
		body: options?.body ? JSON.parse(String(options.body)) : null,
	});
	if (rejectProbe) {
		rejectProbe = false;
		return Response.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });
	}
	return Response.json({ id });
}) as typeof fetch;

const { createApi } = await import("../../apps/toss/src/api");
const key = "645-live.appSession";
const mirror = "645-live.tossSession";
let api = createApi();
expect(await Promise.all([api.ensure(), api.ensure(), api.ensure()])).toEqual(
	Array(3).fill(user("user-a")),
);
expect(bootstraps).toBe(1);
stored.set("645-live.saved.v1.user-a", "[]");
api.dispose();
api = createApi();
expect(await api.ensure()).toEqual(user("user-a"));
expect(bootstraps).toBe(1);
api.dispose();
api = createApi();
const unchangedWrites = writes;
await api.ensure();
expect(writes).toBe(unchangedWrites);
api.dispose();

function expire() {
	const session = JSON.parse(stored.get(key) ?? "null");
	session.authTokens.authToken = jwt("user-a", 1);
	session.sessionToken = session.authTokens.authToken;
	stored.set(key, JSON.stringify(session));
}
expire();
api = createApi();
expect(await api.ensure()).toEqual(user("user-a"));
expect(refreshes).toBe(1);
expect(bootstraps).toBe(1);
expect(JSON.parse(stored.get(key) ?? "null").authTokens.refreshToken).toBe(
	"user-a",
);
rejectProbe = true;
expect(await api.request("/probe")).toEqual({ id: "user-a" });
expect(refreshes).toBe(2);
expect(bootstraps).toBe(1);
api.dispose();

dataFailure = 503;
api = createApi();
const beforeOutage = stored.get(key);
await expect(api.ensure()).rejects.toThrow("data unavailable");
expect(stored.get(key)).toBe(beforeOutage);
expect(bootstraps).toBe(1);
dataFailure = 0;
await api.ensure();
api.dispose();
expire();
refreshFailure = 503;
api = createApi();
const beforeRefreshOutage = stored.get(key);
await expect(api.ensure()).rejects.toThrow("refresh unavailable");
expect(stored.get(key)).toBe(beforeRefreshOutage);
expect(bootstraps).toBe(1);
refreshFailure = 0;
await api.ensure();
api.dispose();

identityFailure = true;
api = createApi();
const beforeIdentityFailure = stored.get(key);
await expect(api.ensure()).rejects.toThrow("anonymous key");
expect(stored.get(key)).toBe(beforeIdentityFailure);
expect(bootstraps).toBe(1);
api.dispose();
identityFailure = false;
stored.set(mirror, stored.get(key) ?? "");
api = createApi();
await api.ensure();
identity = "fixture-account-b";
rejectProbe = true;
probeAttempts.length = 0;
await expect(api.request("/probe", { from: "old-account" })).rejects.toThrow(
	"계정이 바뀌었어요",
);
expect(probeAttempts).toEqual([
	{ id: "user-a", body: { from: "old-account" } },
]);
await expect(api.ensure()).rejects.toThrow("연결 요청을 중단");
api.dispose();
api = createApi();
expect(await api.ensure()).toEqual(user("user-b"));
expect(bootstraps).toBe(2);
expect(stored.get(mirror)).toBe("");
expect(stored.has("645-live.saved.v1.user-a")).toBe(true);
expect(await api.saved(user("user-b")).read()).toEqual([]);
api.dispose();

stored.clear();
let release!: () => void;
bootstrapWait = new Promise<void>((resolve) => {
	release = resolve;
});
api = createApi();
const pending = api.ensure().catch((error: unknown) => error);
for (let i = 0; i < 50 && bootstraps < 3; i++)
	await new Promise((resolve) => setTimeout(resolve, 1));
expect(bootstraps).toBe(3);
api.dispose();
expect(bootstrapSignal?.aborted).toBe(true);
release();
expect(await pending).toBeInstanceOf(Error);
expect(stored.get(key)).toBe("");
bootstrapWait = undefined;
api.reconnect();
expect(await api.ensure()).toEqual(user("user-b"));
api.dispose();
console.log(
	"anonymous restore, refresh, outage, identity, and cancellation passed",
);
