/**
 * 판 4 표지(갈래 b1) — 화면·인쇄·번호 열기 세 경로로 그려 예시본 표지 블록과 줄 전체를 맞추고, 미발급(B1)·다중·멀티·요약 표 갈래
 * (B2·B3·B4·B32 — 저장값을 그대로 찍는지)를 정확값으로 단정한다. 픽스처에 없는 갈래는 픽스처를 복사해 필요한 칸만 바꾼다.
 */
import { describe, expect, it } from "vitest";

import { COVER_CORE_NO_TARGET_DRAFT, COVER_CORE_UNAVAILABLE, COVER_VERDICT_NONE, fillTemplate } from "../../../lib/report/edition4/edition4Text";
import { asRendered, coverExampleBlock, partOf } from "../../../lib/report/edition4/render/coverTestKit";
import { loadEd4, loadEd4Issuance } from "../../../test/edition4/render/ed4Fixtures";
import { byNumberText, printText, screenText } from "../../../test/edition4/render/renderEd4";
import type { FinalReportData } from "../../../types/finalReport.types";

const TITLE = "기계학습 분류 성능 시험성적서";
const NEXT = "1. 시험 개요";

const copy = (data: FinalReportData, change: (d: FinalReportData) => void): FinalReportData => {
  const d = structuredClone(data);
  change(d);
  return d;
};

describe("표지 — bc_strong 발급본 = 예시본 표지 블록(줄 전체·순서, 가림 0개)", () => {
  const want = asRendered(coverExampleBlock());

  it("예시본 블록 자체: 15줄(제목·상태·표준·기관·22·정보 표 4행·소제목·요약 표 5행)", () => {
    expect(want).toHaveLength(15);
    expect(want[0]).toBe(TITLE);
    expect(want).not.toContain("○");
  });

  it("화면", () => {
    expect(partOf(screenText(loadEd4("bc_strong", "issued")), TITLE, NEXT)).toEqual(want);
  });

  it("인쇄", async () => {
    expect(partOf(await printText(loadEd4("bc_strong", "issued")), TITLE, NEXT)).toEqual(want);
  });

  it("번호 열기(발급 전 보관본 + 발급 기록)", async () => {
    const page = await byNumberText(loadEd4("bc_strong", "final"), loadEd4Issuance("bc_strong"), { dropRecord: true });
    expect(partOf(page, TITLE, NEXT)).toEqual(want);
  });
});

describe("표지 — 미발급(부록 B1)", () => {
  const want = [
    TITLE,
    "[ 초안 — 미발급 ]",
    "평가 결과는 확정되었으나 아직 발급되지 않았습니다.",
    "ISO/IEC TS 4213:2022에 따라 평가. 일부 보고 항목 미제공(1.3 참조)",
    "발급 기관: 리트머스",
    "| 문서 번호 | (미발급) | 발급 일시 | (미발급)",
    "| 시험 대상 | BreastScreen-LR v2.1 | 의뢰자 | (주)시연고객",
    "| 평가 유형 | 이진 분류 | 시험 기간 | 2026-10-22 ~ 2026-10-22",
    "| 발급 방식 | 자동 발급 (사람 승인 없음) | 양식 판 | 4",
    "시험 결과 요약",
    "| 항목 | 결과",
    "| 종합 판정 | 최종 합격 (판정 대상 지표 5개 중 5개 충족, 4.2)",
    "| 핵심 지표 | Recall 0.984 (합격 기준 ≥ 0.970, 충족, 판정 여유 작음, 4.3)",
    "| 보고 항목 | TS 4213 보고 항목 11개 중 10개 제공 (빠진 항목: 추론 효율성(지연시간), 1.3)",
    "| 주요 제약 | 평가 데이터가 학습 데이터와 같은 출처 (5.1)",
  ];

  it("화면(완료·미발급) — 고정 문구 22 없음, 문서 번호·발급 일시 (미발급)", () => {
    const lines = partOf(screenText(loadEd4("bc_strong", "final")), TITLE, NEXT);
    expect(lines).toEqual(want);
    expect(lines.join("\n")).not.toMatch(/자동으로 발급한 문서/);
    expect(lines).not.toContain("[ 발급 완료 ]");
  });

  it("인쇄(미발급 초안)", async () => {
    expect(partOf(await printText(loadEd4("bc_strong", "final")), TITLE, NEXT)).toEqual(want);
  });

  it("평가 전 초안(대기) — 같은 B1 줄, 요약 표는 저장된 줄만", () => {
    const lines = partOf(screenText(loadEd4("bc_strong", "pending")), TITLE, NEXT);
    expect(lines.slice(0, 9)).toEqual(want.slice(0, 9));
  });

  it("문서 번호는 있으나 발급 일시가 빈 데이터 — 발급 일시만 (미발급)", () => {
    const data = copy(loadEd4("bc_strong", "issued"), (d) => (d.meta.issuedAt = ""));
    const lines = partOf(screenText(data), TITLE, NEXT);
    expect(lines[1]).toBe("[ 발급 완료 ]");
    expect(lines).toContain("| 문서 번호 | RPT-2026-0001 | 발급 일시 | (미발급)");
  });
});

describe("표지 — 다중·멀티(예시본에 없는 갈래, 저장값 정확값)", () => {
  it("digits_strong 발급본 — 핵심 지표 두 줄, 주요 제약 B4(같은 출처 + 목적별)", () => {
    const lines = partOf(screenText(loadEd4("digits_strong", "issued")), TITLE, NEXT);
    expect(lines).toEqual([
      TITLE,
      "[ 발급 완료 ]",
      "ISO/IEC TS 4213:2022에 따라 평가. 일부 보고 항목 미제공(1.3 참조)",
      "발급 기관: 리트머스",
      "본 시험성적서는 평가 시스템이 자동으로 발급한 문서이며, 발급 전에 사람이 승인하지 않았습니다. 의뢰자는 입력 내용을 확인하고 발급을 요청하였습니다.",
      "| 문서 번호 | RPT-2026-0003 | 발급 일시 | 2026-10-22 18:52",
      "| 시험 대상 | DigitReader-SVC v1.4.0 | 의뢰자 | (주)시연고객",
      "| 평가 유형 | 다중 클래스 분류 | 시험 기간 | 2026-10-22 ~ 2026-10-22",
      "| 발급 방식 | 자동 발급 (사람 승인 없음) | 양식 판 | 4",
      "시험 결과 요약",
      "| 항목 | 결과",
      "| 종합 판정 | 최종 합격 (판정 대상 지표 3개 중 3개 충족, 4.2)",
      "| 핵심 지표 | Accuracy 0.989 (합격 기준 ≥ 0.980, 충족, 판정 여유 작음, 4.3)",
      "| 핵심 지표 | F1 Score 0.989 (합격 기준 ≥ 0.980, 충족, 판정 여유 작음, 4.3)",
      "| 보고 항목 | TS 4213 보고 항목 11개 중 10개 제공 (빠진 항목: 추론 효율성(지연시간), 1.3)",
      "| 주요 제약 | 평가 데이터가 학습 데이터와 같은 출처 (5.1), 목적별 점검 2개 중 1개 충족 (1.3)",
    ]);
  });

  it("yeast_strong 발급본(인쇄) — 조건부 합격, 낮을수록 좋은 핵심 지표(≤), 빠진 항목 둘", async () => {
    const lines = partOf(await printText(loadEd4("yeast_strong", "issued")), TITLE, NEXT);
    expect(lines.slice(5, 9)).toEqual([
      "| 문서 번호 | RPT-2026-0005 | 발급 일시 | 2026-10-22 18:57",
      "| 시험 대상 | YeastFunc-OvR v3.0 | 의뢰자 | (주)시연고객",
      "| 평가 유형 | 다중 레이블 분류 | 시험 기간 | 2026-10-22 ~ 2026-10-22",
      "| 발급 방식 | 자동 발급 (사람 승인 없음) | 양식 판 | 4",
    ]);
    expect(lines.slice(9)).toEqual([
      "시험 결과 요약",
      "| 항목 | 결과",
      "| 종합 판정 | 조건부 합격 (판정 대상 지표 3개 중 2개 충족, 4.2)",
      "| 핵심 지표 | Hamming Loss 0.209 (합격 기준 ≤ 0.220, 충족, 판정 여유 충분, 4.3)",
      "| 핵심 지표 | Jaccard Index 0.495 (합격 기준 ≥ 0.450, 충족, 판정 여유 충분, 4.3)",
      "| 보고 항목 | TS 4213 보고 항목 12개 중 10개 제공 (빠진 항목: 학습 데이터의 출처·크기·구성, 추론 효율성(지연시간), 1.3)",
      "| 주요 제약 | 평가 데이터가 학습 데이터와 같은 출처 (5.1)",
    ]);
  });
});

describe("표지 요약 표 — 저장값을 그대로·순서대로 찍는다(B2·B3·B32 는 저장값이 담는다)", () => {
  const summaryOf = (data: FinalReportData) => {
    const lines = partOf(screenText(data), TITLE, NEXT);
    return lines.slice(lines.indexOf("시험 결과 요약") + 1);
  };

  it("B2 — 판정 대상 0개: 종합 판정 한 줄만", () => {
    const data = copy(loadEd4("bc_strong", "issued"), (d) => {
      d.edition4Values!.coverResultRows = [{ label: "종합 판정", value: COVER_VERDICT_NONE }];
    });
    expect(summaryOf(data)).toEqual([
      "| 항목 | 결과",
      "| 종합 판정 | 판정 불가 (판정 대상 지표 없음, 4.2)",
      "| 보고 항목 | TS 4213 보고 항목 11개 중 10개 제공 (빠진 항목: 추론 효율성(지연시간), 1.3)",
      "| 주요 제약 | 평가 데이터가 학습 데이터와 같은 출처 (5.1)",
    ]);
  });

  it("B3 측정 불가 · B32 목표값 없음(초안) — 글자 그대로", () => {
    const b3 = fillTemplate(COVER_CORE_UNAVAILABLE, { 이름: "Recall", 기준: "≥ 0.970" });
    const b32 = fillTemplate(COVER_CORE_NO_TARGET_DRAFT, { 이름: "AUPRC", 값: "0.996" });
    const data = copy(loadEd4("bc_strong", "issued"), (d) => {
      d.edition4Values!.coverResultRows = [
        { label: "종합 판정", value: "판정 불가 (판정 대상 지표 5개 중 4개 충족, 4.2)" },
        { label: "핵심 지표", value: b3 },
        { label: "핵심 지표", value: b32 },
      ];
    });
    expect(summaryOf(data).slice(1, 4)).toEqual([
      "| 종합 판정 | 판정 불가 (판정 대상 지표 5개 중 4개 충족, 4.2)",
      "| 핵심 지표 | Recall 측정 불가 (합격 기준 ≥ 0.970, 4.3)",
      "| 핵심 지표 | AUPRC 0.996 (합격 기준 없음, 참고 지표, 4.3)",
    ]);
  });

  it("요약 줄이 하나도 없으면 소제목·표를 그리지 않는다", () => {
    const data = copy(loadEd4("bc_strong", "issued"), (d) => {
      delete d.edition4Values;
      delete d.materialCheck!.printed.coverRows;
    });
    const text = screenText(data);
    expect(text).not.toMatch(/시험 결과 요약/);
    expect(partOf(text, TITLE, NEXT).at(-1)).toBe("| 발급 방식 | 자동 발급 (사람 승인 없음) | 양식 판 | 4");
  });

  it("재료 점검 결과가 없으면 표준 문구 줄이 없다(발급 기관 줄이 상태 줄 바로 뒤)", () => {
    const data = copy(loadEd4("bc_strong", "issued"), (d) => delete d.materialCheck);
    expect(partOf(screenText(data), TITLE, NEXT).slice(0, 3)).toEqual([TITLE, "[ 발급 완료 ]", "발급 기관: 리트머스"]);
  });
});
