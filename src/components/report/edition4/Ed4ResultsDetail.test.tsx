/**
 * 판 4 4.4~4.8(갈래 b4) — 그린 글을 예시본·픽스처 저장값과 대조한다.
 *
 * - bc_strong(이진): 화면·인쇄 두 경로로 그린 4.4~4.8 이 예시본 네 블록(4.4·4.5·4.6·4.7·4.8)과 **줄 단위로 똑같다**(사이에 다른 줄도
 *   없다). 가림은 4.7 의 "(그림)" 두 개뿐(그림은 글이 아니다) — 개수를 단정한다. 이 구간에 ○ 칸·서술 문단은 없다.
 * - digits_strong(다중)·yeast_strong(멀티): 예시본에 없는 갈래 — 저장값과 계획·부록 B 글자로 정확값.
 * - 픽스처에 없는 갈래(B15·B17·B33·uncovered·지연시간 있음·M21·임계값 표 없음·참조 범위 없음)는 픽스처를 복사해 칸만 바꾼 데이터로.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  B15_SUBMITTED_PREDICTION,
  B16_NO_TRAINING_DISTRIBUTION,
  B17_NO_CURVES,
  B33_NO_TRAINING_SAMPLES_DRAFT,
  FIXED_24_DISTRIBUTION,
} from "../../../lib/report/edition4/edition4Text";
import { FIXED_7_MULTILABEL_IMBALANCE } from "../../../lib/report/edition4/render/resultsDetailText";
import type { FinalReportData } from "../../../types/finalReport.types";
import { loadEd4 } from "../../../test/edition4/render/ed4Fixtures";
import { exampleBlock, exampleLines, printText, screenText, type ExampleLine } from "../../../test/edition4/render/renderEd4";
import { Ed4ResultsDetail } from "./Ed4ResultsDetail";

const FROM = "4.4 오분류";
const TO = "5. 분석 소견";

/** 그린 글에서 4.4 제목부터 5절 제목 앞까지의 줄. */
function detailLines(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  const a = lines.indexOf(FROM);
  const b = lines.indexOf(TO);
  expect(a, "4.4 제목이 없다").toBeGreaterThanOrEqual(0);
  expect(b, "5절 제목이 4.4 뒤에 없다").toBeGreaterThan(a);
  return lines.slice(a, b).filter((l) => l !== "");
}

/** 그린 줄을 예시본 줄 단위로(표 줄은 칸 배열). */
const asExample = (lines: string[]): ExampleLine[] =>
  lines.map((l) =>
    l.startsWith("|") ? { kind: "row", cells: l.split("|").slice(1).map((c) => c.trim()) } : { kind: "text", text: l },
  );

/** 예시본 4.4~4.8 블록 줄 — "(그림)" 가림 개수를 함께 돌려준다. */
function exampleDetail(): { lines: ExampleLine[]; masked: number } {
  const blocks = ["### 4.4 오분류", "### 4.5 데이터 분포", "### 4.6 참조 범위 비교", "### 4.7 곡선", "### 4.8 응답시간"]
    .map((h) => exampleBlock(h))
    .join("\n");
  let masked = 0;
  const unmasked = blocks.replace(/ \(그림\)$/gm, () => {
    masked += 1;
    return "";
  });
  return { lines: exampleLines(unmasked), masked };
}

const clone = (d: FinalReportData): FinalReportData => structuredClone(d);

/** 부품 하나만 그린 글(줄). */
function partLines(data: FinalReportData): string[] {
  const { container } = render(<Ed4ResultsDetail data={data} mode="screen" />);
  const out: string[] = [];
  container.querySelectorAll("h3, p, tr").forEach((el) => {
    if (el.tagName === "TR") out.push(`| ${[...el.querySelectorAll("th,td")].map((c) => c.textContent?.trim()).join(" | ")}`);
    else out.push((el.textContent ?? "").replace(/\s+/g, " ").trim());
  });
  return out;
}

const after = (lines: string[], head: string, n: number) => {
  const i = lines.indexOf(head);
  expect(i, `"${head}" 이 없다`).toBeGreaterThanOrEqual(0);
  return lines.slice(i + 1, i + 1 + n);
};

describe("bc_strong — 예시본 4.4~4.8 과 줄 단위로 같다", () => {
  it("예시본 가림은 4.7 의 '(그림)' 두 개뿐", () => {
    const { masked, lines } = exampleDetail();
    expect(masked).toBe(2);
    expect(lines.length).toBe(40);
  });

  it.each(["final", "issued"] as const)("화면(%s)", (kind) => {
    expect(asExample(detailLines(screenText(loadEd4("bc_strong", kind))))).toEqual(exampleDetail().lines);
  });

  it.each(["final", "issued"] as const)("인쇄(%s)", async (kind) => {
    expect(asExample(detailLines(await printText(loadEd4("bc_strong", kind))))).toEqual(exampleDetail().lines);
  });

  it("대기(서술 전)도 4.4~4.8 은 같다 — 서술에 기대지 않는다", () => {
    expect(asExample(detailLines(screenText(loadEd4("bc_strong", "pending"))))).toEqual(exampleDetail().lines);
  });

  it("자리마다 저장값을 읽는다(같은 값이 여러 곳에 있어 자리별로)", () => {
    const lines = detailLines(screenText(loadEd4("bc_strong", "final")));
    // 최약 클래스 F1 = 사실 시트 f1_text, 비율 = share_text 의 %, 차이 = gap_text
    expect(after(lines, "최약 클래스(F1 최저)", 2)[1]).toBe("| malignant(악성 종양) | 0.977 | 64 | 37.4% | 0.005 | 아니오");
    // 예측 편향 차이 +1
    expect(after(lines, "예측 편향(예측 수 대 실제 수)", 2)[1]).toBe("| malignant(악성 종양) | 65 | 64 | +1");
    // 임계값 표 머리·행·상승폭
    expect(after(lines, "임계값 조정 여지", 5)).toEqual([
      "| 지표 | 현재 결정 임계값 0.5 | F1이 가장 높은 결정 임계값 0.6166",
      "| F1 Score | 0.977 | 0.984",
      "| Recall | 0.984 | 0.984",
      "| Precision | 0.969 | 0.984",
      "F1의 최대 상승폭은 0.008이다.",
    ]);
    // 4.6 모델 값 Accuracy 0.982(KPI 원값 0.98246 — 백엔드 modelValue 0.9825 의 0.983 이 아님)
    expect(lines).toContain("| Accuracy | 0.982 | 0.85 ~ 0.92 | 범위보다 높음 | 0.950 | 범위보다 높음");
    expect(lines.join("\n")).not.toMatch(/0\.983|우수|미흡|범위 내/);
  });
});

describe("digits_strong(다중) — 최다 오분류 쌍·클래스별 건수", () => {
  const lines = detailLines(screenText(loadEd4("digits_strong", "final")));

  it("건수 표는 클래스마다, 머리 '클래스', 표 아래 판 3 설명", () => {
    const rows = after(lines, "혼동 행렬 건수", 12);
    expect(rows[0]).toBe("| 클래스 | TP | TN | FP | FN");
    expect(rows[1]).toBe("| 0 | 54 | 486 | 0 | 0");
    expect(rows[10]).toBe("| 9 | 52 | 485 | 1 | 2");
    expect(rows[11]).toBe("클래스마다 그 클래스를 양성, 나머지를 음성으로 본 건수입니다.");
  });

  it("17번 문장(다중 갈래)은 저장 문장 그대로", () => {
    expect(lines).toContain(
      "확률이 있는 오분류 6건 중 경계 오류(예측·정답 클래스 확률 차가 0.1 미만)는 2건(33.3%), 확신 오류(예측 클래스 확률 0.9 이상)는 0건(0.0%)이다.",
    );
  });

  it("최약 클래스 F1 은 늘린 표기 0.9720(f1_text)", () => {
    expect(after(lines, "최약 클래스(F1 최저)", 2)[1]).toBe("| 9 | 0.9720 | 54 | 10.0% | 0.017 | 아니오");
  });

  it("예측 편향은 클래스마다, 설명이 있는 클래스는 이름(설명), 음수는 U+2212", () => {
    const rows = after(lines, "예측 편향(예측 수 대 실제 수)", 11);
    expect(rows[0]).toBe("| 클래스 | 예측 수 | 실제 수 | 차이(예측 − 실제)");
    expect(rows[1]).toBe("| 0(숫자 0) | 54 | 54 | 0");
    expect(rows[2]).toBe("| 1(숫자 1) | 56 | 55 | +1");
    expect(rows[6]).toBe("| 5 | 54 | 55 | −1");
    expect(rows[8]).toBe("| 7(숫자 7(가로줄 없는 필체 포함)) | 53 | 54 | −1");
  });

  it("최다 오분류 쌍(상위 3) — 비율은 판 4 백분율 16.7%(판 3 의 16.67% 아님)", () => {
    expect(after(lines, "최다 오분류 쌍(상위 3)", 4)).toEqual([
      "| 실제 → 예측 | 건수 | 오분류 중 비율",
      "| 5 → 6 | 1 | 16.7%",
      "| 5 → 9 | 1 | 16.7%",
      "| 6 → 1(숫자 1) | 1 | 16.7%",
    ]);
  });

  it("임계값 표 없음(이진 아님) → 소제목째 없음, 곡선 없음 → B17", () => {
    expect(lines).not.toContain("임계값 조정 여지");
    expect(lines.some((l) => l.startsWith("F1의 최대 상승폭"))).toBe(false);
    expect(after(lines, "4.7 곡선", 1)).toEqual([B17_NO_CURVES]);
  });

  it("4.5 학습·평가 비율 표(10줄)와 4.6 표", () => {
    const rows = after(lines, "학습·평가 클래스 비율", 12);
    expect(rows[0]).toBe("| 클래스 | 학습 비율 | 평가 비율 | 차이");
    expect(rows[3]).toBe("| 2 | 9.9% | 9.8% | 0.0%p");
    expect(rows[5]).toBe("| 4 | 10.1% | 10.0% | −0.1%p");
    expect(rows[11]).toBe(FIXED_24_DISTRIBUTION);
    expect(after(lines, "4.6 참조 범위 비교", 7)).toEqual([
      "| 지표 | 모델 값 | 참조 범위 | 위치 | 목표값 | 목표값 수준",
      "| Accuracy | 0.989 | 0.80 ~ 0.90 | 범위보다 높음 | 0.980 | 범위보다 높음",
      "| Precision | 0.989 | 0.78 ~ 0.89 | 범위보다 높음 | — | —",
      "| Recall | 0.989 | 0.78 ~ 0.89 | 범위보다 높음 | — | —",
      "| F1 Score | 0.989 | 0.78 ~ 0.89 | 범위보다 높음 | 0.980 | 범위보다 높음",
      "※ 내부 참조 기준치 v1 (공개 벤치마크 평균이 아닌 자체 설정 기준이며, 도메인별로 상이할 수 있음)",
      "다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: KL Divergence, Macro Average, Micro Average, Imbalance Ratio.",
    ]);
  });
});

describe("yeast_strong(멀티) — 고정 문구 7·B16·레이블 단위", () => {
  const lines = detailLines(screenText(loadEd4("yeast_strong", "final")));

  it("4.5 한 문단: 분포 문장(분모 = 표본 수) + 고정 문구 7 + 불균형 문장", () => {
    const p = after(lines, "4.5 데이터 분포", 1)[0];
    expect(p.startsWith("평가 데이터셋은 총 917건이며, 클래스(레이블)별 분포는 Class1 286건(31.2%), ")).toBe(true);
    expect(p).toContain("Class12 688건(75.0%), Class13 683건(74.5%)");
    expect(p.endsWith(`이다. ${FIXED_7_MULTILABEL_IMBALANCE} 클래스 불균형 비율(Imbalance Ratio)은 52.923이다.`)).toBe(true);
  });

  it("학습 분포 없음 → 소제목 아래 B16, 표 없음, 끝에 24", () => {
    expect(after(lines, "학습·평가 클래스 비율", 2)).toEqual([B16_NO_TRAINING_DISTRIBUTION, FIXED_24_DISTRIBUTION]);
    expect(lines).not.toContain("| 클래스 | 학습 비율 | 평가 비율 | 차이");
  });

  it("최약 레이블 표(비율 분모 = 표본 수, 4.5 와 같은 8.7%), 예측 편향 '전체 레이블'", () => {
    // S6 질문 4: 판 4 멀티레이블 최약 레이블 비율의 분모는 표본 수(80/917 = 8.7%, 작은 표본 아님) — 등장 합 분모 설명 줄 없음
    expect(after(lines, "최약 레이블(F1 최저)", 3)).toEqual([
      "| 레이블 | F1 | 표본 수 | 비율 | 매크로 F1과의 차이 | 작은 표본",
      "| Class9 | 0.048 | 80 | 8.7% | 0.352 | 아니오",
      "매크로 F1과의 차이 = 매크로 F1 − 이 레이블의 F1. 작은 표본은 표본 수 30건 미만 또는 전체의 5% 미만입니다.",
    ]);
    // 4.5 분포 문장의 같은 레이블 비율과 같은 숫자
    expect(lines.find((l) => l.startsWith("평가 데이터셋은 총 917건이며"))).toContain("Class9 80건(8.7%)");
    expect(after(lines, "예측 편향(예측 수 대 실제 수)", 2)).toEqual([
      "| 대상 | 예측 수 | 실제 수 | 차이(예측 − 실제)",
      "| 전체 레이블 | 3,290 | 3,899 | −609",
    ]);
    // 표의 수는 천 단위 쉼표(S6 질문 8), 서술 문장의 1,000 이상 건수도 쉼표(S6 뒤 사용자 결정 4 — 고정 문구 17 "2,687개")
    expect(lines).toContain(
      "확률이 있는 틀린 레이블 칸 2,687개 중 경계 오류(확률과 결정 임계값 0.5의 차가 0.1 미만)는 637개(23.7%), 확신 오류(틀린 쪽 확률 0.9 이상)는 431개(16.0%)이다.",
    );
    expect(lines.some((l) => l.startsWith("최다 오분류 쌍"))).toBe(false);
  });

  it("4.6 낮을수록 좋은 지표 — 위치는 수치 위치(범위보다 높음), 모델 값 judged 0.209", () => {
    expect(lines).toContain("| Hamming Loss (낮을수록 좋음) | 0.209 | 0.05 ~ 0.20 | 범위보다 높음 | 0.220 | 범위보다 높음");
    expect(lines).toContain("| F1 Score | 0.399 | 0.70 ~ 0.85 | 범위보다 낮음 | 0.450 | 범위보다 낮음");
  });
});

describe("픽스처에 없는 갈래 — 복사본", () => {
  const bc = () => clone(loadEd4("bc_strong", "final"));

  it("B15 — 예측값 직접 제출이면 지금 칸 머리 '현재 예측(제출된 예측값)'", () => {
    const d = bc();
    d.edition4Values!.thresholdTable!.current = { kind: "submitted" };
    const lines = partLines(d);
    expect(after(lines, "임계값 조정 여지", 1)).toEqual([`| 지표 | ${B15_SUBMITTED_PREDICTION} | F1이 가장 높은 결정 임계값 0.6166`]);
  });

  it("임계값 표기 없음(옛 응답)·빈 칸 → '—'", () => {
    const d = bc();
    d.edition4Values!.thresholdTable!.bestThresholdText = null;
    d.edition4Values!.thresholdTable!.rows[2].best = null;
    const lines = partLines(d);
    expect(after(lines, "임계값 조정 여지", 4)).toEqual([
      "| 지표 | 현재 결정 임계값 0.5 | F1이 가장 높은 결정 임계값 —",
      "| F1 Score | 0.977 | 0.984",
      "| Recall | 0.984 | 0.984",
      "| Precision | 0.969 | —",
    ]);
  });

  it("임계값 표 null → 소제목·상승폭 줄째 없음", () => {
    const d = bc();
    d.edition4Values!.thresholdTable = null;
    const lines = partLines(d);
    expect(lines).not.toContain("임계값 조정 여지");
    expect(lines.some((l) => l.startsWith("F1의 최대 상승폭"))).toBe(false);
  });

  it("B17 — 곡선이 없으면 4.7 은 한 줄", () => {
    const d = bc();
    d.charts = { ...d.charts, rocCurve: null, prCurve: null };
    expect(after(partLines(d), "4.7 곡선", 2)).toEqual([B17_NO_CURVES, "4.8 응답시간"]);
  });

  it("곡선 하나만(PR 없음) → ROC 줄만, 그림 하나", () => {
    const d = bc();
    d.charts = { ...d.charts, prCurve: null };
    const { container } = render(<Ed4ResultsDetail data={d} mode="print" />);
    expect(container.querySelectorAll("[data-ed4-curve]")).toHaveLength(1);
    expect(container.querySelector('[data-ed4-curve="roc"]')).not.toBeNull();
    expect(after(partLines(d), "4.7 곡선", 2)).toEqual([
      "ROC Curve (Y: true positive rate / X: false positive rate) — AUROC: 0.999",
      "4.8 응답시간",
    ]);
  });

  it("B33 — 멀티 학습 표본 수 없음(B16 아님)", () => {
    const d = clone(loadEd4("yeast_strong", "final"));
    d.edition4Values!.distribution.training = { status: "training_samples_not_provided", rows: [] };
    const lines = partLines(d);
    expect(after(lines, "학습·평가 클래스 비율", 2)).toEqual([B33_NO_TRAINING_SAMPLES_DRAFT, FIXED_24_DISTRIBUTION]);
    expect(lines).not.toContain(B16_NO_TRAINING_DISTRIBUTION);
  });

  it("uncovered — 학습 분포에 없는 클래스의 학습·차이 칸 '—'", () => {
    const d = bc();
    const rows = d.edition4Values!.distribution.training.rows;
    expect(rows.length).toBeGreaterThan(0);
    rows[1] = { ...rows[1], trainingRatio: null, trainingText: null, evaluationMinusTraining: null, differenceText: null };
    d.edition4Values!.distribution.training.status = "uncovered";
    expect(after(partLines(d), "학습·평가 클래스 비율", 3)).toEqual([
      "| 클래스 | 학습 비율 | 평가 비율 | 차이",
      "| benign | 62.8% | 62.6% | −0.2%p",
      "| malignant | — | 37.4% | —",
    ]);
  });

  it("지연시간 있음 — 표(판 3 줄 이름, 값 둘째 자리 + 단위), '제공되지 않음' 없음", () => {
    const d = bc();
    d.latency = { mean: 12.345, min: 3, p50: 10.004, p95: 20.5, p99: 31.999, max: 40.126, unit: "ms" };
    const lines = partLines(d);
    expect(after(lines, "4.8 응답시간", 7)).toEqual([
      "| 항목 | 값",
      "| 평균 응답시간 (Mean Latency) | 12.35 ms",
      "| 최소 응답시간 (Min Latency) | 3.00 ms",
      "| P50 응답시간 | 10.00 ms",
      "| P95 응답시간 | 20.50 ms",
      "| P99 응답시간 | 32.00 ms",
      "| 최대 응답시간 (Max Latency) | 40.13 ms",
    ]);
    expect(lines.some((l) => l.startsWith("제공되지 않음 — 응답시간"))).toBe(false);
  });

  it("M21 을 골랐으면 4.4 에 혼동 행렬 그림(17번 문장 뒤, 최약 클래스 앞)", () => {
    const d = bc();
    d.charts = { ...d.charts, confusionMatrix: { labels: ["benign", "malignant"], matrix: [[105, 2], [1, 63]], totalSamples: 171 } };
    const { container } = render(<Ed4ResultsDetail data={d} mode="screen" />);
    const fig = container.querySelector('[data-ed4-figure="M21"]');
    expect(fig).not.toBeNull();
    expect(fig!.textContent).toContain("Predicted: malignant");
    const html = container.innerHTML;
    expect(html.indexOf("확률이 있는 오분류")).toBeLessThan(html.indexOf('data-ed4-figure="M21"'));
    expect(html.indexOf('data-ed4-figure="M21"')).toBeLessThan(html.indexOf("최약 클래스(F1 최저)"));
    // 고르지 않으면(픽스처) 그림 없음
    expect(render(<Ed4ResultsDetail data={bc()} mode="screen" />).container.querySelector('[data-ed4-figure="M21"]')).toBeNull();
  });

  it("참조 범위가 없으면 4.6 표·※ 줄 없이 기준 없는 지표 문장만", () => {
    const d = bc();
    d.conclusion = { ...d.conclusion, benchmarkRefs: [] };
    d.noBenchmarkSentence = "다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: Log Loss.";
    expect(after(partLines(d), "4.6 참조 범위 비교", 2)).toEqual([d.noBenchmarkSentence, "4.7 곡선"]);
  });

  it("다중 갈래 표(최다 오분류 쌍)는 이진 데이터에 쌍이 있어도 그리지 않는다", () => {
    const d = bc();
    d.narrativeFacts = { ...d.narrativeFacts!, top_confusion_pairs: [{ actual: "benign", predicted: "malignant", count: 2, share_of_errors: 0.666666667 }] };
    expect(partLines(d).some((l) => l.startsWith("최다 오분류 쌍"))).toBe(false);
  });

  it("평가 전 초안처럼 판 4 생성값·사실이 없으면 표 없이 고정 줄만(깨지지 않음)", () => {
    const d = bc();
    delete (d as Partial<FinalReportData>).edition4Values;
    delete (d as Partial<FinalReportData>).narrativeFacts;
    d.confusionCounts = null;
    delete (d as Partial<FinalReportData>).errorRatioSentence;
    const lines = partLines(d);
    expect(after(lines, "4.4 오분류", 1)).toEqual(["4.5 데이터 분포"]);
    expect(after(lines, "4.5 데이터 분포", 2)).toEqual([FIXED_24_DISTRIBUTION, "4.6 참조 범위 비교"]);
  });
});
