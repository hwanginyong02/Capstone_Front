/**
 * 옛 빈 서술 성적서 안내(서술 라운드 세션 B, 남은 일) — 지금 실제로 할 수 있는 일만 말한다.
 * 같은 번호로 서술을 다시 만들어 정정 발급하는 길은 없다: 무엇이 비었는지, 왜 이 화면에서 못 고치는지,
 * 할 수 있는 일(같은 파일로 다시 평가해 새 성적서 — 옛 번호 성적서는 그대로 남음).
 */
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderReportPage, resetAll, seedStores } from "../../hooks/reportJob.harness";
import { ISSUED_EMPTY_NARRATIVE_TEXT } from "./ReportStateNotices";
import type { FinalReportData } from "../../types/finalReport.types";
import schema2Binary from "../../test/archive/schema2_binary.json";

const WHAT = "이 성적서는 7·8·9절 서술(정밀 분석·종합 진단 소견·기술 개선 권고)이 비어 있는 채로 발급됐습니다.";
const WHY =
  "발급된 성적서는 고칠 수 없고, 이 평가는 서술 작업 기록이 남아 있지 않은 이전 판 평가라 이 화면에서 서술을 다시 만들 수 없습니다. " +
  "그래서 같은 번호로 서술을 채워 정정 발급할 수 없습니다 — 정정 발급을 해도 빈 서술이 그대로 다시 발급됩니다.";
const TODO =
  "서술이 있는 성적서가 필요하면 데이터 검증 화면에서 같은 파일로 다시 평가해 새 성적서를 발급해 주세요. " +
  "새 성적서는 새 번호를 받고, 지금 번호의 성적서는 서버 보관본 그대로 남습니다.";

/** 서술이 빈 채 발급된 옛 run(이행 표시) — 서술 작업 기록(narrative)·평가 요청 기록이 없다. */
function seedIssuedEmpty(migrationNote?: "issued_empty_narrative") {
  const data = structuredClone(schema2Binary) as unknown as FinalReportData;
  const empty: FinalReportData = {
    ...data,
    isEvaluated: true,
    meta: { ...data.meta, reportId: "RPT-2026-0001", issuedAt: "2026-09-01 10:00" },
    interpretation: { confusionAnalysis: "", distributionAnalysis: "" } as FinalReportData["interpretation"],
  };
  seedStores({ rawFile: null, run: { reportData: empty, evaluationRequest: undefined, narrative: undefined, migrationNote } });
}

beforeEach(() => {
  resetAll();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      throw new Error(`요청하면 안 된다 ${String(input)}`);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetAll();
});

describe("옛 빈 서술 성적서 안내", () => {
  it("문구 — 무엇이 비었는지·왜 못 고치는지·할 수 있는 일", () => {
    expect(ISSUED_EMPTY_NARRATIVE_TEXT).toEqual({ what: WHAT, why: WHY, todo: TODO });
  });

  it("이행 표시가 있는 run 의 성적서 화면에 세 문장과 검증 화면 링크를 찍는다", async () => {
    seedIssuedEmpty("issued_empty_narrative");
    renderReportPage();
    expect(await screen.findByText(WHAT)).toBeInTheDocument();
    expect(screen.getByText(WHY)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(TODO.replace(/[.()]/g, "\\$&")))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "검증 화면으로 이동" })).toHaveAttribute("href", "/app/data-validation");
    // 옛 안내의 "길은 아직 없습니다"·"정정 발급으로만 고칠 수" 는 없다(지금 있는 길처럼 읽혔다).
    expect(screen.queryByText(/길은 아직 없습니다/)).not.toBeInTheDocument();
  });

  it("이행 표시가 없으면 안내가 없다", async () => {
    seedIssuedEmpty(undefined);
    renderReportPage();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText(WHAT)).not.toBeInTheDocument();
  });
});
