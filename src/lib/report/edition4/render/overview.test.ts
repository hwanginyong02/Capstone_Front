/**
 * 판 4 1절 순수 함수(갈래 b1). 문안 출처도 시험한다: 1.3 기본 3항목은 판 3 글(`constraintsFor` 의 판 3 몫)에 부록 A1(결과서 →
 * 시험성적서)만 한 글이고, 4번은 판 3 고정 문구 13 + A1 = 판 4 고정 문구 13, 5번은 고정 문구 3 그대로다.
 */
import { describe, expect, it } from "vitest";

import { loadEd4 } from "../../../../test/edition4/render/ed4Fixtures";
import type { FinalReportData } from "../../../../types/finalReport.types";
import { CLIENT_PROVIDED_PREMISE, CONFIDENCE_INTERVAL_PREMISE, constraintsFor } from "../../reportConstants";
import { FIXED_13_ED4 } from "../edition4Text";
import { clientRows, constraintLines, institutionRows, purposeParagraph, purposeTable } from "./overview";
import { BASE_CONSTRAINTS_ED4, CONSTRAINT_PURPOSE_BODY, PURPOSE_PARAGRAPH } from "./overviewText";

const copy = (data: FinalReportData, change: (d: FinalReportData) => void): FinalReportData => {
  const d = structuredClone(data);
  change(d);
  return d;
};

/** 부록 A1 — 결과서·시험결과서 → 시험성적서. */
const a1 = (text: string) => text.replace(/시험결과서|결과서/g, "시험성적서");

const bc = loadEd4("bc_strong", "issued");

describe("문안 출처 — 판 3 글 + 부록 A1", () => {
  it("1.3 기본 3항목 = 판 3 1.4 의 판 3 몫(LLM 면책 뺀 3항목)에 A1", () => {
    const edition3 = constraintsFor(undefined, false, true);
    expect(edition3).toHaveLength(3);
    expect(BASE_CONSTRAINTS_ED4).toEqual(edition3.map((c) => ({ title: a1(c.title), body: a1(c.body) })));
  });

  it("4번 = 판 3 고정 문구 13 + A1 = 판 4 고정 문구 13", () => {
    expect(a1(CLIENT_PROVIDED_PREMISE)).toBe(FIXED_13_ED4);
  });

  it("목적별 점검 미충족 글은 판 3 1.4 글 그대로", () => {
    const withShortfall = constraintsFor(
      { ...bc.materialCheck!, printed: { ...bc.materialCheck!.printed, purposeShortfalls: ["x"] } },
      false,
      true,
    );
    expect(withShortfall.at(-1)).toEqual({ title: "목적별 점검 미충족", body: CONSTRAINT_PURPOSE_BODY, details: ["x"] });
  });
});

describe("1.1 표", () => {
  it("의뢰자 — 저장 칸 그대로, 빈 FAX·홈페이지 줄 없음", () => {
    expect(clientRows(bc)).toEqual([
      { label: "회사명", value: "(주)시연고객" },
      { label: "대표자", value: "김시연" },
      { label: "사업자등록번호", value: "123-45-67890" },
      { label: "전화번호", value: "02-123-4567" },
      { label: "주소", value: "서울특별시 노원구 공릉로 232" },
      { label: "평가 의뢰일", value: "2026-10-22" },
    ]);
  });

  it("평가 의뢰일은 meta.contractDate(시험 기간이 아님)", () => {
    const d = copy(bc, (x) => (x.meta.contractDate = "2026-09-30"));
    expect(clientRows(d).at(-1)).toEqual({ label: "평가 의뢰일", value: "2026-09-30" });
  });

  it("시험기관 — 기관명·발급 방식 두 줄", () => {
    expect(institutionRows(bc)).toEqual([
      { label: "기관명", value: "리트머스" },
      { label: "발급 방식", value: "자동 발급 (사람 승인 없음)" },
    ]);
  });
});

describe("1.2", () => {
  it("목적 문단 = 예시본 글, 모델명과 조사만 끼운다", () => {
    expect(purposeParagraph(bc)).toBe(PURPOSE_PARAGRAPH.replace("{모델}", "BreastScreen-LR").replace("{조사}", "을"));
    expect(PURPOSE_PARAGRAPH).not.toMatch(/신뢰성/);
  });

  it.each([
    ["BreastScreen-LR", "을"],
    ["DigitReader-SVC", "를"],
    ["판독기", "를"],
    ["판독 모델", "을"],
    ["Model-X2", "를"],
    ["Model-3", "을"],
  ])("모델명 %s 뒤 %s", (model, particle) => {
    const d = copy(bc, (x) => (x.evalScope.targetModel = model));
    expect(purposeParagraph(d)).toContain(`"${model}"${particle} 대상으로`);
  });

  it("용도 표 — 머리 행은 용도 이름, 개요는 materialRowText(덧붙인 글 괄호)", () => {
    expect(purposeTable(bc)).toEqual({
      header: ["용도", "외부 제출"],
      rows: [{ label: "개요", value: "외부 제출 및 인증/심사기관 검토 목적으로 활용 (의뢰자 제공: 의료기기 소프트웨어 사전 상담 자료로 제출)" }],
    });
  });

  it("옛 보관본처럼 projectInfo 안의 과제 번호도 읽는다", () => {
    const d = copy(bc, (x) => {
      x.evalScope.projectInfo = { name: "과제", agency: "기관", projectNumber: "P-1" };
      delete x.evalScope.purposeNote;
    });
    expect(purposeTable(d).rows).toEqual([
      { label: "개요", value: "외부 제출 및 인증/심사기관 검토 목적으로 활용" },
      { label: "과제명", value: "과제" },
      { label: "과제 기관", value: "기관" },
      { label: "과제 번호", value: "P-1" },
    ]);
  });
});

describe("1.3 항목", () => {
  it("bc_strong — 1~6번, 6번 아래 영향 줄 하나", () => {
    const lines = constraintLines(bc);
    expect(lines.map((l) => l.text.slice(0, l.text.indexOf(":")))).toEqual([
      "1. 데이터 기반 평가의 국한성",
      "2. 시험성적서 효력의 한계",
      "3. 자동화 진단 소견에 대한 면책",
      "4. 의뢰자 제공 정보에 대한 전제",
      "5. 통계적 유의성 검정",
      "6. 제공되지 않은 정보",
    ]);
    expect(lines[3].text).toBe(`4. 의뢰자 제공 정보에 대한 전제: ${FIXED_13_ED4}`);
    expect(lines[4].text).toBe(`5. 통계적 유의성 검정: ${CONFIDENCE_INTERVAL_PREMISE}`);
    expect(lines[5].text).toBe(`6. 제공되지 않은 정보: ${bc.materialCheck!.printed.notProvided}`);
    expect(lines[5].details).toEqual(["추론 효율성(지연시간): 응답 속도가 용도에 맞는지 판단할 수 없다."]);
    expect(lines.slice(0, 5).every((l) => l.details.length === 0)).toBe(true);
  });

  it("영향 줄은 printed.impacts 를 읽는다(바꿔 봄)", () => {
    const d = copy(bc, (x) => (x.materialCheck!.printed.impacts = ["가: 나.", "다: 라."]));
    expect(constraintLines(d)[5].details).toEqual(["가: 나.", "다: 라."]);
  });

  it("목적별 점검 미충족 — 줄이 있을 때만 맨 끝 번호", () => {
    const d = copy(bc, (x) => (x.materialCheck!.printed.purposeShortfalls = ["미충족 줄"]));
    expect(constraintLines(d).at(-1)).toEqual({ text: `7. 목적별 점검 미충족: ${CONSTRAINT_PURPOSE_BODY}`, details: ["미충족 줄"] });
    expect(constraintLines(bc)).toHaveLength(6);
  });

  it("재료 점검 결과가 없으면 4번까지(신뢰구간이 있으면 5번까지)", () => {
    const d = copy(bc, (x) => delete x.materialCheck);
    expect(constraintLines(d)).toHaveLength(5);
    expect(constraintLines(copy(d, (x) => delete x.confidenceIntervalNote))).toHaveLength(4);
  });
});
