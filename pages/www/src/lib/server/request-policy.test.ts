import { expect, test } from "bun:test";
import {
	hasSessionCookie,
	isCrossOriginMutation,
	needsMemberDatabase,
} from "./request-policy";

test("public and static pages do not initialize member auth/DB", () => {
	for (const path of [
		"/",
		"/my",
		"/login",
		"/qr-scan",
		"/history",
		"/api/auth/providers.json",
		"/api/lotto-draws-recent.json",
		"/stats/numbers/1",
	])
		expect(needsMemberDatabase(path)).toBe(false);
	for (const path of [
		"/auth/sign-in/email",
		"/rpc/myScans/list",
		"/api/qr-scan",
		"/sign-out",
	])
		expect(needsMemberDatabase(path)).toBe(true);
});
test("only an exact Better Auth session cookie prevents anonymous short circuit", () => {
	for (const cookie of [
		null,
		"",
		"theme=dark",
		"xbetter-auth.session_token=abc",
		"better-auth.session_token=",
	])
		expect(hasSessionCookie(cookie)).toBe(false);
	for (const cookie of [
		"better-auth.session_token=abc",
		"theme=dark; __Secure-better-auth.session_token=abc",
	])
		expect(hasSessionCookie(cookie)).toBe(true);
});
test("private mutations reject cross-origin and null origins", () => {
	for (const origin of ["https://attacker.example", "null"])
		expect(
			isCrossOriginMutation(
				new Request("https://645.live/api/qr-scan", {
					method: "POST",
					headers: { origin },
				}),
			),
		).toBe(true);
	expect(
		isCrossOriginMutation(
			new Request("https://645.live/rpc/myScans/list", {
				method: "POST",
				headers: { origin: "https://645.live" },
			}),
		),
	).toBe(false);
});
