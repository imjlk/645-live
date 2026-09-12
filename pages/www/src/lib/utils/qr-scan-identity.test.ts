import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type {
	QRScanHistoryItem,
	QRScanSyncStrategy,
} from "./qr-scan-history-v2";

mock.module("$app/environment", () => ({ browser: true }));
const originalLottoCommon = { ...(await import("./lotto-common.js")) };
mock.module("./lotto-common.js", () => ({
	...originalLottoCommon,
	getLatestLottoRoundFromAPI: async () => ({ drwNo: 1240 }),
	getLottoNumbersFromAPI: async () => null,
}));
const { LocalStorageProvider, QRScanHistoryManagerImpl } = await import(
	"./qr-scan-history-v2"
);
const memory = new Map<string, string>();
const originalStorage = Object.getOwnPropertyDescriptor(
	globalThis,
	"localStorage",
);
Object.defineProperty(globalThis, "localStorage", {
	configurable: true,
	value: {
		getItem: (key: string) => memory.get(key) ?? null,
		setItem: (key: string, value: string) => {
			memory.set(key, value);
		},
		removeItem: (key: string) => {
			memory.delete(key);
		},
	},
});
afterAll(() => {
	if (originalStorage)
		Object.defineProperty(globalThis, "localStorage", originalStorage);
	else Reflect.deleteProperty(globalThis, "localStorage");
	mock.module("./lotto-common.js", () => originalLottoCommon);
	mock.restore();
});

const record = (
	userId?: string,
	id = userId ?? "guest",
): QRScanHistoryItem => ({
	id,
	ticketHash: "shared-ticket",
	qrData: "https://m.dhlottery.co.kr/?v=1240m010203040506",
	scannedAt: new Date(),
	round: 1240,
	gamesCount: 1,
	resultStatus: "unknown",
	summary: `${userId ?? "guest"} record`,
	userId,
	syncStatus: "synced",
});
const deferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
};
const strategy = (
	download: QRScanSyncStrategy["downloadRemote"],
): QRScanSyncStrategy => ({
	name: "test",
	canSync: () => true,
	uploadPending: async (items) => ({
		success: items.map((item) => item.id),
		failed: [],
	}),
	downloadRemote: download,
});

beforeEach(() => {
	memory.clear();
});

describe("member scan identity isolation", () => {
	it("shows only anonymous records after logout, preserving other account partitions", async () => {
		const storage = new LocalStorageProvider();
		await storage.addItem(record("a"));
		await storage.addItem(record("b"));
		await storage.addItem(record());
		const manager = new QRScanHistoryManagerImpl();
		manager.setUserId("a");
		expect((await manager.getHistory()).map((item) => item.userId)).toEqual([
			"a",
		]);
		manager.setUserId(null);
		expect((await manager.getHistory()).map((item) => item.userId)).toEqual([
			undefined,
		]);
		expect((await manager.getStats()).totalScans).toBe(1);
		await manager.clearHistory();
		expect(
			(await storage.getItems()).map((item) => item.userId).sort(),
		).toEqual(["a", "b"]);
	});

	it("discards an old account response when the active account changes", async () => {
		const download = deferred<QRScanHistoryItem[]>();
		const started = deferred<void>();
		const manager = new QRScanHistoryManagerImpl();
		manager.setUserId("a");
		manager.setSyncStrategy(
			strategy(() => {
				started.resolve();
				return download.promise;
			}),
		);
		const result = manager.sync();
		await started.promise;
		manager.setUserId("b");
		download.resolve([record("a")]);
		expect((await result).success).toBe(false);
		expect(await new LocalStorageProvider().getItems()).toEqual([]);
	});

	it("does not resurrect a member's cached data after logout", async () => {
		const download = deferred<QRScanHistoryItem[]>();
		const started = deferred<void>();
		const manager = new QRScanHistoryManagerImpl();
		manager.setUserId("a");
		manager.setSyncStrategy(
			strategy(() => {
				started.resolve();
				return download.promise;
			}),
		);
		const result = manager.sync();
		await started.promise;
		manager.setUserId(null);
		manager.setSyncStrategy(null);
		download.resolve([record("a")]);
		expect((await result).success).toBe(false);
		expect(await manager.getHistory()).toEqual([]);
	});

	it("does not overwrite another account with the same ticket hash", async () => {
		const storage = new LocalStorageProvider();
		await storage.addItem(record("b"));
		const manager = new QRScanHistoryManagerImpl();
		manager.setUserId("a");
		manager.setSyncStrategy(strategy(async () => [record("a")]));
		expect((await manager.sync()).success).toBe(true);
		expect((await storage.getItems({ userId: "b" }))[0]?.summary).toBe(
			"b record",
		);
		expect((await storage.getItems({ userId: "a" }))[0]?.summary).toBe(
			"a record",
		);
	});

	it("rejects a stale QR response explicitly owned by a different account", async () => {
		const manager = new QRScanHistoryManagerImpl();
		manager.setUserId("b");
		await expect(manager.upsertScan(record("a"))).rejects.toThrow(
			"계정이 변경",
		);
		expect(await new LocalStorageProvider().getItems()).toEqual([]);
	});

	it("withdrawal removes only the selected account's local records", async () => {
		const storage = new LocalStorageProvider();
		await storage.addItem(record("a"));
		await storage.addItem(record("b"));
		await storage.addItem(record());
		await storage.clearAll("a");
		expect((await storage.getItems()).map((item) => item.id).sort()).toEqual([
			"b",
			"guest",
		]);
	});
});
