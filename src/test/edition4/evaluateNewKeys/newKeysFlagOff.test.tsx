/**
 * 판 4 라운드 S1 ⑤ — 새 백엔드 평가 응답(판 4 새 칸 포함)을 넣어도 플래그 끔 새 성적서가 판 3 정답과 **글자까지** 같다.
 *
 * - 백엔드 S1 은 `/api/evaluate` 응답에 칸을 더하기만 했다(최상위 `source_file`·`engine_version`, `f1_threshold_gain` 의
 *   그 점·지금 Recall·Precision·`*_raw`·`best_threshold_text`, `confidence_intervals[*].low_raw/high_raw`,
 *   `imbalance_effect.*_raw`). 프론트는 아직 새 칸을 읽지 않는다 — 아는 키만 고르는 파서(`parseF1ThresholdGain`·
 *   `parseConfidenceIntervals`·`parseImbalanceEffect`)와 최상위 칸을 골라 읽는 조립이 새 칸을 판 3 저장 데이터와 서술 요청에
 *   흘려 보내지 않아야 한다.
 * - 입력(`./<tag>.evaluate.json`): 새 백엔드로 실측 CSV·payload 를 평가한 응답에, 옛 입력(`edition3/newRun/inputs`)의
 *   `environment`(평가 시각·라이브러리 버전 — 실행마다 다름)만 덮은 것. 옛 응답의 키·값은 모두 그대로 들어 있다(아래 시험).
 * - 하네스(`edition3/newRun/newRun.harness.tsx`)는 판 3 정답 폴더 안이라 고치지 않는다. 하네스가 옛 평가 응답을 읽는
 *   `readFileSync` 만 이 폴더의 새 응답으로 돌린다(`vi.mock("node:fs")`). 돌렸는지는 횟수로 단정한다.
 * - 비교 정답은 `edition3/newRun/golden/`(판 3 정답, 고치지 않음)이다.
 */
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => ({ count: {} as Record<string, number> }));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const OLD = /([\\/])edition3\1newRun\1inputs\1(\w+)\.evaluate\.json$/;
  const readFileSync = ((path: unknown, ...rest: unknown[]) => {
    const m = typeof path === "string" ? OLD.exec(path) : null;
    if (m) {
      redirect.count[m[2]] = (redirect.count[m[2]] ?? 0) + 1;
      const sep = m[1];
      path = (path as string).replace(OLD, `${sep}edition4${sep}evaluateNewKeys${sep}${m[2]}.evaluate.json`);
    }
    return (actual.readFileSync as (...a: unknown[]) => unknown)(path, ...rest);
  }) as typeof actual.readFileSync;
  return { ...actual, readFileSync, default: { ...actual, readFileSync } };
});

import { readFileSync } from "node:fs";
import {
  FROZEN_NOW,
  GOLDEN_DIR,
  goldenNames,
  INPUT_DIR,
  runNewReport,
  TAGS,
  TZ_PINNED,
  type NewRunCapture,
  type Tag,
} from "../../edition3/newRun/newRun.harness";

const NEW_DIR = __dirname;
const golden = (name: string) => readFileSync(resolve(GOLDEN_DIR, name), "utf8");
const newResponse = (tag: Tag) => JSON.parse(readFileSync(resolve(NEW_DIR, `${tag}.evaluate.json`), "utf8"));

/** 옛 입력은 돌리지 않고 읽는다(비교용). */
async function oldResponse(tag: Tag) {
  const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
  return JSON.parse(fs.readFileSync(resolve(INPUT_DIR, `${tag}.evaluate.json`), "utf8"));
}

/** 실측 CSV 지문(edition3/newRun/README.md 에 적힌 값). 새 응답의 source_file 과 같아야 한다. */
const CSV_FINGERPRINT: Record<Tag, { sha256: string; size_bytes: number }> = {
  bc_strong: { sha256: "4ead9f2ccc8da32c0c3148f02ea6ff4e030c156d9873eeb99883df73f3a49f9d", size_bytes: 3727 },
  digits_strong: { sha256: "e92372fe028dc722132977c87a56929bc0933c3a28a4e6277bcd2dba8e3d66d4", size_bytes: 43332 },
  yeast_strong: { sha256: "0db2f6db36743028b268e01ad2d75aa8b0b5700e5cb632e56fefaebc53e145b8", size_bytes: 123672 },
};

/** 판 3 저장 데이터·서술 요청에 나타나면 새 칸이 샌 것이다. */
const LEAK_MARKERS = [
  "source_file", "sourceFile", "size_bytes", "engine_version", "engineVersion", "_raw", "best_threshold_text",
  "best_recall", "best_precision", "current_recall", "current_precision",
];

/** base 의 모든 키·값이 current 에 같은 값으로 있다. 어긋난 경로 목록. */
function missingOrChanged(base: unknown, current: unknown, path = "$"): string[] {
  if (Array.isArray(base)) {
    if (!Array.isArray(current) || current.length !== base.length) return [`${path}: 목록`];
    return base.flatMap((b, i) => missingOrChanged(b, current[i], `${path}[${i}]`));
  }
  if (base && typeof base === "object") {
    if (!current || typeof current !== "object" || Array.isArray(current)) return [`${path}: 객체 아님`];
    const cur = current as Record<string, unknown>;
    return Object.entries(base as Record<string, unknown>).flatMap(([k, v]) =>
      k in cur ? missingOrChanged(v, cur[k], `${path}.${k}`) : [`${path}.${k}: 빠짐`],
    );
  }
  return Object.is(base, current) ? [] : [`${path}: ${String(base)} → ${String(current)}`];
}

const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = TZ_PINNED;
});
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe.each(TAGS)("새 백엔드 응답으로 만든 판 3 새 성적서(플래그 끔) — %s", (tag: Tag) => {
  let captured: NewRunCapture;

  beforeAll(async () => {
    const before = redirect.count[tag] ?? 0;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FROZEN_NOW());
    try {
      captured = await runNewReport(tag);
    } finally {
      vi.useRealTimers();
    }
    // 하네스가 옛 응답 대신 이 폴더의 새 응답을 읽었다(돌리지 못하면 이 시험은 옛 응답을 다시 본 것뿐이다).
    expect((redirect.count[tag] ?? 0) - before).toBeGreaterThan(0);
  });

  it("입력: 새 응답은 옛 응답의 키·값을 모두 갖고, 판 4 새 칸이 실제로 들어 있다", async () => {
    const fresh = newResponse(tag);
    expect(missingOrChanged(await oldResponse(tag), fresh)).toEqual([]);
    expect(fresh.source_file).toEqual(CSV_FINGERPRINT[tag]);
    expect(fresh.engine_version).toBe("1.0.0");
    const cis = Object.values(fresh.results.success_metrics.confidence_intervals) as Record<string, unknown>[];
    expect(cis.length).toBeGreaterThan(0);
    for (const ci of cis) expect(ci).toHaveProperty("low_raw");
    expect(fresh.results.success_metrics.imbalance_effect).toHaveProperty("imbalance_ratio_raw");
    if (tag === "bc_strong") {
      expect(fresh.results.success_metrics.f1_threshold_gain).toMatchObject({
        best_threshold_text: "0.6166",
        best_recall_raw: 0.984375,
        best_precision_raw: 0.984375,
      });
    }
  });

  it("1단계 저장 데이터 = 판 3 정답", () => {
    expect(captured.stage1).toBe(golden(goldenNames(tag).stage1));
  });

  it("서술 작업 요청 본문 원문 = 판 3 정답", () => {
    expect(captured.request).toBe(golden(goldenNames(tag).request));
  });

  it("서술 완료 뒤 저장 데이터 = 판 3 정답", () => {
    expect(captured.final).toBe(golden(goldenNames(tag).final));
  });

  it("새 칸 이름·해시가 저장 데이터와 요청 어디에도 없다", () => {
    const hash = CSV_FINGERPRINT[tag].sha256;
    for (const text of [captured.stage1, captured.request, captured.final]) {
      for (const marker of [...LEAK_MARKERS, hash]) expect([marker, text.includes(marker)]).toEqual([marker, false]);
    }
  });
});

describe("새 응답 파일 지문", () => {
  // 새 응답이 바뀌면(백엔드 응답 모양이 또 바뀌면) 이 sha256 을 바뀐 이유와 함께 고친다. 판 3 정답은 고치지 않는다.
  it("세 파일의 sha256", () => {
    const sums = Object.fromEntries(
      TAGS.map((tag) => [tag, createHash("sha256").update(readFileSync(resolve(NEW_DIR, `${tag}.evaluate.json`))).digest("hex")]),
    );
    expect(sums).toEqual(EXPECTED_SHA256);
  });
});

const EXPECTED_SHA256: Record<Tag, string> = {
  bc_strong: "1a05b2e3ed4d12004e81311a2c2e75470a1921e8d91f9d1770a798e70fe40057",
  digits_strong: "12155783434fd754c08d668ba5e64a2357a06dbf890ef5f8f15cd00e8b52b757",
  yeast_strong: "43bcb10b09ca7629bb03488372e019345e1d123cb330101741db129d7a5c7332",
};
