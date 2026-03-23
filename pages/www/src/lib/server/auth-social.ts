import { env } from "$env/dynamic/private";
import type { RequestEvent } from "@sveltejs/kit";

export const SOCIAL_PROVIDER_IDS = ["google", "kakao", "naver"] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDER_IDS)[number];

export type SocialProviderDescriptor = {
	id: SocialProviderId;
	label: string;
};

type EventLike = Pick<RequestEvent, "platform">;

type SocialProviderConfigMap = {
	google?: {
		clientId: string;
		clientSecret: string;
		prompt: "select_account";
	};
	kakao?: {
		clientId: string;
		clientSecret?: string;
	};
	naver?: {
		clientId: string;
		clientSecret: string;
	};
};

const SOCIAL_PROVIDER_LABELS: Record<SocialProviderId, string> = {
	google: "Google",
	kakao: "카카오",
	naver: "네이버",
};

function readEnv(event: EventLike, key: string): string | null {
	const platformEnv = (event.platform?.env ?? {}) as Record<string, unknown>;
	const value = platformEnv[key] ?? env[key as keyof typeof env];

	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

export function getBetterAuthSocialProviders(
	event: EventLike,
): SocialProviderConfigMap | undefined {
	const googleClientId = readEnv(event, "GOOGLE_CLIENT_ID");
	const googleClientSecret = readEnv(event, "GOOGLE_CLIENT_SECRET");
	const kakaoClientId = readEnv(event, "KAKAO_CLIENT_ID");
	const kakaoClientSecret = readEnv(event, "KAKAO_CLIENT_SECRET");
	const naverClientId = readEnv(event, "NAVER_CLIENT_ID");
	const naverClientSecret = readEnv(event, "NAVER_CLIENT_SECRET");

	const providers: SocialProviderConfigMap = {};

	if (googleClientId && googleClientSecret) {
		providers.google = {
			clientId: googleClientId,
			clientSecret: googleClientSecret,
			prompt: "select_account",
		};
	}

	if (kakaoClientId) {
		providers.kakao = {
			clientId: kakaoClientId,
			...(kakaoClientSecret ? { clientSecret: kakaoClientSecret } : {}),
		};
	}

	if (naverClientId && naverClientSecret) {
		providers.naver = {
			clientId: naverClientId,
			clientSecret: naverClientSecret,
		};
	}

	return Object.keys(providers).length > 0 ? providers : undefined;
}

export function getConfiguredSocialProviders(
	event: EventLike,
): SocialProviderDescriptor[] {
	const providers = getBetterAuthSocialProviders(event);
	if (!providers) {
		return [];
	}

	return SOCIAL_PROVIDER_IDS.filter((id) => providers[id]).map((id) => ({
		id,
		label: SOCIAL_PROVIDER_LABELS[id],
	}));
}
