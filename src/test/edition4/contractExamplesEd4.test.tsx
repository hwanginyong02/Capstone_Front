/**
 * 판 4 서술 요청 계약 예시(판 4 라운드 S3 ⑧) — 앱이 실제로 보내는 판 4 요청 본문을 계약 예시로 고정한다.
 *
 * - 입력: 판 3 새 성적서 하네스(`edition3/newRun/newRun.harness.tsx`, 고치지 않음)의 세 입력 — 이진 bc_strong(RPT-2026-0001),
 *   다중 digits_strong(RPT-2026-0003), 멀티레이블 yeast_strong(RPT-2026-0005). 평가 응답만 새 백엔드 응답
 *   (`evaluateNewKeys/` — 반올림 전 값·해시·엔진 버전)으로 돌린다. 플래그 4, 시각·시간대 고정(newRunEd4.test.tsx 와 같은 방법).
 * - 앱이 `POST /api/narrative/jobs` 로 보낸 본문(= `buildNarrativeRequest` 결과)을 `JSON.stringify(본문, null, 2) + "\n"` 로
 *   찍은 글이 `src/test/contract/fact_sheet_{binary,multiclass,multilabel}_ed4.json` 과 글자까지 같아야 한다.
 *   백엔드 `tests/contract/` 에 같은 바이트 사본이 있고, 백엔드는 그것을 `NarrativeRequest` 로 읽어 판 4 작업 경로를 돌린다.
 * - 다시 뜨려면 `UPDATE_CONTRACT=1 npx vitest run src/test/edition4/contractExamplesEd4.test.tsx` — 이름에 "ed4" 가 든 파일만
 *   쓴다(판 3 예시는 factSheetContract.test.ts 가 sha256 으로 묶는다). 바뀐 이유를 적고 백엔드 사본·두 시험의 sha256 을 함께 고친다.
 * - 옆 저장소 사본과의 바이트 대조는 옆 저장소가 있을 때만(CI 는 저장소 하나만 받는다 — skipIf).
 */
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const ctl = vi.hoisted(() => ({ redirected: 0 }));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const OLD = /([\\/])edition3\1newRun\1inputs\1(\w+)\.evaluate\.json$/;
  const readFileSync = ((path: unknown, ...rest: unknown[]) => {
    const m = typeof path === "string" ? OLD.exec(path) : null;
    if (m) {
      ctl.redirected += 1;
      const sep = m[1];
      path = (path as string).replace(OLD, `${sep}edition4${sep}evaluateNewKeys${sep}${m[2]}.evaluate.json`);
    }
    return (actual.readFileSync as (...a: unknown[]) => unknown)(path, ...rest);
  }) as typeof actual.readFileSync;
  return { ...actual, readFileSync, default: { ...actual, readFileSync } };
});

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { FROZEN_NOW, runNewReport, TAGS, TZ_PINNED, type Tag } from "../edition3/newRun/newRun.harness";

type Json = any;
const CONTRACT_DIR = resolve(__dirname, "../contract");
const BACKEND_CONTRACT_DIR = resolve(__dirname, "../../../../Capstone_Back/tests/contract");

/** 하네스 입력 → 계약 예시 이름. 계약 명세 files.example_binary 의 이름(fact_sheet_binary_ed4.json)을 따른다. */
const EXAMPLE_OF: Record<Tag, string> = {
  bc_strong: "fact_sheet_binary_ed4.json",
  digits_strong: "fact_sheet_multiclass_ed4.json",
  yeast_strong: "fact_sheet_multilabel_ed4.json",
};

/**
 * 예시 세 파일의 sha256(판 4 라운드 S3 ⑧ 에 이 시험으로 뜬 바이트). 백엔드 tests/test_p4_contract_ed4.py 와 같은 값이다.
 * 이진은 S2 ① 의 임시 예시(손으로 고친 것)와 바이트까지 같았다 — 조립과 명세가 같은 글을 냈다는 뜻이다.
 */
const SHA256: Record<string, string> = {
  "fact_sheet_binary_ed4.json": "fe05c374414fd868cf3add5b92e090bae0282e66627231b14bb81aad81879818",
  "fact_sheet_multiclass_ed4.json": "c2e03e71f457088cb3ba784a623fbc1f20219ff2e93a5d26776d5c06d02c6f46",
  "fact_sheet_multilabel_ed4.json": "403a8085f56ee5fab36aff107220c5393bf97e543485c745bec3ef3cdd1afc5a",
};

const UPDATE = process.env.UPDATE_CONTRACT === "1";
/** factSheetContract.test.ts 와 같은 가드 — 이름에 "ed4" 가 든 예시만 쓴다. */
const updatableExample = (name: string) => name.includes("ed4");

const requests = new Map<Tag, string>();
const originalTz = process.env.TZ;

beforeAll(async () => {
  process.env.TZ = TZ_PINNED;
  for (const tag of TAGS) {
    const before = ctl.redirected;
    vi.stubEnv("VITE_REPORT_EDITION", "4");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FROZEN_NOW());
    try {
      const c = await runNewReport(tag);
      // 새 백엔드 응답으로 돌렸는지(돌리지 않으면 판 4 칸이 옛 값으로 채워진다).
      expect(ctl.redirected - before).toBeGreaterThan(0);
      requests.set(tag, c.request);
    } finally {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    }
  }
}, 60_000);

afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

const exampleText = (tag: Tag) => `${JSON.stringify(JSON.parse(requests.get(tag)!), null, 2)}\n`;

describe.each(TAGS)("판 4 계약 예시 = 앱이 보낸 판 4 서술 요청(%s)", (tag: Tag) => {
  const name = EXAMPLE_OF[tag];

  it("보낸 본문은 판 4 요청이다(report_edition 4, 판 4 키가 실림)", () => {
    const body = JSON.parse(requests.get(tag)!);
    expect(body.report_edition).toBe(4);
    expect(body.fact_sheet.metrics.length).toBeGreaterThan(0);
    expect(body.fact_sheet.metrics.every((m: Json) => "ci_low_text" in m && "ci_high_text" in m)).toBe(true);
    expect((body.fact_sheet.facts.fixed_sentences as Json[]).map((s) => s.id)).not.toContain("18");
  });

  it("계약 예시 파일과 글자까지 같다", () => {
    const path = resolve(CONTRACT_DIR, name);
    const text = exampleText(tag);
    if (UPDATE && updatableExample(name)) writeFileSync(path, text);
    expect(text).toBe(readFileSync(path, "utf8"));
  });
});

describe("판 4 계약 예시 고정", () => {
  it("세 예시는 박아 둔 sha256 과 바이트까지 같다", () => {
    const actual = Object.fromEntries(
      Object.values(EXAMPLE_OF).map((name) => [name, createHash("sha256").update(readFileSync(resolve(CONTRACT_DIR, name))).digest("hex")]),
    );
    expect(actual).toEqual(SHA256);
  });

  it("UPDATE_CONTRACT 가 쓸 수 있는 이름이다(판 3 예시 이름은 아니다)", () => {
    for (const name of Object.values(EXAMPLE_OF)) expect([name, updatableExample(name)]).toEqual([name, true]);
    expect(updatableExample("fact_sheet_binary.json")).toBe(false);
  });

  it.skipIf(!existsSync(BACKEND_CONTRACT_DIR))("백엔드 tests/contract 사본과 바이트가 같다", () => {
    for (const name of Object.values(EXAMPLE_OF)) {
      const theirs = readFileSync(resolve(BACKEND_CONTRACT_DIR, name)) as unknown as Buffer;
      expect([name, theirs.equals(readFileSync(resolve(CONTRACT_DIR, name)) as unknown as Buffer)]).toEqual([name, true]);
    }
  });
});
