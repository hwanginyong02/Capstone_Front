/** 1절 개요 — 신청인 표, 시험결과서 용도 표. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { CompanyInfoSection } from "./CompanyInfoSection";
import type {
  ApplicantInfo,
  EvalScope,
  FinalReportMeta,
  PerformerInfo,
} from "../../../types/finalReport.types";

const applicant: ApplicantInfo = {
  companyName: "테스트기업",
  representative: "홍길동",
  businessNumber: "123-45-67890",
  contact: "02-1234-5678",
  fax: "02-1234-5679",
  homepage: "https://example.com",
  address: "서울",
};

const performer = { orgName: "기관", evaluator: "평가자", contact: "010" } as PerformerInfo;
const meta = { reportId: "r1", title: "t", issuedAt: "" } as FinalReportMeta;
const scope = {
  purpose: "p",
  targetModel: "M",
  version: "v1",
  scope: "s",
  reportPurposeKey: "external",
} as EvalScope;

function renderSection(over: { applicant?: Partial<ApplicantInfo>; evalScope?: Partial<EvalScope> } = {}) {
  render(
    <CompanyInfoSection
      applicant={{ ...applicant, ...over.applicant }}
      performer={performer}
      evalScope={{ ...scope, ...over.evalScope }}
      meta={meta}
    />,
  );
}

/** 표에서 그 이름표 줄의 값. 줄이 없으면 null. */
function rowValue(label: string): string | null {
  const cell = screen.queryAllByRole("cell").find((td) => td.textContent === label);
  return cell?.nextElementSibling?.textContent ?? null;
}

describe("1.3 시험결과서 용도 — 과제 번호 (재료 목록 1절: 용도와 무관한 선택 항목)", () => {
  it("용도가 과제 산출물이 아니어도 과제 번호가 있으면 찍는다", () => {
    renderSection({ evalScope: { reportPurposeKey: "external", projectNumber: "ML-2026-001" } });

    expect(rowValue("과제 번호")).toBe("ML-2026-001");
    expect(rowValue("과제명")).toBeNull();
  });

  it("과제 산출물이면 과제명·과제 기관과 함께 찍는다", () => {
    renderSection({
      evalScope: {
        reportPurposeKey: "project",
        projectNumber: "P-1",
        projectInfo: { name: "AI 과제", agency: "과제 기관 A" },
      },
    });

    expect(rowValue("과제명")).toBe("AI 과제");
    expect(rowValue("과제 기관")).toBe("과제 기관 A");
    expect(rowValue("과제 번호")).toBe("P-1");
  });

  it("이 칸이 생기기 전 보관본은 projectInfo 안의 번호를 찍는다", () => {
    renderSection({
      evalScope: {
        reportPurposeKey: "project",
        projectInfo: { name: "옛 과제", agency: "기관", projectNumber: "OLD-9" },
      },
    });

    expect(rowValue("과제 번호")).toBe("OLD-9");
  });

  it("번호가 없으면 줄이 없다", () => {
    renderSection();

    expect(rowValue("과제 번호")).toBeNull();
  });
});
