/**
 * 판 4 렌더 시험 데이터(정적 픽스처) 생성기 — 판 4 라운드 S4·S5 1단계.
 *
 * 렌더러 시험(S4·S5)이 그릴 판 4 저장 데이터를 앱이 걷는 길 그대로 만들어 `fixtures/` 에 정적 JSON 으로 둔다.
 * - 방법은 `edition4/newRunEd4.test.tsx` 와 같다: 판 3 하네스 `edition3/newRun/newRun.harness.tsx` 의 `runNewReport` 를 **고치지
 *   않고**, `node:fs` 를 돌려 평가 응답은 `edition4/evaluateNewKeys/<tag>.evaluate.json`(새 백엔드 응답), 서술 작업 응답은
 *   `render/inputs/<tag>.jobs.ed4.json`(판 4 출처 글·예시본 서술 글) 으로 읽게 한다. 플래그 4, Date 고정 `FROZEN_NOW`, TZ Asia/Seoul.
 * - 만드는 파일(`JSON.stringify(x, null, 2) + "\n"`, 키는 하네스 `stableJson` 처럼 정렬):
 *   - `<tag>.pending.json` — 서술 대기 중 저장된 1단계 데이터(stage1). `<tag>.pending.narrative.json` — 그때의 run 서술 상태.
 *   - `<tag>.final.json` — 서술 완료·미발급.
 *   - `<tag>.issued.json` — 발급본: `final` 에 실제 `applyIssuance` 로 발급 기록을 덧입힌 것. 발급 기록은 같은 입력의 판 3 실제
 *     발급본 기록(`archive/issued/RPT-2026-000{1,3,5}.issuance.json`) — bc_strong 은 RPT-2026-0001·2026-10-22 18:46(예시본과 같음).
 *   - `bc_strong.failed.json`·`bc_strong.failed.narrative.json` — 서술 실패: 대기 중 run 을 `/report/:id` 로 열고 작업 조회가
 *     실패를 알리게 해, 앱(useReportData)이 저장한 그대로.
 * - 평소에는 다시 만든 글이 파일과 `toBe` 로 같은지만 본다. `UPDATE_ED4_RENDER=1` 일 때만 파일을 쓴다(`-u` 스냅샷이 아니다).
 *   생성 코드(src 비시험)는 렌더러 단계가 바꾸지 않으므로 늘 같아야 한다 — 다르면 생성값이 바뀐 것이다(이유를 적고 다시 뜬다).
 */
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const ctl = vi.hoisted(() => ({ evaluate: 0, jobs: 0 }));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const EVAL = /([\\/])edition3\1newRun\1inputs\1(\w+)\.evaluate\.json$/;
  const JOBS = /([\\/])edition3\1newRun\1inputs\1(\w+)\.jobs\.json$/;
  const readFileSync = ((path: unknown, ...rest: unknown[]) => {
    if (typeof path === "string") {
      const e = EVAL.exec(path);
      const j = JOBS.exec(path);
      if (e) {
        ctl.evaluate += 1;
        path = path.replace(EVAL, `${e[1]}edition4${e[1]}evaluateNewKeys${e[1]}${e[2]}.evaluate.json`);
      } else if (j) {
        ctl.jobs += 1;
        path = path.replace(JOBS, `${j[1]}edition4${j[1]}render${j[1]}inputs${j[1]}${j[2]}.jobs.ed4.json`);
      }
    }
    return (actual.readFileSync as (...a: unknown[]) => unknown)(path, ...rest);
  }) as typeof actual.readFileSync;
  return { ...actual, readFileSync, default: { ...actual, readFileSync } };
});

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { FROZEN_NOW, runNewReport, stableJson, TAGS, TZ_PINNED, type Tag } from "../../edition3/newRun/newRun.harness";
import { fastPolling, resetAll, storedRun } from "../../../hooks/reportJob.harness";
import { applyIssuance, type IssuanceResult } from "../../../lib/report/issuanceApi";
import { Report } from "../../../pages/report/Report";
import type { FinalReportData } from "../../../types/finalReport.types";
import type { RunNarrativeState, WorkspaceEvaluationRun } from "../../../types/workspace.types";
import { useWorkspaceStore } from "../../../utils/stores/useWorkspaceStore";
import { ED4_FIXTURE_DIR, ED4_ISSUANCE_OF, ed4FixtureName, type Ed4FixtureKind } from "./ed4Fixtures";

type Json = any;
const UPDATE = process.env.UPDATE_ED4_RENDER === "1";
const INPUT_DIR = resolve(__dirname, "inputs");

/** 키 정렬 + 두 칸 들여쓰기 + 끝 줄바꿈 하나(하네스 `stableJson` 의 정렬을 그대로 쓰고 들여쓰기만 2). */
const ed4Json = (value: unknown) => `${JSON.stringify(JSON.parse(stableJson(value)), null, 2)}\n`;

const produced = new Map<string, string>();

interface Capture {
  pending: Json;
  final: Json;
  storedInput: Json;
}

async function capture(tag: Tag): Promise<Capture> {
  const before = { ...ctl };
  vi.stubEnv("VITE_REPORT_EDITION", "4");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FROZEN_NOW());
  try {
    const c = await runNewReport(tag);
    // 두 응답 모두 판 4 쪽 입력으로 돌렸는지(돌리지 않으면 판 3 출처 글·센티널 글이 들어간다).
    expect(ctl.evaluate - before.evaluate).toBeGreaterThan(0);
    expect(ctl.jobs - before.jobs).toBeGreaterThan(0);
    return { pending: JSON.parse(c.stage1), final: JSON.parse(c.final), storedInput: c.storedInput };
  } finally {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  }
}

const RUN_ID = "run-ed4-render-failed";

/** 대기 중 run 을 `/report/:id` 로 열고 작업 조회가 실패를 알리게 한다 — 앱이 실패를 저장한 run 을 돌려준다. */
async function captureFailed(pending: FinalReportData, narrative: RunNarrativeState): Promise<WorkspaceEvaluationRun> {
  const restorePolling = fastPolling();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FROZEN_NOW());
  const jobs = JSON.parse(readFileSync(resolve(INPUT_DIR, "bc_strong.jobs.ed4.json"), "utf8"));
  const seen: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      seen.push(`${method} ${url}`);
      if (method === "GET" && /\/api\/narrative\/jobs\/[^/]+$/.test(url)) {
        const body = {
          job_id: jobs.created.job_id,
          status: "failed",
          stage: "failed",
          failure: "error",
          benchmark_refs: jobs.created.benchmark_refs,
          result: null,
        };
        return { ok: true, status: 200, json: async () => structuredClone(body) } as unknown as Response;
      }
      throw new Error(`실패 픽스처: 모르는 요청 ${method} ${url}`);
    }),
  );
  try {
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: "ws-1",
      evaluationRuns: [
        {
          id: RUN_ID,
          workspaceId: "ws-1",
          modelName: "BreastScreen-LR",
          versionName: pending.evalScope.version,
          reportId: pending.meta.reportId,
          workflowSnapshot: undefined as unknown as WorkspaceEvaluationRun["workflowSnapshot"],
          reportData: structuredClone(pending),
          createdAt: FROZEN_NOW().toISOString(),
          narrative: structuredClone(narrative),
        },
      ],
    });
    const view = render(
      <MemoryRouter initialEntries={[`/report/${RUN_ID}`]}>
        <Routes>
          <Route path="/report/:id" element={<Report />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(storedRun(RUN_ID)?.narrative?.status).toBe("failed"), { timeout: 10_000 });
    view.unmount();
    expect(seen.every((s) => s.startsWith("GET "))).toBe(true);
    return structuredClone(storedRun(RUN_ID)!);
  } finally {
    restorePolling();
    resetAll();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
}

const originalTz = process.env.TZ;
beforeAll(async () => {
  process.env.TZ = TZ_PINNED;
  for (const tag of TAGS) {
    const c = await capture(tag);
    const jobs = JSON.parse(readFileSync(resolve(INPUT_DIR, `${tag}.jobs.ed4.json`), "utf8"));
    // 대기 중 run 의 서술 상태 — 앱(useReportData applyCreated)이 작업 생성 직후 저장하는 모양 그대로(시각은 고정 시각).
    const pendingNarrative: RunNarrativeState = {
      status: "pending",
      jobId: jobs.created.job_id,
      input: c.storedInput,
      startedAt: FROZEN_NOW().toISOString(),
    };
    const issuance = JSON.parse(readFileSync(ED4_ISSUANCE_OF[tag], "utf8")) as IssuanceResult;
    produced.set(ed4FixtureName(tag, "pending"), ed4Json(c.pending));
    produced.set(ed4FixtureName(tag, "pending.narrative"), ed4Json(pendingNarrative));
    produced.set(ed4FixtureName(tag, "final"), ed4Json(c.final));
    produced.set(ed4FixtureName(tag, "issued"), ed4Json(applyIssuance(structuredClone(c.final), issuance)));
    if (tag === "bc_strong") {
      const failedRun = await captureFailed(c.pending, pendingNarrative);
      produced.set(ed4FixtureName(tag, "failed"), ed4Json(failedRun.reportData));
      produced.set(ed4FixtureName(tag, "failed.narrative"), ed4Json(failedRun.narrative));
    }
  }
  if (UPDATE) for (const [name, text] of produced) writeFileSync(resolve(ED4_FIXTURE_DIR, name), text);
}, 90_000);
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

const KINDS: Ed4FixtureKind[] = ["pending", "pending.narrative", "final", "issued"];
const EXPECTED = [
  ...TAGS.flatMap((tag) => KINDS.map((kind) => ed4FixtureName(tag, kind))),
  ed4FixtureName("bc_strong", "failed"),
  ed4FixtureName("bc_strong", "failed.narrative"),
];

const fixture = (name: string): Json => JSON.parse(readFileSync(resolve(ED4_FIXTURE_DIR, name), "utf8"));

describe("판 4 렌더 픽스처 = 지금 코드가 다시 만든 글(바이트)", () => {
  it("만든 파일 목록이 정해진 목록과 같다", () => {
    expect([...produced.keys()].sort()).toEqual([...EXPECTED].sort());
  });

  it.each(EXPECTED)("%s", (name) => {
    const path = resolve(ED4_FIXTURE_DIR, name);
    expect(existsSync(path), `${name} 이 없다 — UPDATE_ED4_RENDER=1 로 처음 뜬다`).toBe(true);
    expect(produced.get(name)).toBe(readFileSync(path, "utf8"));
  });
});

describe("판 4 렌더 픽스처가 겨눈 갈래를 담고 있다", () => {
  it("모두 판 4 run 이다(판 표시·제목)", () => {
    for (const name of EXPECTED.filter((n) => !n.includes("narrative"))) {
      expect(fixture(name).contentSchema, name).toBe(4);
      expect(fixture(name).meta.title, name).toBe("기계학습 분류 성능 시험성적서");
    }
  });

  it("대기·실패는 서술 전(isEvaluated false, 서술 칸 비어 있음), 실패 데이터 = 대기 데이터(앱은 서술 상태만 바꾼다)", () => {
    for (const tag of TAGS) {
      const p = fixture(ed4FixtureName(tag, "pending"));
      expect(p.isEvaluated).toBe(false);
      expect(p.narrativeSections).toBeUndefined();
      expect(fixture(ed4FixtureName(tag, "pending.narrative")).status).toBe("pending");
    }
    expect(fixture(ed4FixtureName("bc_strong", "failed"))).toEqual(fixture(ed4FixtureName("bc_strong", "pending")));
    expect(fixture(ed4FixtureName("bc_strong", "failed.narrative"))).toMatchObject({ status: "failed", failure: "error" });
  });

  it("서술 완료 데이터의 출처 글은 판 4 글(SOURCE_NOTE_ED4), 판 3 '사내 합의' 글이 아니다", () => {
    for (const tag of TAGS) {
      const refs = fixture(ed4FixtureName(tag, "final")).conclusion.benchmarkRefs;
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) {
        expect(ref.sourceNote).toBe("내부 참조 기준치 v1 (공개 벤치마크 평균이 아닌 자체 설정 기준이며, 도메인별로 상이할 수 있음)");
      }
    }
  });

  it("bc_strong 서술 칸 = 예시본 5~6절 문단 글자 그대로(8.2→5.1 첫 문단 … 9 → 6.1·6.2 문단)", () => {
    const md = readFileSync(resolve(__dirname, "../rpt0001/example.md"), "utf8").split("\n");
    const after = (heading: string) => {
      let i = md.indexOf(heading) + 1;
      while (md[i] === "") i += 1;
      return md[i];
    };
    const f = fixture(ed4FixtureName("bc_strong", "final"));
    expect(f.conclusion.narrative).toBe(after("### 5.1 판정과 불확실성"));
    expect(f.interpretation.confusionAnalysis).toBe(after("### 5.2 오분류"));
    expect(f.interpretation.distributionAnalysis).toBe(after("### 5.3 데이터 분포"));
    expect(f.conclusion.benchmark).toBe(after("### 5.4 참조 범위"));
    expect(f.conclusion.risks).toBe(after("### 5.5 운영 위험"));
    expect(f.interpretation.additionalObservations).toBe(after("### 5.6 추가 관찰"));
    expect(f.recommendationNarrative).toEqual({ dataQuality: after("### 6.1 데이터"), modelOps: after("### 6.2 모델과 운영") });
    // 5.1 둘째 문단은 앱이 찍는 고정 문구 11a(서술 글에 넣지 않음).
    expect(f.sourceRelationSentence).toBe(md[md.indexOf("### 5.1 판정과 불확실성") + 4]);
    expect(f.recommendations.map((r: Json) => [r.problemId, r.priority])).toEqual([
      ["P1", "MEDIUM"],
      ["P1", "MEDIUM"],
      ["P2", "LOW"],
    ]);
  });

  it("bc_strong 발급본 = RPT-2026-0001, 2026-10-22 18:46(예시본 표지)", () => {
    const i = fixture(ed4FixtureName("bc_strong", "issued"));
    expect(i.meta.reportId).toBe("RPT-2026-0001");
    expect(i.meta.issuedAt).toBe("2026-10-22 18:46");
    expect(i.signature.history).toEqual([{ version: "v1.0", issuedAt: "2026-10-22", note: "최초 발급" }]);
    expect(fixture(ed4FixtureName("digits_strong", "issued")).meta.reportId).toBe("RPT-2026-0003");
    expect(fixture(ed4FixtureName("yeast_strong", "issued")).meta.reportId).toBe("RPT-2026-0005");
  });
});
