/** 표지 — 표준 문구는 보고 항목 상태대로 바뀐다(서술 설계 › 성적서 고정 문구 2.3). */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReportCoverSection } from "./ReportCoverSection";
import type { FinalReportMeta, PerformerInfo } from "../../../types/finalReport.types";
import { materialCheckFixture } from "../../../test/materialCheckFixture";

const meta = {
  title: "시험성적서",
  reportId: "R-1",
  issuedAt: "2026-10-17",
  taskTypeLabel: "이진 분류",
  evaluationPeriod: { from: "2026-10-01", to: "2026-10-17" },
} as FinalReportMeta;
const performer = { orgName: "기관" } as PerformerInfo;

describe("표지 표준 문구", () => {
  it("보고 항목이 모두 있으면 '기준 표준: ISO/IEC TS 4213:2022'", () => {
    render(<ReportCoverSection meta={meta} performer={performer} materialCheck={materialCheckFixture()} />);
    expect(screen.getByText("기준 표준: ISO/IEC TS 4213:2022")).toBeInTheDocument();
  });

  it("빠진 것이 있으면 '…에 따라 평가. 일부 보고 항목 미제공(1.4 참조)'", () => {
    render(
      <ReportCoverSection
        meta={meta}
        performer={performer}
        materialCheck={materialCheckFixture({ missingLatencyAndLabel: true })}
      />,
    );
    expect(screen.getByText("ISO/IEC TS 4213:2022에 따라 평가. 일부 보고 항목 미제공(1.4 참조)")).toBeInTheDocument();
    expect(screen.queryByText("기준 표준: ISO/IEC TS 4213:2022")).not.toBeInTheDocument();
  });

  it("점검 결과가 없는 옛 성적서는 종전 문구", () => {
    render(<ReportCoverSection meta={meta} performer={performer} />);
    expect(screen.getByText("기준 표준: ISO/IEC TS 4213:2022")).toBeInTheDocument();
  });
});
