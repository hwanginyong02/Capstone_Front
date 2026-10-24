/**
 * 판 4 새 성적서를 처음부터 만든다(판 4 라운드 S3 ⑥⑦) — RPT-2026-0001 입력(bc_strong)과 다중·멀티 입력을 앱이 걷는 길 그대로
 * (판 3 하네스 `edition3/newRun/newRun.harness.tsx`, 시각 고정) 플래그 4 로 만들어, 저장 데이터와 실제 서술 요청 본문의 판 4 칸을
 * 정확값으로 본다.
 *
 * - 평가 응답은 새 백엔드 응답(`evaluateNewKeys/` — 반올림 전 값·해시·엔진 버전 포함). 하네스가 읽는 평가 응답만 돌린다(`node:fs`).
 * - 기대값은 예시본(RPT-2026-0001 판 4 모양)과 공통 계약 `fact_sheet_contract_ed4.json` 의 bc_strong 값을 옮겨 적은 것이다.
 * - "판 4 갈래가 다른 칸을 건드리지 않는다": 같은 입력의 판 3 정답(`edition3/newRun/golden`, 고치지 않음)과 견줘 달라진 자리가
 *   정해진 목록과 같다. 요청은 판 3 요청 키 + 계약의 판 4 전용 키뿐이고, 값이 바뀐 자리는 계약이 판 4 표기·뜻으로 적은 칸뿐이다.
 * - 배선: 앱 훅이 서술 요청을 `buildNarrativeRequest` 하나로 만들고(한 번, 판 4 바탕), 그 결과가 그대로 보내지고 저장된다.
 */
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const ctl = vi.hoisted(() => ({ redirected: 0, requestCalls: [] as Array<{ contentSchema: unknown; result: unknown }> }));

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

vi.mock("../../lib/report/narrativeRequest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/report/narrativeRequest")>();
  return {
    ...actual,
    buildNarrativeRequest: ((...args: Parameters<typeof actual.buildNarrativeRequest>) => {
      const result = actual.buildNarrativeRequest(...args);
      ctl.requestCalls.push({ contentSchema: args[0].contentSchema, result });
      return result;
    }) as typeof actual.buildNarrativeRequest,
  };
});

import { readFileSync } from "node:fs";
import { FROZEN_NOW, GOLDEN_DIR, goldenNames, runNewReport, TAGS, TZ_PINNED, type Tag } from "../edition3/newRun/newRun.harness";

type Json = any;
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const CONTRACT_ED4: Json = readJson(resolve(__dirname, "../contract/fact_sheet_contract_ed4.json"));
/** 원본 CSV — 저장소 안 사본(RPT-2026-0001 에 올린 파일 바이트 그대로, S6 ② 에서 옮김). */
const BC_CSV = resolve(__dirname, "rpt0001/bc_strong.csv");

interface Ed4Capture {
  stage1: Json;
  request: Json;
  requestText: string;
  storedInput: Json;
  calls: typeof ctl.requestCalls;
}

const captures = new Map<Tag, Ed4Capture>();

async function captureEd4(tag: Tag): Promise<Ed4Capture> {
  const redirected = ctl.redirected;
  ctl.requestCalls = [];
  vi.stubEnv("VITE_REPORT_EDITION", "4");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FROZEN_NOW());
  try {
    const c = await runNewReport(tag);
    expect(ctl.redirected - redirected).toBeGreaterThan(0);
    return {
      stage1: JSON.parse(c.stage1),
      request: JSON.parse(c.request),
      requestText: c.request,
      storedInput: c.storedInput,
      calls: ctl.requestCalls,
    };
  } finally {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  }
}

const originalTz = process.env.TZ;
beforeAll(async () => {
  process.env.TZ = TZ_PINNED;
  for (const tag of TAGS) captures.set(tag, await captureEd4(tag));
}, 60_000);
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

const golden = (tag: Tag, kind: "stage1" | "request") => readJson(resolve(GOLDEN_DIR, goldenNames(tag)[kind]));

/** 두 값이 다른 자리(목록 칸은 [] 로 묶음, 길이가 다르면 목록 자리). */
function changedPaths(a: unknown, b: unknown, path = ""): Set<string> {
  const out = new Set<string>();
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const x = a as Record<string, unknown>;
    const y = b as Record<string, unknown>;
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (!(k in x) || !(k in y)) out.add(`${path}.${k}`);
      else for (const p of changedPaths(x[k], y[k], `${path}.${k}`)) out.add(p);
    }
  } else if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    a.forEach((v, i) => changedPaths(v, b[i], `${path}[]`).forEach((p) => out.add(p)));
  } else if (JSON.stringify(a) !== JSON.stringify(b)) {
    out.add(path);
  }
  return out;
}

/** 값에 있는 모든 키 자리(목록 칸은 []). */
function keyPaths(v: unknown, path = ""): Set<string> {
  const out = new Set<string>();
  if (Array.isArray(v)) v.forEach((x) => keyPaths(x, `${path}[]`).forEach((p) => out.add(p)));
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      out.add(`${path}.${k}`);
      keyPaths(x, `${path}.${k}`).forEach((p) => out.add(p));
    }
  }
  return out;
}

const sorted = (s: Set<string>) => [...s].sort();

describe("RPT-2026-0001 입력(bc_strong) 판 4 run — 저장 데이터의 판 4 생성값", () => {
  const stage1 = () => captures.get("bc_strong")!.stage1;

  it("판 4 로 만들어졌다 — 판 표시·제목", () => {
    expect(stage1().contentSchema).toBe(4);
    expect(stage1().meta.title).toBe("기계학습 분류 성능 시험성적서");
  });

  it("2.2 파일 해시(소문자 64자)·크기, 3.5 평가 엔진 버전(모델 버전이 아님)", () => {
    expect(stage1().datasetInfo.sourceFile).toEqual({
      sha256: "4ead9f2ccc8da32c0c3148f02ea6ff4e030c156d9873eeb99883df73f3a49f9d",
      sizeBytes: 3727,
    });
    expect(stage1().datasetInfo.sourceFile.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(stage1().evalEnv.engineVersion).toBe("1.0.0");
    expect(stage1().evalScope.version).toBe("v2.1");
  });

  it("해시·크기 = 원본 CSV 에서 직접 계산한 값(저장소 안 rpt0001/bc_strong.csv)", () => {
    const bytes = readFileSync(BC_CSV) as unknown as Buffer;
    expect(stage1().datasetInfo.sourceFile).toEqual({
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sizeBytes: bytes.length,
    });
  });

  it("3.2 산정식 — 예시본 글자(M1·M9·M23 은 판 3 글과 같다)", () => {
    expect(Object.fromEntries((stage1().metricFormulas as Json[]).map((f) => [f.metricId, f.formula]))).toEqual({
      M1: "(TP + TN) / Total",
      M2: "이진: TP/(TP+FP) · 다중·멀티: 클래스별 TP/(TP+FP)의 매크로 평균",
      M3: "이진: TP/(TP+FN) · 다중·멀티: 클래스별 TP/(TP+FN)의 매크로 평균",
      M4: "이진: 2PR/(P+R) · 다중·멀티: 클래스별 F1의 매크로 평균(매크로 정밀도와 매크로 재현율의 조화평균이 아님)",
      M9: "Area under ROC Curve",
      M10: "평균 정밀도(Average Precision): Σ (Rₙ − Rₙ₋₁) · Pₙ",
      M19: "−(1/N) Σ [y·log(p) + (1−y)·log(1−p)]",
      M23: "max(class count) / min(class count)",
    });
  });

  it("표지 요약 종합 판정·핵심 지표 줄과 재료 점검의 보고 항목·주요 제약 줄 — 예시본 4줄", () => {
    expect([...stage1().edition4Values.coverResultRows, ...stage1().materialCheck.printed.coverRows]).toEqual([
      { label: "종합 판정", value: "최종 합격 (판정 대상 지표 5개 중 5개 충족, 4.2)" },
      { label: "핵심 지표", value: "Recall 0.984 (합격 기준 ≥ 0.970, 충족, 판정 여유 작음, 4.3)" },
      { label: "보고 항목", value: "TS 4213 보고 항목 11개 중 10개 제공 (빠진 항목: 추론 효율성(지연시간), 1.3)" },
      { label: "주요 제약", value: "평가 데이터가 학습 데이터와 같은 출처 (5.1)" },
    ]);
  });

  it("4.2 종합 판정 표·근거 문장", () => {
    expect(stage1().edition4Values.verdict).toEqual({
      verdict: "PASS",
      label: "최종 합격",
      judgedCount: 5,
      passedCount: 5,
      countText: "5개 중 5개",
      basis: "핵심 지표 Recall(M3)과 그 밖의 판정 대상 지표가 모두 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.",
    });
  });

  it("4.4 임계값 조정 여지 — 임계값 0.6166, R·P 0.984375 → 0.984, 상승폭 0.008", () => {
    expect(stage1().edition4Values.thresholdTable).toEqual({
      current: { kind: "threshold", thresholdText: "0.5" },
      bestThresholdText: "0.6166",
      rows: [
        { metricId: "M4", name: "F1 Score", current: "0.977", best: "0.984" },
        { metricId: "M3", name: "Recall", current: "0.984", best: "0.984" },
        { metricId: "M2", name: "Precision", current: "0.969", best: "0.984" },
      ],
      gainText: "0.008",
    });
  });

  it("4.5 데이터 분포 — 분포·불균형 비율(M23 원값 1.671875 → 1.672) 문장과 학습·평가 비율 표", () => {
    expect(stage1().edition4Values.distribution).toEqual({
      distributionSentence: "평가 데이터셋은 총 171건이며, 클래스(레이블)별 분포는 benign 107건(62.6%), malignant 64건(37.4%)이다.",
      imbalanceRatioText: "1.672",
      imbalanceSentence: "클래스 불균형 비율(Imbalance Ratio)은 1.672이다.",
      training: {
        status: "compared",
        rows: [
          {
            label: "benign",
            trainingRatio: 0.628140704,
            evaluationRatio: 0.625730994,
            evaluationMinusTraining: -0.00240971,
            trainingText: "62.8%",
            evaluationText: "62.6%",
            differenceText: "−0.2%p",
          },
          {
            label: "malignant",
            trainingRatio: 0.371859296,
            evaluationRatio: 0.374269006,
            evaluationMinusTraining: 0.00240971,
            trainingText: "37.2%",
            evaluationText: "37.4%",
            differenceText: "+0.2%p",
          },
        ],
      },
    });
  });

  it("판정 여유·반올림 전 경계는 S3 ③ 대로, 고정 문구 18(3% 근소 문장)은 저장하지 않는다", () => {
    const m3 = (stage1().kpiResults as Json[]).find((r) => r.metricId === "M3");
    expect([m3.judgmentMargin, m3.ciRaw]).toEqual(["small", { low: 0.9166589839990573, high: 0.9972364580766624 }]);
    expect(stage1()).not.toHaveProperty("nearTargetNote");
    expect(golden("bc_strong", "stage1")).toHaveProperty("nearTargetNote");
  });
});

describe("RPT-2026-0001 입력(bc_strong) 판 4 run — 실제 서술 요청 본문의 판 4 칸(계약 bc_strong 값)", () => {
  const req = () => captures.get("bc_strong")!.request;
  const metric = (id: string) => (req().fact_sheet.metrics as Json[]).find((m) => m.metric_id === id);

  it("판 신호 report_edition 4 가 최상위 셋째 키", () => {
    expect(Object.keys(req())).toEqual(["task_type", "report_purpose", "report_edition", "fact_sheet", "client_inputs"]);
    expect(req().report_edition).toBe(4);
  });

  it("지표 줄 — 경계 표기·판정 여유(near_target)·포함·마진 표기", () => {
    const rows = (req().fact_sheet.metrics as Json[]).map((m) => [
      m.metric_id,
      m.ci_low_text,
      m.ci_high_text,
      m.near_target,
      m.ci_contains_target,
      m.margin_text,
      m.value_text,
    ]);
    expect(rows).toEqual([
      ["M1", "0.9497", "0.994", true, true, "0.032", "0.982"],
      ["M2", null, null, false, null, null, null],
      ["M3", "0.917", "0.997", true, true, "0.014", "0.984"],
      ["M4", "0.946", "1.000", true, true, "0.027", "0.977"],
      ["M9", "0.997", "1.000", false, false, "0.019", "0.999"],
      ["M10", null, null, false, null, null, null],
      ["M19", "0.033", "0.079", false, false, "0.047", "0.053"],
      ["M23", null, null, false, null, null, null],
    ]);
    // 불변식 — 구간이 있으면 near_target == ci_contains_target(판정 여유 한 곳).
    const withCi = (req().fact_sheet.metrics as Json[]).filter((m) => m.ci_contains_target !== null);
    expect(withCi.length).toBe(5);
    for (const m of withCi) expect([m.metric_id, m.near_target]).toEqual([m.metric_id, m.ci_contains_target]);
  });

  it("f1_threshold_gain — 판 3 칸 + 판 4 칸(엔진 임계값 표기, 셋째 자리 R·P·F1, 위험 쪽 Recall)", () => {
    expect(req().fact_sheet.f1_threshold_gain).toEqual({
      max_f1: 0.9844,
      current_f1: 0.9767,
      gain: 0.0076,
      best_threshold: 0.6166,
      notable: false,
      gain_text: "0.008",
      best_threshold_text: "0.6166",
      max_f1_text: "0.984",
      current_f1_text: "0.977",
      best_recall_text: "0.984",
      best_precision_text: "0.984",
      current_recall_text: "0.984",
      current_precision_text: "0.969",
      risk_side: { side: "fn", metric_id: "M3", display_name: "Recall", meets_target_now: true, meets_target_at_best: true },
    });
    // 같은 값 두 자리 — 지금 Recall·F1 은 4.3 의 value_text 와 같은 글자.
    expect(req().fact_sheet.f1_threshold_gain.current_recall_text).toBe(metric("M3").value_text);
    expect(req().fact_sheet.f1_threshold_gain.current_f1_text).toBe(metric("M4").value_text);
  });

  it("불균형 영향 표시값 — 판 4 표기(1.672·0.001·0.009·0.982·0.981·0.986·0.977), 숫자 칸은 엔진 값 그대로", () => {
    expect(req().fact_sheet.imbalance_effect.display).toEqual({
      imbalance_ratio: "1.672",
      accuracy_minus_macro_f1: "0.001",
      majority_minus_minority_f1: "0.009",
      accuracy: "0.982",
      macro_f1: "0.981",
      majority_f1: "0.986",
      minority_f1: "0.977",
    });
    expect(req().fact_sheet.imbalance_effect.imbalance_ratio).toBe(1.6719);
  });

  it("facts — 판 4 표기와 분포 차의 판 4 전용 칸(평가 − 학습)", () => {
    const f = req().fact_sheet.facts;
    expect([f.weakest_class.share_text, f.weakest_class.gap_text]).toEqual(["0.374", "0.005"]);
    // 최약 클래스 F1 글자(D2) — 양성 클래스 malignant F1 = F1 Score(M4) 원값이라 M4 value_text 그대로. 키는 f1 바로 뒤.
    const m4 = (req().fact_sheet.metrics as Json[]).find((m) => m.metric_id === "M4");
    expect(f.weakest_class.f1).toBe(m4.value);
    expect([f.weakest_class.f1_text, m4.value_text]).toEqual(["0.977", "0.977"]);
    expect(Object.keys(f.weakest_class).slice(0, 3)).toEqual(["label", "f1", "f1_text"]);
    expect(f.declared_risk_errors.share_text).toBe("0.333");
    expect(f.precision_recall_gap.difference_text).toBe("-0.015");
    expect((f.distribution_shift as Json[]).map((r) => [r.label, r.difference_text, r.evaluation_minus_training_text])).toEqual([
      ["benign", "0.002", "-0.002"],
      ["malignant", "-0.002", "0.002"],
    ]);
  });

  it("고정 문장 — 9번은 판 4 합니다체, 18번 없음, 칸 이름 그대로", () => {
    expect((req().fact_sheet.facts.fixed_sentences as Json[]).map((s) => [s.id, s.section])).toEqual([
      ["9", "7.1"],
      ["17", "7.1"],
      ["16", "8.1"],
      ["11a", "8.2"],
    ]);
    expect(req().fact_sheet.facts.fixed_sentences[0].text).toBe(
      "본 평가의 예측값은 제출된 확률값에 결정 임계값 0.5를 적용하여 산출하였습니다.",
    );
    // 판 3 정답 요청에는 18번이 있었다(판 3 은 3% 근소 문장을 싣는다).
    expect((golden("bc_strong", "request").fact_sheet.facts.fixed_sentences as Json[]).map((s) => s.id)).toContain("18");
  });

  it("문제 목록 — P1 핵심 지표 근소 합격(Recall), P2 같은 출처", () => {
    expect((req().fact_sheet.problems as Json[]).map((p) => [p.id, p.kind, p.priority, p.title])).toEqual([
      ["P1", "core_near_target", "MEDIUM", "핵심 지표 근소 합격 (Recall)"],
      ["P2", "same_source", "LOW", "평가 데이터가 학습과 같은 출처"],
    ]);
  });

  it("저장한 다시 만들기 요청 = 보낸 본문, 저장 데이터의 facts = 보낸 facts", () => {
    const c = captures.get("bc_strong")!;
    expect(c.storedInput).toEqual(c.request);
    expect(c.stage1.narrativeFacts).toEqual(c.request.fact_sheet.facts);
  });
});

/** 계약의 판 4 전용 키 자리(목록은 []) — 요청에 새로 생겨도 되는 키. */
const ED4_ONLY = new Set<string>([
  ...(CONTRACT_ED4.edition4_only_keys as Json[]).map((k) => `.${k.path}`),
  ...["side", "metric_id", "display_name", "meets_target_now", "meets_target_at_best"].map(
    (k) => `.fact_sheet.f1_threshold_gain.risk_side.${k}`,
  ),
  // 판 4 에만 나오는 문제 종류 same_source 의 근거 칸(계약 problems.same_source.shape).
  `.fact_sheet.problems[].evidence.${Object.keys(CONTRACT_ED4.problems.same_source.shape.evidence)[0]}`,
]);

/** 값이 판 3 과 달라도 되는 자리 — 판 4 전용 키, 계약의 판 4 표기·뜻 칸(그 아래 자리 포함). */
const ED4_CHANGEABLE = [
  ...ED4_ONLY,
  ...Object.keys(CONTRACT_ED4.edition4_notation).filter((k) => !k.startsWith("$")).map((k) => `.${k}`),
  ...Object.keys(CONTRACT_ED4.edition4_meaning).map((k) => `.${k}`),
];

/** 문제 칸(제목·종류)은 판 4 에서 목록 자체가 달라질 수 있다(같은 출처 문제가 더해짐) — 목록 자리로 본다. */
const problemsList = (p: string) => p.replace(/\.fact_sheet\.problems\[\]\..*$/, ".fact_sheet.problems");

function changeable(path: string): boolean {
  return ED4_CHANGEABLE.some((allowed) => {
    const a = problemsList(allowed);
    return path === a || path.startsWith(`${a}.`) || path.startsWith(`${a}[]`);
  });
}

describe.each(TAGS)("판 4 run 과 같은 입력의 판 3 정답 — 달라진 곳은 정해진 자리뿐(%s)", (tag: Tag) => {
  it("서술 요청: 새 키 = 판 3 요청 키 + 계약 판 4 전용 키뿐, 빠진 키 없음", () => {
    const four = keyPaths(captures.get(tag)!.request);
    const three = keyPaths(golden(tag, "request"));
    const added = [...four].filter((p) => !three.has(p));
    const missing = [...three].filter((p) => !four.has(p));
    expect(missing).toEqual([]);
    expect(added).toContain(".report_edition");
    expect(added).toContain(".fact_sheet.metrics[].ci_low_text");
    expect(added.filter((p) => !ED4_ONLY.has(p))).toEqual([]);
  });

  it("서술 요청: 값이 바뀐 자리는 계약이 판 4 표기·뜻으로 적은 칸뿐", () => {
    const changed = sorted(changedPaths(golden(tag, "request"), captures.get(tag)!.request));
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.filter((p) => !changeable(p))).toEqual([]);
  });

  it("요청을 만든 곳은 buildNarrativeRequest 한 번(판 4 바탕), 그 결과가 그대로 보내졌다", () => {
    const c = captures.get(tag)!;
    expect(c.calls.length).toBe(1);
    expect(c.calls[0].contentSchema).toBe(4);
    expect(c.calls[0].result).toEqual(c.request);
    expect(c.requestText).toBe(JSON.stringify(c.calls[0].result));
  });
});

/** 저장 데이터에서 판 4 가 바꾸는 자리(계획 2.1·4절 — 판 4 생성값, 판에 따라 글이 달라지는 저장 칸). */
const STAGE1_CHANGES: Record<Tag, string[]> = {
  bc_strong: [
    ".contentSchema",
    ".datasetInfo.sourceFile",
    ".edition4Values",
    ".evalEnv.engineVersion",
    ".kpiResults[].ciRaw",
    ".kpiResults[].judgmentMargin",
    ".materialCheck.printed.cover",
    ".materialCheck.printed.coverRows",
    ".materialCheck.printed.notProvided",
    ".meta.title",
    ".metricFormulas[].formula",
    ".narrativeFacts.declared_risk_errors.share_text",
    ".narrativeFacts.distribution_shift[].difference_text",
    ".narrativeFacts.distribution_shift[].evaluation_minus_training_text",
    ".narrativeFacts.fixed_sentences",
    ".narrativeFacts.precision_recall_gap.difference_text",
    ".narrativeFacts.weakest_class.f1_text", // S2·S3 검토 D2·D3 — 판 4 전용 키
    ".narrativeFacts.weakest_class.gap_text",
    ".narrativeFacts.weakest_class.share_text",
    ".nearTargetNote",
    ".problems",
  ],
  digits_strong: [
    ".contentSchema",
    ".datasetInfo.sourceFile",
    ".edition4Values",
    ".evalEnv.engineVersion",
    ".kpiResults[].ciRaw",
    ".kpiResults[].judgmentMargin",
    ".materialCheck.printed.cover",
    ".materialCheck.printed.coverRows",
    ".materialCheck.printed.notProvided",
    ".meta.title",
    ".metricFormulas[].formula",
    ".narrativeFacts.average_gap.difference_text",
    ".narrativeFacts.distribution_shift[].difference_text",
    ".narrativeFacts.distribution_shift[].evaluation_minus_training_text",
    ".narrativeFacts.fixed_sentences",
    ".narrativeFacts.weakest_class.f1_text", // S2·S3 검토 D2·D3 — 판 4 전용 키
    ".narrativeFacts.weakest_class.gap_text",
    ".narrativeFacts.weakest_class.share_text",
    ".nearTargetNote",
    ".problems",
  ],
  yeast_strong: [
    ".contentSchema",
    ".datasetInfo.sourceFile",
    ".edition4Values",
    ".errorRatioSentence", // S6 뒤 사용자 결정 4 — 고정 문구 17 "틀린 레이블 칸 2,687개"(건수 쉼표)
    ".evalEnv.engineVersion",
    ".kpiResults[].ciRaw",
    ".kpiResults[].judgmentMargin",
    ".materialCheck.printed.cover",
    ".materialCheck.printed.coverRows",
    ".materialCheck.printed.impacts[]", // S6 뒤 사용자 결정 2 — 일부만 빠진 학습 데이터 항목에 "(빠진 것: 학습 클래스 분포)"
    ".materialCheck.printed.notProvided",
    ".meta.title",
    ".metricFormulas[].formula",
    // S6 질문 4 — 판 4 멀티레이블의 최약 레이블·작은 표본 비율 분모 = 표본 수(분모 이름·비율·작은 몫 판정, 작은 표본 목록이 달라짐)
    ".narrativeFacts.class_share_basis",
    ".narrativeFacts.fixed_sentences[].text",
    ".narrativeFacts.low_support_classes",
    ".narrativeFacts.weakest_class.f1_text", // S2·S3 검토 D2·D3 — 판 4 전용 키
    ".narrativeFacts.weakest_class.gap_text",
    ".narrativeFacts.weakest_class.low_support",
    ".narrativeFacts.weakest_class.share",
    ".narrativeFacts.weakest_class.share_text",
    ".problems",
  ],
};

describe.each(TAGS)("판 4 run 저장 데이터 — %s", (tag: Tag) => {
  const stage1 = () => captures.get(tag)!.stage1;

  it("판 3 정답과 달라진 자리 = 판 4 가 바꾸는 자리 목록", () => {
    expect(sorted(changedPaths(golden(tag, "stage1"), stage1()))).toEqual([...STAGE1_CHANGES[tag]].sort());
  });

  it("판 4 생성값의 키가 모두 있다 — 해시·크기·엔진 버전(새 응답이라 값 있음), 4.2·표지·4.5", () => {
    expect(stage1().datasetInfo.sourceFile).toEqual({ sha256: expect.stringMatching(/^[0-9a-f]{64}$/), sizeBytes: expect.any(Number) });
    expect(stage1().evalEnv.engineVersion).toBe("1.0.0");
    const v = stage1().edition4Values;
    // 저장 데이터는 키를 정렬해 직렬화한 글이다(하네스 stableJson).
    expect(Object.keys(v)).toEqual(["coverResultRows", "distribution", "thresholdTable", "verdict"]);
    expect(v.coverResultRows[0].label).toBe("종합 판정");
    expect(v.coverResultRows.filter((r: Json) => r.label === "핵심 지표").length).toBeGreaterThan(0);
    expect(v.verdict.basis).toEqual(expect.any(String));
    expect(v.distribution.imbalanceSentence).toMatch(/^클래스 불균형 비율\(Imbalance Ratio\)은 \d+\.\d{3,}이다\.$/);
    // 4.4 는 이진만.
    expect(v.thresholdTable === null).toBe(tag !== "bc_strong");
  });
});

describe("다중·멀티 입력의 판 4 생성값(자리 단정)", () => {
  it("digits_strong(다중) — 핵심 지표 둘, 학습·평가 비율 표 10줄", () => {
    const v = captures.get("digits_strong")!.stage1.edition4Values;
    expect(v.coverResultRows.map((r: Json) => r.value)).toEqual([
      "최종 합격 (판정 대상 지표 3개 중 3개 충족, 4.2)",
      "Accuracy 0.989 (합격 기준 ≥ 0.980, 충족, 판정 여유 작음, 4.3)",
      "F1 Score 0.989 (합격 기준 ≥ 0.980, 충족, 판정 여유 작음, 4.3)",
    ]);
    expect(v.verdict.basis).toBe(
      "핵심 지표 Accuracy(M1), F1 Score(M4)와 그 밖의 판정 대상 지표가 모두 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.",
    );
    expect(v.distribution.training.status).toBe("compared");
    expect(v.distribution.training.rows.length).toBe(10);
    expect(v.distribution.imbalanceRatioText).toBe("1.058");
  });

  it("yeast_strong(멀티) — 조건부 합격(초안 글), 학습 분포 없음(부록 B16 표지)", () => {
    const v = captures.get("yeast_strong")!.stage1.edition4Values;
    expect(v.verdict).toMatchObject({ verdict: "CONDITIONAL_PASS", label: "조건부 합격", countText: "3개 중 2개" });
    expect(v.verdict.basis).toBe(
      "핵심 지표 Hamming Loss(M15), Jaccard Index(M17)는 목표를 충족하였으나 F1 Score(M4)가 목표에 미달하여, 3.4의 판정 규칙에 따라 조건부 합격으로 판정하였다.",
    );
    expect(v.distribution.training).toEqual({ status: "not_provided", rows: [] });
    expect(v.distribution.imbalanceRatioText).toBe("52.923");
  });
});
