import type { RequestEvent } from "@sveltejs/kit";
import {
	hashPassword as fallbackHashPassword,
	verifyPassword as fallbackVerifyPassword,
} from "better-auth/crypto";
import { shouldAllowLocalAuthFallback } from "./auth-runtime";

type EventLike = Pick<RequestEvent, "platform" | "url">;

type AuthHasherBinding = Fetcher;

type AuthPasswordHasher = {
	hash(password: string): Promise<string>;
	verify(data: { hash: string; password: string }): Promise<boolean>;
};

function resolveBinding(event: EventLike): AuthHasherBinding | null {
	const platformEnv = (event.platform?.env ?? {}) as Record<string, unknown>;
	return (platformEnv.AUTH_HASHER as AuthHasherBinding | undefined) || null;
}

async function callHasher<T>(
	binding: AuthHasherBinding,
	path: string,
	body: Record<string, unknown>,
): Promise<T> {
	const response = await binding.fetch("https://auth-hasher.internal" + path, {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const message = await response.text().catch(() => response.statusText);
		throw new Error(`Auth hasher failed (${response.status}): ${message}`);
	}

	return (await response.json()) as T;
}

export function createAuthPasswordHasher(event: EventLike): AuthPasswordHasher {
	const binding = resolveBinding(event);
	const allowFallback = shouldAllowLocalAuthFallback(event);

	if (!binding) {
		if (!allowFallback && event.platform?.env) {
			throw new Error(
				"Missing AUTH_HASHER service binding. Bind AUTH_HASHER to the internal auth hasher worker.",
			);
		}

		return {
			hash: (password) => fallbackHashPassword(password),
			verify: ({ hash, password }) =>
				fallbackVerifyPassword({ hash, password }),
		};
	}

	return {
		hash: async (password) => {
			try {
				const { hash } = await callHasher<{ hash: string }>(binding, "/hash", {
					password,
				});
				return hash;
			} catch (error) {
				if (allowFallback) {
					return fallbackHashPassword(password);
				}
				throw error;
			}
		},
		verify: async ({ hash, password }) => {
			try {
				const { valid } = await callHasher<{ valid: boolean }>(
					binding,
					"/verify",
					{ hash, password },
				);
				return valid;
			} catch (error) {
				if (allowFallback) {
					return fallbackVerifyPassword({ hash, password });
				}
				throw error;
			}
		},
	};
}
