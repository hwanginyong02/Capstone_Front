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

describe("1.2 신청인 표 — 팩스·홈페이지 (재료 목록 1절: 점검 밖 선택 항목)", () => {
  it("비었으면 줄을 만들지 않는다", () => {
    renderSection({ applicant: { fax: "", homepage: "" } });

    expect(rowValue("FAX번호")).toBeNull();
    expect(rowValue("홈페이지")).toBeNull();
    expect(rowValue("회사명")).toBe("테스트기업"); // 표 자체는 그려졌다
  });

  it("값이 있는 것만 찍는다", () => {
    renderSection({ applicant: { fax: "", homepage: "https://a.example" } });

    expect(rowValue("FAX번호")).toBeNull();
    expect(rowValue("홈페이지")).toBe("https://a.example");
  });

  it("이전 보관본의 '—' 는 발급 당시처럼 줄을 찍는다", () => {
    renderSection({ applicant: { fax: "—", homepage: "—" } });

    expect(rowValue("FAX번호")).toBe("—");
    expect(rowValue("홈페이지")).toBe("—");
  });
});

describe("1.3 용도 이름 — 화면 선택지와 같은 이름(DESIGN_GAPS R6)", () => {
  it.each([
    ["internal", "내부 검증"],
    ["external", "외부 제출"],
    ["project", "과제 산출물"],
  ] as const)("%s 는 '%s'", (key, label) => {
    renderSection({ evalScope: { reportPurposeKey: key } });

    expect(rowValue("용도")).toBe(label);
  });

  it("재료 등록부의 선택지 이름과 성적서 이름이 같다", async () => {
    const { getCard } = await import("../../../data/reportComposer");
    const { REPORT_PURPOSE_LABEL } = await import("../../../lib/report/reportConstants");
    const field = getCard("clientInfo").fields.find((f) => f.id === "reportPurpose");
    const screenNames = Object.values(field?.choiceLabels ?? {}).sort();

    expect(screenNames.length).toBe(3);
    expect(Object.values(REPORT_PURPOSE_LABEL).sort()).toEqual(screenNames);
  });
});
