/** 판 4 표지 순수 함수(갈래 b1) — 저장 칸을 읽는 자리와 갈래(발급·미발급)를 칸마다 따로 단정한다. */
import { describe, expect, it } from "vitest";

import { loadEd4 } from "../../../../test/edition4/render/ed4Fixtures";
import type { FinalReportData } from "../../../../types/finalReport.types";
import { B1_DRAFT_NOTICE, B1_DRAFT_STATUS, EX_ISSUED_STATUS, FIXED_22_ISSUE } from "../edition4Text";
import {
  coverInfoGrid,
  coverIssueSentence,
  coverIssuerLine,
  coverStandardLine,
  coverStatusLines,
  coverSummaryRows,
  isIssuedEd4,
} from "./cover";
import { COVER_ISSUER_LINE, ISSUE_METHOD_AUTO } from "./coverText";

const copy = (data: FinalReportData, change: (d: FinalReportData) => void): FinalReportData => {
  const d = structuredClone(data);
  change(d);
  return d;
};

const issued = loadEd4("bc_strong", "issued");
const unissued = loadEd4("bc_strong", "final");

describe("발급 여부·상태 줄·고정 문구 22", () => {
  it("문서 번호로 가른다", () => {
    expect(isIssuedEd4(issued)).toBe(true);
    expect(isIssuedEd4(unissued)).toBe(false);
    expect(isIssuedEd4(copy(unissued, (d) => (d.meta.reportId = "RPT-2026-0099")))).toBe(true);
  });

  it("상태 줄: 발급 [ 발급 완료 ] 한 줄 / 미발급 B1 두 줄(그 순서)", () => {
    expect(coverStatusLines(issued)).toEqual([EX_ISSUED_STATUS]);
    expect(coverStatusLines(unissued)).toEqual([B1_DRAFT_STATUS, B1_DRAFT_NOTICE]);
    expect(EX_ISSUED_STATUS).toBe("[ 발급 완료 ]");
    expect(B1_DRAFT_STATUS).toBe("[ 초안 — 미발급 ]");
    expect(B1_DRAFT_NOTICE).toBe("평가 결과는 확정되었으나 아직 발급되지 않았습니다.");
  });

  it("고정 문구 22 는 발급본에만", () => {
    expect(coverIssueSentence(issued)).toBe(FIXED_22_ISSUE);
    expect(coverIssueSentence(unissued)).toBeNull();
  });
});

describe("표준 문구·발급 기관", () => {
  it("표준 문구 = materialCheck.printed.cover 저장 글 그대로", () => {
    expect(coverStandardLine(issued)).toBe("ISO/IEC TS 4213:2022에 따라 평가. 일부 보고 항목 미제공(1.3 참조)");
    const changed = copy(issued, (d) => (d.materialCheck!.printed.cover = "기준 표준: ISO/IEC TS 4213:2022"));
    expect(coverStandardLine(changed)).toBe("기준 표준: ISO/IEC TS 4213:2022");
    expect(coverStandardLine(copy(issued, (d) => delete d.materialCheck))).toBeNull();
  });

  it("발급 기관 = performer.orgName(서명·발급 기록의 issuer 가 아님)", () => {
    expect(COVER_ISSUER_LINE).toBe("발급 기관: {기관}");
    expect(coverIssuerLine(issued)).toBe("발급 기관: 리트머스");
    expect(issued.signature.issuer).toBe("리트머스 평가부");
    expect(coverIssuerLine(copy(issued, (d) => (d.performer.orgName = "다른기관")))).toBe("발급 기관: 다른기관");
  });
});

describe("정보 표(4칸 4줄) — 칸마다", () => {
  it("발급본 bc_strong", () => {
    expect(coverInfoGrid(issued)).toEqual([
      ["문서 번호", "RPT-2026-0001", "발급 일시", "2026-10-22 18:46"],
      ["시험 대상", "BreastScreen-LR v2.1", "의뢰자", "(주)시연고객"],
      ["평가 유형", "이진 분류", "시험 기간", "2026-10-22 ~ 2026-10-22"],
      ["발급 방식", ISSUE_METHOD_AUTO, "양식 판", "4"],
    ]);
    expect(ISSUE_METHOD_AUTO).toBe("자동 발급 (사람 승인 없음)");
  });

  it("미발급 — 문서 번호·발급 일시 (미발급)", () => {
    expect(coverInfoGrid(unissued)[0]).toEqual(["문서 번호", "(미발급)", "발급 일시", "(미발급)"]);
  });

  it("칸마다 제 저장 칸을 읽는다(하나씩 바꿔 봄)", () => {
    const d = copy(issued, (x) => {
      x.evalScope.targetModel = "M";
      x.evalScope.version = "v9";
      x.applicant.companyName = "C사";
      x.meta.taskTypeLabel = "T";
      x.meta.evaluationPeriod = { from: "2026-01-01", to: "2026-01-02" };
      x.contentSchema = 5;
      x.meta.reportId = "RPT-X";
      x.meta.issuedAt = "2026-01-02 10:00";
    });
    expect(coverInfoGrid(d)).toEqual([
      ["문서 번호", "RPT-X", "발급 일시", "2026-01-02 10:00"],
      ["시험 대상", "M v9", "의뢰자", "C사"],
      ["평가 유형", "T", "시험 기간", "2026-01-01 ~ 2026-01-02"],
      ["발급 방식", "자동 발급 (사람 승인 없음)", "양식 판", "5"],
    ]);
  });
});

describe("시험 결과 요약 줄 = [...coverResultRows, ...coverRows]", () => {
  it("bc_strong — 저장 순서 그대로 4줄", () => {
    const rows = coverSummaryRows(issued);
    expect(rows.map((r) => r.label)).toEqual(["종합 판정", "핵심 지표", "보고 항목", "주요 제약"]);
    expect(rows).toEqual([...issued.edition4Values!.coverResultRows, ...issued.materialCheck!.printed.coverRows!]);
  });

  it("한쪽이 없으면 다른 쪽만, 둘 다 없으면 빈 배열", () => {
    const noResult = copy(issued, (d) => delete d.edition4Values);
    expect(coverSummaryRows(noResult).map((r) => r.label)).toEqual(["보고 항목", "주요 제약"]);
    const noRows = copy(issued, (d) => delete d.materialCheck!.printed.coverRows);
    expect(coverSummaryRows(noRows).map((r) => r.label)).toEqual(["종합 판정", "핵심 지표"]);
    expect(coverSummaryRows(copy(noResult, (d) => delete d.materialCheck))).toEqual([]);
  });
});
