import type { PublicSession } from "@645/shared";
import { getContext, setContext } from "svelte";
import { browser } from "$app/environment";
import { authClient } from "$lib/auth-client";

const SESSION_CONTEXT = Symbol("browser-session");
const SESSION_EVENT = "645-auth-changed";
type SessionStatus = "loading" | "authenticated" | "anonymous" | "error";

// Each layout owns its session. The prerenderer never fetches or shares users.
export class BrowserSession {
	session = $state<PublicSession | null>(null);
	status = $state<SessionStatus>("loading");
	error = $state<string | null>(null);
	signingOut = $state(false);
	private revision = 0;
	private request: AbortController | null = null;
	private channel: BroadcastChannel | null = null;
	private lastRefreshedAt = 0;
	private expiryTimer: ReturnType<typeof setTimeout> | undefined;

	async refresh(): Promise<PublicSession | null> {
		if (!browser || this.signingOut) return null;
		const revision = ++this.revision;
		this.request?.abort();
		const controller = new AbortController();
		this.request = controller;
		this.lastRefreshedAt = Date.now();
		try {
			const { data, error } = await authClient.getSession({
				query: { disableCookieCache: true },
				fetchOptions: { signal: controller.signal },
			});
			if (revision !== this.revision) return null;
			if (error) throw new Error("로그인 상태를 확인하지 못했습니다.");
			this.session = data?.user?.id
				? {
						session: {
							expiresAt: new Date(data.session.expiresAt).toISOString(),
						},
						user: {
							id: data.user.id,
							name: data.user.name ?? null,
							email: data.user.email ?? null,
							image: data.user.image ?? null,
						},
					}
				: null;
			this.status = this.session ? "authenticated" : "anonymous";
			this.error = null;
			this.scheduleExpiry();
			return this.session;
		} catch {
			if (revision !== this.revision || controller.signal.aborted) return null;
			this.session = null;
			this.status = "error";
			this.error =
				"로그인 상태를 확인하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.";
			return null;
		} finally {
			if (revision === this.revision) this.request = null;
		}
	}

	private invalidate(): void {
		this.revision++;
		this.request?.abort();
		this.request = null;
		this.session = null;
		this.error = null;
		clearTimeout(this.expiryTimer);
	}

	private scheduleExpiry(): void {
		clearTimeout(this.expiryTimer);
		const expiresAt = this.session?.session.expiresAt;
		if (!expiresAt) return;
		const delay = new Date(expiresAt).getTime() - Date.now();
		this.expiryTimer = setTimeout(
			() => {
				this.invalidate();
				this.status = "loading";
				void this.refresh();
			},
			Math.max(1_000, Math.min(delay, 2_147_483_647)),
		);
	}

	private broadcast(kind: "signed-in" | "signed-out"): void {
		this.channel?.postMessage(kind);
		try {
			// A change marker only: cookies and user information stay out of storage.
			localStorage.setItem(SESSION_EVENT, `${kind}:${Date.now()}`);
		} catch {
			// Focus/visibility refresh still works if browser storage is unavailable.
		}
	}

	async signedIn(): Promise<PublicSession | null> {
		this.invalidate();
		this.status = "loading";
		const session = await this.refresh();
		this.broadcast("signed-in");
		return session;
	}

	accountDeleted(): void {
		this.invalidate();
		this.status = "anonymous";
		this.broadcast("signed-out");
	}

	async signOut(): Promise<boolean> {
		if (!browser || this.signingOut) return false;
		this.signingOut = true;
		this.invalidate();
		this.status = "loading";
		try {
			const { error } = await authClient.signOut();
			if (error) throw new Error("sign-out failed");
			this.status = "anonymous";
			this.broadcast("signed-out");
			return true;
		} catch {
			this.signingOut = false;
			await this.refresh();
			this.error = "로그아웃하지 못했습니다. 다시 시도해 주세요.";
			return false;
		} finally {
			this.signingOut = false;
		}
	}

	start(): () => void {
		if (!browser) return () => {};
		const refreshWhenVisible = () => {
			if (
				document.visibilityState === "visible" &&
				Date.now() - this.lastRefreshedAt > 5_000
			) {
				void this.refresh();
			}
		};
		const changed = () => {
			this.invalidate();
			this.status = "loading";
			void this.refresh();
		};
		const onStorage = (event: StorageEvent) => {
			if (event.key === SESSION_EVENT) changed();
		};
		const onPageShow = (event: PageTransitionEvent) => {
			if (event.persisted) changed();
		};
		if (typeof BroadcastChannel !== "undefined") {
			this.channel = new BroadcastChannel(SESSION_EVENT);
			this.channel.onmessage = changed;
		}
		window.addEventListener("focus", refreshWhenVisible);
		window.addEventListener("online", changed);
		window.addEventListener("storage", onStorage);
		window.addEventListener("pageshow", onPageShow);
		document.addEventListener("visibilitychange", refreshWhenVisible);
		void this.refresh();
		return () => {
			this.invalidate();
			this.channel?.close();
			window.removeEventListener("focus", refreshWhenVisible);
			window.removeEventListener("online", changed);
			window.removeEventListener("storage", onStorage);
			window.removeEventListener("pageshow", onPageShow);
			document.removeEventListener("visibilitychange", refreshWhenVisible);
		};
	}
}

export function provideBrowserSession(): BrowserSession {
	return setContext(SESSION_CONTEXT, new BrowserSession());
}

export function useBrowserSession(): BrowserSession {
	return getContext<BrowserSession>(SESSION_CONTEXT);
}

export function normalizeAuthNextPath(
	input: string | null | undefined,
): string {
	const value = String(input ?? "").trim();
	if (
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.includes("\\") ||
		Array.from(value).some(
			(character) =>
				character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
		)
	)
		return "/my";
	try {
		const url = new URL(value, "https://645.live");
		if (
			url.origin !== "https://645.live" ||
			url.pathname === "/login" ||
			url.pathname === "/sign-out" ||
			url.pathname.startsWith("/auth/")
		)
			return "/my";
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return "/my";
	}
}
