/**
 * Authentication adapter for TrailBase
 */

import type {
	AdapterError,
	AuthAdapter,
	AuthResult,
	RegisterData,
	User,
} from "../types/index.js";

interface TrailBaseAuthUser extends Record<string, unknown> {
	id: string;
	email: string;
	created_at: string;
	updated_at: string;
	user_metadata?: Record<string, unknown>;
	app_metadata?: Record<string, unknown>;
}

interface TrailBaseSessionResponse {
	user?: TrailBaseAuthUser;
	access_token?: string;
	refresh_token?: string;
}

interface TrailBaseClient {
	auth: {
		signInWithPassword(credentials: {
			email: string;
			password: string;
		}): Promise<TrailBaseSessionResponse>;
		signOut(): Promise<void>;
		signUp(data: {
			email: string;
			password: string;
			options?: { data?: Record<string, unknown> };
		}): Promise<TrailBaseSessionResponse>;
		getUser(): Promise<{ user?: TrailBaseAuthUser }>;
		refreshSession(): Promise<{
			access_token?: string;
			refresh_token?: string;
		}>;
	};
}

export class TrailBaseAuthAdapter implements AuthAdapter {
	private client: TrailBaseClient | null = null;
	private currentUser: User | null = null;
	private token: string | null = null;

	constructor(client: TrailBaseClient) {
		this.client = client;
		this.loadStoredAuth();
	}

	async login(email: string, password: string): Promise<AuthResult> {
		try {
			if (!this.client) {
				throw new Error("TrailBase client not initialized");
			}

			const response = await this.client.auth.signInWithPassword({
				email,
				password,
			});

			if (!response.user || !response.access_token) {
				throw new Error("TrailBase login response is missing user or token");
			}

			const authResult: AuthResult = {
				user: this.mapUser(response.user),
				token: response.access_token,
				refreshToken: response.refresh_token,
			};

			// Store auth data
			this.currentUser = authResult.user;
			this.token = authResult.token;
			this.storeAuth(authResult);

			return authResult;
		} catch (error) {
			throw this.createAuthError(error, "Login failed");
		}
	}

	async logout(): Promise<void> {
		try {
			if (this.client && this.token) {
				await this.client.auth.signOut();
			}
		} catch (error) {
			console.warn("Logout error:", error);
		} finally {
			this.currentUser = null;
			this.token = null;
			this.clearStoredAuth();
		}
	}

	async register(userData: RegisterData): Promise<AuthResult> {
		try {
			if (!this.client) {
				throw new Error("TrailBase client not initialized");
			}

			const response = await this.client.auth.signUp({
				email: userData.email,
				password: userData.password,
				options: {
					data: {
						name: userData.name,
					},
				},
			});

			if (!response.user || !response.access_token) {
				throw new Error(
					"TrailBase registration response is missing user or token",
				);
			}

			const authResult: AuthResult = {
				user: this.mapUser(response.user),
				token: response.access_token,
				refreshToken: response.refresh_token,
			};

			// Store auth data
			this.currentUser = authResult.user;
			this.token = authResult.token;
			this.storeAuth(authResult);

			return authResult;
		} catch (error) {
			throw this.createAuthError(error, "Registration failed");
		}
	}

	async getCurrentUser(): Promise<User | null> {
		if (this.currentUser) {
			return this.currentUser;
		}

		try {
			if (!this.client || !this.token) {
				return null;
			}

			const response = await this.client.auth.getUser();

			if (response?.user) {
				this.currentUser = this.mapUser(response.user);
				return this.currentUser;
			}

			return null;
		} catch (error) {
			console.warn("Get current user error:", error);
			this.clearStoredAuth();
			return null;
		}
	}

	async refreshToken(): Promise<void> {
		try {
			if (!this.client) {
				throw new Error("TrailBase client not initialized");
			}

			const response = await this.client.auth.refreshSession();

			if (response?.access_token) {
				this.token = response.access_token;

				if (!this.currentUser) {
					throw new Error("No current user available for token refresh");
				}

				const authResult: AuthResult = {
					user: this.currentUser,
					token: response.access_token,
					refreshToken: response.refresh_token,
				};

				this.storeAuth(authResult);
			}
		} catch (error) {
			throw this.createAuthError(error, "Token refresh failed");
		}
	}

	isAuthenticated(): boolean {
		return this.token !== null && this.currentUser !== null;
	}

	getToken(): string | null {
		return this.token;
	}

	// Private helper methods
	private mapUser(userData: Record<string, unknown>): User {
		const userMetadata = userData.user_metadata as
			| Record<string, unknown>
			| undefined;
		const appMetadata = userData.app_metadata as
			| Record<string, unknown>
			| undefined;
		const email = userData.email as string;

		return {
			id: userData.id as string,
			email,
			name: (userMetadata?.name as string) || email.split("@")[0],
			avatar: userMetadata?.avatar_url as string | undefined,
			roles: (appMetadata?.roles as string[]) || [],
			created_at: userData.created_at as string,
			updated_at: userData.updated_at as string,
		};
	}

	private storeAuth(authResult: AuthResult): void {
		if (typeof window === "undefined") return;

		try {
			localStorage.setItem(
				"trailbase_auth",
				JSON.stringify({
					user: authResult.user,
					token: authResult.token,
					refreshToken: authResult.refreshToken,
					timestamp: Date.now(),
				}),
			);
		} catch (error) {
			console.warn("Failed to store auth data:", error);
		}
	}

	private loadStoredAuth(): void {
		if (typeof window === "undefined") return;

		try {
			const stored = localStorage.getItem("trailbase_auth");
			if (stored) {
				const authData = JSON.parse(stored);

				// Check if token is not too old (7 days)
				const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
				if (Date.now() - authData.timestamp < maxAge) {
					this.currentUser = authData.user;
					this.token = authData.token;
				} else {
					this.clearStoredAuth();
				}
			}
		} catch (error) {
			console.warn("Failed to load stored auth:", error);
			this.clearStoredAuth();
		}
	}

	private clearStoredAuth(): void {
		if (typeof window === "undefined") return;

		try {
			localStorage.removeItem("trailbase_auth");
		} catch (error) {
			console.warn("Failed to clear stored auth:", error);
		}
	}

	private createAuthError(error: unknown, message: string): AdapterError {
		const authError: AdapterError = new Error(message);

		if (error && typeof error === "object") {
			const err = error as Record<string, unknown>;
			authError.status =
				(err.status as number) || (err.statusCode as number) || 500;
			authError.code = (err.code as string) || "AUTH_ERROR";

			if (err.message) {
				authError.message = `${message}: ${err.message}`;
			}
		}

		authError.name = "AdapterError";
		return authError;
	}
}
