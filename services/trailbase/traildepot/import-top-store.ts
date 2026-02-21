/**
 * 로또 당첨점 조회 CLI 유틸리티 (신규 JSON API 기반)
 */

import { Database } from "bun:sqlite";
import { join } from "node:path";

export type WinningStore = {
  round: number;
  store_name: string;
  address: string;
  win_type: "1등" | "2등";
  selection_type?: "자동" | "수동";
};

type WinningStoreApiItem = {
  shpNm?: string;
  shpAddr?: string;
  wnShpRnk?: number | string;
  atmtPsvYnTxt?: string | null;
};

type WinningStoreApiResponse = {
  data?: {
    list?: WinningStoreApiItem[];
  };
};

const WINNING_STORE_URL =
  "https://www.dhlottery.co.kr/wnprchsplcsrch/selectLtWnShp.do";

let db: Database | null = null;
let lastFailCount = 0;

function getDatabase(): Database {
  if (!db) {
    const dbPath = join(__dirname, "./data/main.db");
    db = new Database(dbPath);
  }
  return db;
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSelectionType(value: unknown): "자동" | "수동" | undefined {
  const text = typeof value === "string" ? normalizeSpace(value) : "";

  if (!text) {
    return undefined;
  }

  if (text.includes("자동")) {
    return "자동";
  }

  if (text.includes("수동")) {
    return "수동";
  }

  return undefined;
}

function normalizeWinType(value: unknown): "1등" | "2등" | null {
  const rank = typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (rank === 1) {
    return "1등";
  }

  if (rank === 2) {
    return "2등";
  }

  return null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const preview = raw.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `JSON 응답이 아님 (content-type=${contentType || "unknown"}, body=${preview})`,
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    const preview = raw.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `JSON 파싱 실패: ${(error as Error).message} (body=${preview})`,
    );
  }
}

export async function fetchWinningStores(round: number): Promise<WinningStore[]> {
  try {
    console.log(`🏪 회차 ${round} 당첨점 정보 조회 시작...`);

    const url = `${WINNING_STORE_URL}?srchWnShpRnk=all&srchLtEpsd=${round}&srchShpLctn=&_=${Date.now()}`;
    const data = await fetchJson<WinningStoreApiResponse>(url);
    const list = data.data?.list ?? [];

    const stores: WinningStore[] = [];

    for (const item of list) {
      const winType = normalizeWinType(item.wnShpRnk);
      if (!winType) {
        continue;
      }

      const storeName = normalizeSpace(String(item.shpNm ?? ""));
      const address = normalizeSpace(String(item.shpAddr ?? ""));

      if (!storeName || !address) {
        continue;
      }

      stores.push({
        round,
        store_name: storeName,
        address,
        win_type: winType,
        selection_type:
          winType === "1등" ? normalizeSelectionType(item.atmtPsvYnTxt) : undefined,
      });
    }

    const firstCount = stores.filter((store) => store.win_type === "1등").length;
    const secondCount = stores.filter((store) => store.win_type === "2등").length;

    console.log(
      `✅ 회차 ${round} 당첨점 조회 완료: 총 ${stores.length}개 (1등: ${firstCount}개, 2등: ${secondCount}개)`,
    );

    return stores;
  } catch (error) {
    console.error(`❌ 회차 ${round} 당첨점 조회 실패:`, error);
    return [];
  }
}

function saveWinningStores(round: number, stores: WinningStore[]): boolean {
  const database = getDatabase();

  if (stores.length === 0) {
    console.warn(`⚠️ 회차 ${round}의 당첨점 정보가 없습니다.`);
    return false;
  }

  try {
    const deleteStmt = database.prepare(
      "DELETE FROM lotto_winning_stores WHERE round = ?",
    );

    const insertStmt = database.prepare(`
      INSERT INTO lotto_winning_stores (
        round, store_name, address, win_type, selection_type
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = database.transaction((rows: WinningStore[]) => {
      deleteStmt.run(round);

      for (const store of rows) {
        insertStmt.run(
          store.round,
          store.store_name,
          store.address,
          store.win_type,
          store.selection_type ?? null,
        );
      }
    });

    transaction(stores);

    console.log(`💾 회차 ${round} 당첨점 ${stores.length}개 저장 완료`);
    return true;
  } catch (error) {
    console.error(`❌ 회차 ${round} DB 저장 실패:`, error);
    return false;
  }
}

export async function importWinningStoresForRound(round: number): Promise<boolean> {
  console.log(`\n🎯 회차 ${round} 당첨점 수집 시작...`);

  const stores = await fetchWinningStores(round);
  return saveWinningStores(round, stores);
}

export async function importWinningStoresForRange(
  startRound: number,
  endRound: number,
): Promise<void> {
  console.log(`\n📦 회차 ${startRound}~${endRound} 당첨점 수집 시작...`);

  let successCount = 0;
  let failCount = 0;

  for (let round = startRound; round <= endRound; round++) {
    const ok = await importWinningStoresForRound(round);

    if (ok) {
      successCount++;
    } else {
      failCount++;
    }
  }

  lastFailCount = failCount;

  console.log("\n📊 완료 요약:");
  console.log(`   ✅ 성공: ${successCount}회차`);
  console.log(`   ❌ 실패: ${failCount}회차`);
  console.log(`   📈 총 처리: ${endRound - startRound + 1}회차`);
}

export async function updateLatestWinningStores(): Promise<void> {
  const database = getDatabase();

  const row = database
    .prepare("SELECT MAX(round) as latest_round FROM lotto_draw_results")
    .get() as { latest_round: number | null };

  if (!row.latest_round) {
    console.error("❌ lotto_draw_results에 회차 데이터가 없어 당첨점 업데이트를 진행할 수 없습니다.");
    lastFailCount = 1;
    return;
  }

  console.log(`최신 회차 ${row.latest_round}의 당첨점을 가져옵니다...`);

  const ok = await importWinningStoresForRound(row.latest_round);
  lastFailCount = ok ? 0 : 1;
}

function printUsage(): void {
  console.log(`
🏪 로또 당첨점 조회 스크립트 (신규 API 기반)

사용법:
  bun run import-top-store.ts <명령어> [옵션]

명령어:
  single <회차>                    # 특정 회차 당첨점 가져오기
  range <시작회차> <종료회차>       # 범위 회차 당첨점 가져오기
  latest                          # lotto_draw_results 최신 회차 당첨점 가져오기
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case "single": {
        if (args.length < 2) {
          throw new Error("회차를 입력해주세요.");
        }

        const round = Number.parseInt(args[1], 10);
        if (!Number.isInteger(round) || round <= 0) {
          throw new Error("유효한 회차 번호를 입력해주세요.");
        }

        const ok = await importWinningStoresForRound(round);
        lastFailCount = ok ? 0 : 1;
        break;
      }

      case "range": {
        if (args.length < 3) {
          throw new Error("시작회차와 종료회차를 입력해주세요.");
        }

        const startRound = Number.parseInt(args[1], 10);
        const endRound = Number.parseInt(args[2], 10);

        if (
          !Number.isInteger(startRound) ||
          !Number.isInteger(endRound) ||
          startRound <= 0 ||
          endRound < startRound
        ) {
          throw new Error("유효한 회차 범위를 입력해주세요.");
        }

        await importWinningStoresForRange(startRound, endRound);
        break;
      }

      case "latest": {
        await updateLatestWinningStores();
        break;
      }

      default:
        throw new Error(`알 수 없는 명령어: ${command}`);
    }

    if (lastFailCount > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      "\n❌ 오류 발생:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  } finally {
    if (db) {
      db.close();
      db = null;
    }
  }
}

if (import.meta.main) {
  main();
}
