import {
	createAppsInTossSdkStorageBridge,
	createAppsInTossWebAdapter,
} from "@trailbase-apps-in-toss-kit/ait-web";
import { StaleAppSessionOperationError } from "@trailbase-apps-in-toss-kit/trailbase-client";

const loadSdk = () => import("@apps-in-toss/web-framework");
export function createSessionStorage(appKey: string, local: boolean) {
	const adapter = createAppsInTossWebAdapter({ appKey: "645-live", loadSdk });
	const sdkStorage = createAppsInTossSdkStorageBridge({
		framework: async () => ({ available: true, module: await loadSdk() }),
	});
	const device = local ? window.localStorage : sdkStorage;
	const anonymousHashStorageKey = appKey + ".anonymousHash";
	const appSessionStorageKey = appKey + ".appSession";
	const tossSessionStorageKey = appKey + ".tossSession";
	const credentials = [appSessionStorageKey, tossSessionStorageKey];
	let tail = Promise.resolve();
	function serialize<T>(fn: () => Promise<T>) {
		const result = tail.then(fn);
		tail = result.then(
			() => {},
			() => {},
		);
		return result;
	}
	function check(signal?: AbortSignal) {
		if (signal?.aborted) throw new StaleAppSessionOperationError();
	}
	async function read(key: string, signal?: AbortSignal) {
		if (key !== anonymousHashStorageKey && !credentials.includes(key))
			return device.getItem(key);
		const current = await device.getItem(anonymousHashStorageKey);
		check(signal);
		const next = local
			? current || "dev-anon-" + crypto.randomUUID()
			: await adapter.anonymousHash();
		check(signal);
		if (current !== next) {
			for (const k of credentials) {
				check(signal);
				await device.setItem(k, "");
			}
			check(signal);
			await device.setItem(anonymousHashStorageKey, next);
		}
		return key === anonymousHashStorageKey ? next : device.getItem(key);
	}
	return {
		adapter,
		anonymousHashStorageKey,
		appSessionStorageKey,
		tossSessionStorageKey,
		storage: {
			getItem: (key: string) => serialize(() => read(key)),
			getItemWithSignal: (key: string, signal: AbortSignal) =>
				serialize(() => read(key, signal)),
			setItem: (key: string, value: string) =>
				serialize(async () => {
					await device.setItem(key, value);
				}),
		},
	};
}
