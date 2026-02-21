import { Database } from "bun:sqlite";
import { join } from "node:path";

type Lt645RoundItem = {
  ltEpsd: number;
  ltRflYmd: string;
  tm1WnNo: number;
  tm2WnNo: number;
  tm3WnNo: number;
  tm4WnNo: number;
  tm5WnNo: number;
  tm6WnNo: number;
  bnsWnNo: number;
  rnk1WnNope: number;
  rnk1WnAmt: number;
  rnk1SumWnAmt: number;
  rlvtEpsdSumNtslAmt: number;
};

type Lt645RoundResponse = {
  data?: {
    list?: Lt645RoundItem[];
  };
};

type LtEpsdInfoItem = {
  ltEpsd: number;
};

type LtEpsdInfoResponse = {
  data?: {
    list?: LtEpsdInfoItem[];
  };
};

type LottoDrawResult = {
  round: number;
  draw_date: string;
  total_sell_amount: number;
  first_prize_amount: number;
  first_prize_winner_count: number;
  first_prize_accumulated_amount: number;
  draw_number_1: number;
  draw_number_2: number;
  draw_number_3: number;
  draw_number_4: number;
  draw_number_5: number;
  draw_number_6: number;
  bonus_number: number;
};

const DRAW_INFO_URL =
  "https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do";
const EPSD_INFO_URL = "https://www.dhlottery.co.kr/lt645/selectLtEpsdInfo.do";

const dbPath = join(__dirname, "./data/main.db");
const db = new Database(dbPath);

let lastFailCount = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function normalizeDate(yyyymmdd: string): string {
  if (/^\d{8}$/.test(yyyymmdd)) {
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  }

  return yyyymmdd;
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

async function getLatestOfficialRound(): Promise<number | null> {
  try {
    const data = await fetchJson<LtEpsdInfoResponse>(EPSD_INFO_URL);
    const list = data.data?.list ?? [];

    if (list.length === 0) {
      return null;
    }

    return list.reduce(
      (maxRound, row) => Math.max(maxRound, normalizeInt(row.ltEpsd)),
      0,
    );
  } catch (error) {
    console.error("❌ 최신 회차 조회 실패:", error);
    return null;
  }
}

async function getRoundData(round: number): Promise<Lt645RoundItem | null> {
  try {
    const url = `${DRAW_INFO_URL}?srchDir=center&srchLtEpsd=${round}&_=${Date.now()}`;
    const data = await fetchJson<Lt645RoundResponse>(url);
    const list = data.data?.list ?? [];

    const exact = list.find((item) => normalizeInt(item.ltEpsd) === round);
    if (!exact) {
      return null;
    }

    return exact;
  } catch (error) {
    console.error(`❌ 회차 ${round} 조회 실패:`, error);
    return null;
  }
}

function transformLottoData(apiData: Lt645RoundItem): LottoDrawResult {
  const numbers = [
    normalizeInt(apiData.tm1WnNo),
    normalizeInt(apiData.tm2WnNo),
    normalizeInt(apiData.tm3WnNo),
    normalizeInt(apiData.tm4WnNo),
    normalizeInt(apiData.tm5WnNo),
    normalizeInt(apiData.tm6WnNo),
  ].sort((a, b) => a - b);

  return {
    round: normalizeInt(apiData.ltEpsd),
    draw_date: normalizeDate(String(apiData.ltRflYmd ?? "")),
    total_sell_amount: normalizeInt(apiData.rlvtEpsdSumNtslAmt),
    first_prize_amount: normalizeInt(apiData.rnk1WnAmt),
    first_prize_winner_count: normalizeInt(apiData.rnk1WnNope),
    first_prize_accumulated_amount: normalizeInt(apiData.rnk1SumWnAmt),
    draw_number_1: numbers[0],
    draw_number_2: numbers[1],
    draw_number_3: numbers[2],
    draw_number_4: numbers[3],
    draw_number_5: numbers[4],
    draw_number_6: numbers[5],
    bonus_number: normalizeInt(apiData.bnsWnNo),
  };
}

function isRoundExists(round: number): boolean {
  const query = db.prepare(
    "SELECT COUNT(*) as count FROM lotto_draw_results WHERE round = ?",
  );
  const result = query.get(round) as { count: number };
  return result.count > 0;
}

function insertLottoResult(data: LottoDrawResult): boolean {
  try {
    if (isRoundExists(data.round)) {
      console.log(`⏭️ 회차 ${data.round}는 이미 존재합니다. 건너뜁니다.`);
      return true;
    }

    const insertQuery = db.prepare(`
      INSERT INTO lotto_draw_results (
        round, draw_date, total_sell_amount, first_prize_amount,
        first_prize_winner_count, first_prize_accumulated_amount,
        draw_number_1, draw_number_2, draw_number_3,
        draw_number_4, draw_number_5, draw_number_6, bonus_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertQuery.run(
      data.round,
      data.draw_date,
      data.total_sell_amount,
      data.first_prize_amount,
      data.first_prize_winner_count,
      data.first_prize_accumulated_amount,
      data.draw_number_1,
      data.draw_number_2,
      data.draw_number_3,
      data.draw_number_4,
      data.draw_number_5,
      data.draw_number_6,
      data.bonus_number,
    );

    console.log(`✅ 회차 ${data.round} 삽입 완료`);
    console.log(
      `   🎱 당첨번호: ${data.draw_number_1}, ${data.draw_number_2}, ${data.draw_number_3}, ${data.draw_number_4}, ${data.draw_number_5}, ${data.draw_number_6} + ${data.bonus_number}`,
    );

    return true;
  } catch (error) {
    console.error(`❌ 회차 ${data.round} DB 삽입 오류:`, error);
    return false;
  }
}

export async function importSingleRound(round: number): Promise<boolean> {
  console.log(`\n🚀 회차 ${round} 가져오기 시작...`);

  const row = await getRoundData(round);
  if (!row) {
    console.warn(`⚠️ 회차 ${round} 데이터를 공식 API에서 찾지 못했습니다.`);
    return false;
  }

  const lottoData = transformLottoData(row);
  return insertLottoResult(lottoData);
}

export async function importRangeRounds(
  startRound: number,
  endRound: number,
): Promise<void> {
  console.log(`\n🎯 회차 ${startRound}부터 ${endRound}까지 가져오기 시작...`);

  let successCount = 0;
  let failCount = 0;

  for (let round = startRound; round <= endRound; round++) {
    const success = await importSingleRound(round);

    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    if (round < endRound) {
      await sleep(150);
    }
  }

  lastFailCount = failCount;

  console.log("\n📊 완료 요약:");
  console.log(`   ✅ 성공: ${successCount}회차`);
  console.log(`   ❌ 실패: ${failCount}회차`);
  console.log(`   📈 총 처리: ${endRound - startRound + 1}회차`);
}

export async function updateLatestRounds(maxRounds = 5): Promise<void> {
  console.log(`\n🔄 최신 ${maxRounds}회차 업데이트 확인 중...`);

  const latestQuery = db.prepare(
    "SELECT MAX(round) as latest_round FROM lotto_draw_results",
  );
  const result = latestQuery.get() as { latest_round: number | null };

  const dbLatestRound = result.latest_round ?? 0;
  const startRound = dbLatestRound + 1;

  const latestOfficialRound = await getLatestOfficialRound();

  if (latestOfficialRound == null) {
    console.warn("⚠️ 최신 공식 회차를 가져오지 못해 업데이트를 중단합니다.");
    lastFailCount = 1;
    return;
  }

  const requestedEndRound = startRound + maxRounds - 1;
  const endRound = Math.min(requestedEndRound, latestOfficialRound);

  console.log(`📈 DB 최신 회차: ${dbLatestRound || "없음"}`);
  console.log(`🏛️ 공식 최신 회차: ${latestOfficialRound}`);

  if (startRound > endRound) {
    console.log("✅ 추가로 가져올 신규 회차가 없습니다.");
    lastFailCount = 0;
    return;
  }

  console.log(`🎯 확인할 회차 범위: ${startRound} ~ ${endRound}`);
  await importRangeRounds(startRound, endRound);
}

function printUsage(): void {
  console.log(`
🎲 로또 추첨 결과 가져오기 스크립트 (신규 API 기반)

사용법:
  bun run import-draw-results.ts <명령어> [옵션]

명령어:
  single <회차>                    # 특정 회차만 가져오기
  range <시작회차> <종료회차>       # 범위 회차 가져오기
  latest [최대개수]                # DB 기준 최신 회차들 업데이트 (기본값: 5)
`);
}

async function main() {
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

        const ok = await importSingleRound(round);
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

        await importRangeRounds(startRound, endRound);
        break;
      }

      case "latest": {
        const maxRounds =
          args.length >= 2 ? Number.parseInt(args[1], 10) : 5;

        if (!Number.isInteger(maxRounds) || maxRounds <= 0) {
          throw new Error("최대 개수는 1 이상의 정수여야 합니다.");
        }

        await updateLatestRounds(maxRounds);
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
  }
}

if (import.meta.main) {
  main().finally(() => {
    db.close();
  });
}
