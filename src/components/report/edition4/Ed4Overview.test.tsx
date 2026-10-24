/**
 * 판 4 1절 시험 개요(갈래 b1) — bc_strong 을 화면·인쇄·번호 열기로 그려 예시본 "## 1. 시험 개요" 블록과 줄 전체를 맞추고(가림 0개),
 * 다중·멀티 픽스처와 복사 데이터로 예시본에 없는 갈래(과제 칸, 목적별 점검 미충족, 영향 줄 둘, 6번 없음, 5번 없음, FAX·홈페이지)를
 * 정확값으로 단정한다.
 */
import { describe, expect, it } from "vitest";

import { asRendered, partOf } from "../../../lib/report/edition4/render/coverTestKit";
import { exampleBlock } from "../../../test/edition4/render/renderEd4";
import { loadEd4, loadEd4Issuance } from "../../../test/edition4/render/ed4Fixtures";
import { byNumberText, printText, screenText } from "../../../test/edition4/render/renderEd4";
import type { FinalReportData } from "../../../types/finalReport.types";

const FIRST = "1. 시험 개요";
const NEXT = "2. 시험 대상";
const HEAD_1_3 = "본 시험성적서에서 기술한 내용은 다음의 전제 및 명시적 한계를 지닌다.";

const copy = (data: FinalReportData, change: (d: FinalReportData) => void): FinalReportData => {
  const d = structuredClone(data);
  change(d);
  return d;
};

/** 1.3 머리 문장 뒤 줄들(1절 끝까지). */
const constraintsOf = (lines: string[]) => lines.slice(lines.indexOf(HEAD_1_3) + 1);
/** 1.2 용도 표(머리 행 "| 용도 | …" 부터 1.3 제목 앞까지). */
const purposeTableOf = (lines: string[]) => lines.slice(lines.findIndex((l) => l.startsWith("| 용도 |")), lines.indexOf("1.3 제약사항"));

describe("1절 — bc_strong = 예시본 1절 블록(줄 전체·순서, 가림 0개)", () => {
  const want = asRendered(exampleBlock("## 1. 시험 개요"));

  it("예시본 블록 자체: 27줄, ○ 없음, 1.3 은 1~6번과 영향 줄 하나", () => {
    expect(want).toHaveLength(27);
    expect(want.join("\n")).not.toMatch(/○/);
    expect(constraintsOf(want).map((l) => /^(\d)\. /.exec(l)?.[1] ?? "-")).toEqual(["1", "2", "3", "4", "5", "6", "-"]);
  });

  it("화면(발급본)", () => {
    expect(partOf(screenText(loadEd4("bc_strong", "issued")), FIRST, NEXT)).toEqual(want);
  });

  it("화면(미발급) — 1절은 발급 여부와 무관", () => {
    expect(partOf(screenText(loadEd4("bc_strong", "final")), FIRST, NEXT)).toEqual(want);
  });

  it("인쇄", async () => {
    expect(partOf(await printText(loadEd4("bc_strong", "issued")), FIRST, NEXT)).toEqual(want);
  });

  it("번호 열기", async () => {
    const page = await byNumberText(loadEd4("bc_strong", "final"), loadEd4Issuance("bc_strong"), { dropRecord: true });
    expect(partOf(page, FIRST, NEXT)).toEqual(want);
  });
});

describe("1절 — digits_strong(다중, 과제 산출물, 목적별 점검 미충족)", () => {
  const lines = partOf(screenText(loadEd4("digits_strong", "issued")), FIRST, NEXT);

  it("1.2 목적 문단 — 모델명 뒤 를(받침 없음 C)", () => {
    expect(lines[lines.indexOf("1.2 시험 목적과 성적서 용도") + 1]).toMatch(/^본 시험성적서는 "DigitReader-SVC"를 대상으로 ISO\/IEC TS 4213:2022 기준에/);
  });

  it("1.2 용도 표 — 과제 산출물, 덧붙인 글 없음, 과제명·과제 기관 칸", () => {
    expect(purposeTableOf(lines)).toEqual([
      "| 용도 | 과제 산출물",
      "| 개요 | 정부 또는 기관 과제의 산출물 증빙 목적으로 활용",
      "| 과제명 | 우편물 자동 분류 고도화 과제",
      "| 과제 기관 | 정보통신기획평가원",
    ]);
  });

  it("1.3 — 6번 제공되지 않은 정보 + 영향 줄, 7번 목적별 점검 미충족 + 미충족 줄(표지 주요 제약 '(1.3)' 이 가리키는 자리)", () => {
    const c = constraintsOf(lines);
    expect(c.map((l) => /^(\d)\. ([^:]+):/.exec(l)?.slice(1, 3).join(" ") ?? "-")).toEqual([
      "1 데이터 기반 평가의 국한성",
      "2 시험성적서 효력의 한계",
      "3 자동화 진단 소견에 대한 면책",
      "4 의뢰자 제공 정보에 대한 전제",
      "5 통계적 유의성 검정",
      "6 제공되지 않은 정보",
      "-",
      "7 목적별 점검 미충족",
      "-",
    ]);
    expect(c.slice(5)).toEqual([
      "6. 제공되지 않은 정보: ISO/IEC TS 4213이 보고를 요구하는 항목 중 추론 효율성(지연시간)은 의뢰자로부터 제공받지 못해 기재하지 않았다. 따라서 본 시험성적서는 위 항목에 대해 TS 4213의 보고 요구를 충족하지 않는다.",
      "추론 효율성(지연시간): 응답 속도가 용도에 맞는지 판단할 수 없다.",
      "7. 목적별 점검 미충족: 의뢰자가 밝힌 사용 목적에 비추어 다음 재료가 시험에 포함되지 않았다.",
      '의뢰자가 사용 방식을 "대화형(실시간)"으로 밝혔으나 응답시간(latency) 자료가 제공되지 않아, 응답 속도가 용도에 맞는지 판단할 수 없다.',
    ]);
  });
});

describe("1절 — yeast_strong(멀티, 덧붙인 용도 글, 빠진 항목 둘)", () => {
  it("인쇄 — 목적 문단 '을'(끝 R), 용도 개요 '(의뢰자 제공: …)', 6번 영향 줄 둘", async () => {
    const lines = partOf(await printText(loadEd4("yeast_strong", "issued")), FIRST, NEXT);
    expect(lines[lines.indexOf("1.2 시험 목적과 성적서 용도") + 1]).toMatch(/^본 시험성적서는 "YeastFunc-OvR"을 대상으로 /);
    expect(purposeTableOf(lines)).toEqual(["| 용도 | 외부 제출", "| 개요 | 외부 제출 및 인증/심사기관 검토 목적으로 활용 (의뢰자 제공: 공동 연구 기관 제출)"]);
    expect(constraintsOf(lines).slice(5)).toEqual([
      "6. 제공되지 않은 정보: ISO/IEC TS 4213이 보고를 요구하는 항목 중 학습 데이터의 출처·크기·구성(빠진 것: 학습 클래스 분포), 추론 효율성(지연시간)은 의뢰자로부터 제공받지 못해 기재하지 않았다. 따라서 본 시험성적서는 위 항목에 대해 TS 4213의 보고 요구를 충족하지 않는다.",
      "학습 데이터의 출처·크기·구성(빠진 것: 학습 클래스 분포): 평가 결과를 학습 데이터와 견주어 해석할 수 있는지 판단할 수 없다.",
      "추론 효율성(지연시간): 응답 속도가 용도에 맞는지 판단할 수 없다.",
    ]);
  });
});

describe("1절 — 픽스처에 없는 갈래(복사 데이터)", () => {
  const base = loadEd4("bc_strong", "issued");

  it("보고 항목이 다 제공되면 6번이 없다(5번이 끝)", () => {
    const data = copy(base, (d) => {
      delete d.materialCheck!.printed.notProvided;
      d.materialCheck!.printed.impacts = [];
    });
    const c = constraintsOf(partOf(screenText(data), FIRST, NEXT));
    expect(c).toHaveLength(5);
    expect(c[4]).toBe("5. 통계적 유의성 검정: 단일 모델 평가라 통계적 유의성 검정은 적용하지 않았고, 대신 주요 지표의 신뢰구간을 제시한다.");
    expect(c.join("\n")).not.toMatch(/제공되지 않은 정보/);
  });

  it("신뢰구간이 없는 성적서는 고정 문구 3 이 없고 번호가 당겨진다(제공되지 않은 정보 = 5번)", () => {
    const data = copy(base, (d) => delete d.confidenceIntervalNote);
    const c = constraintsOf(partOf(screenText(data), FIRST, NEXT));
    expect(c).toHaveLength(6);
    expect(c[3]).toMatch(/^4\. 의뢰자 제공 정보에 대한 전제: /);
    expect(c[4]).toMatch(/^5\. 제공되지 않은 정보: ISO\/IEC TS 4213이/);
    expect(c.join("\n")).not.toMatch(/통계적 유의성 검정/);
  });

  it("FAX·홈페이지가 있으면 전화번호와 주소 사이에, 평가 의뢰일이 없으면 줄 없음", () => {
    const data = copy(base, (d) => {
      d.applicant.fax = "02-765-4321";
      d.applicant.homepage = "https://example.test";
      delete d.meta.contractDate;
    });
    const lines = partOf(screenText(data), FIRST, NEXT);
    const from = lines.indexOf("의뢰자");
    expect(lines.slice(from, lines.indexOf("시험기관"))).toEqual([
      "의뢰자",
      "| 항목 | 내용",
      "| 회사명 | (주)시연고객",
      "| 대표자 | 김시연",
      "| 사업자등록번호 | 123-45-67890",
      "| 전화번호 | 02-123-4567",
      "| FAX번호 | 02-765-4321",
      "| 홈페이지 | https://example.test",
      "| 주소 | 서울특별시 노원구 공릉로 232",
    ]);
  });

  it("시험기관 표 — 기관명은 performer.orgName, 평가자·연락처 칸 없음", () => {
    const data = copy(base, (d) => (d.performer.orgName = "다른기관"));
    const lines = partOf(screenText(data), FIRST, NEXT);
    const from = lines.indexOf("시험기관");
    expect(lines.slice(from, from + 4)).toEqual(["시험기관", "| 항목 | 내용", "| 기관명 | 다른기관", "| 발급 방식 | 자동 발급 (사람 승인 없음)"]);
  });

  it("용도 개요가 비면 용도별 기본 글, 과제 번호 칸(값이 있을 때)", () => {
    const data = copy(base, (d) => {
      d.evalScope.purpose = "";
      d.evalScope.reportPurposeKey = "internal";
      delete d.evalScope.purposeNote;
      d.evalScope.projectNumber = "2026-0042";
    });
    expect(purposeTableOf(partOf(screenText(data), FIRST, NEXT))).toEqual([
      "| 용도 | 내부 검증",
      "| 개요 | 조직 내부 QA 및 모델 모니터링 목적으로 활용",
      "| 과제 번호 | 2026-0042",
    ]);
  });
});
