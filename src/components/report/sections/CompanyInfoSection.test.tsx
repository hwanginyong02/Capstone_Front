/** 1절 개요 — 신청인 표, 시험결과서 용도 표. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { CompanyInfoSection } from "./CompanyInfoSection";
import { materialCheckFixture } from "../../../test/materialCheckFixture";
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

describe("1.4 제약사항 — constraintsFor 한 곳에서 조립 (고정 문구 13·14)", () => {
  const items = () => screen.getAllByRole("listitem").filter((li) => /^\d+\./.test(li.textContent ?? ""));
  const titles = () => items().map((li) => li.querySelector("strong")?.textContent);

  function renderWith(
    materialCheck?: Parameters<typeof CompanyInfoSection>[0]["materialCheck"],
    hasConfidenceIntervals?: boolean,
    schema3?: boolean,
  ) {
    render(
      <CompanyInfoSection
        applicant={applicant}
        performer={performer}
        evalScope={scope}
        meta={meta}
        materialCheck={materialCheck}
        hasConfidenceIntervals={hasConfidenceIntervals}
        schema3={schema3}
      />,
    );
  }

  it("점검 결과가 없는 옛 성적서는 종전 4항목 그대로", () => {
    renderWith(undefined);
    expect(titles()).toEqual([
      "데이터 기반 평가의 국한성:",
      "결과서 효력의 한계:",
      "자동화 진단 소견에 대한 면책:",
      "LLM 생성 소견에 대한 면책:",
    ]);
  });

  it("모두 제공된 새 성적서는 4항목 뒤에 고정 문구 13 만 더한다", () => {
    renderWith(materialCheckFixture());
    expect(titles()).toHaveLength(5);
    expect(titles()[4]).toBe("의뢰자 제공 정보에 대한 전제:");
    expect(items()[4].textContent).toContain(
      "본 결과서는 의뢰자가 제공한 데이터와 정보를 바탕으로 작성되었다. 제공된 내용이 사실과 다르면 본 결과서의 결과와 해석은 유효하지 않다.",
    );
  });

  it("빠진 항목이 있으면 '제공되지 않은 정보' 문장 바로 아래에 항목별 영향 문장, 그 뒤 목적별 미충족", () => {
    renderWith(materialCheckFixture({ missingLatencyAndLabel: true, realTime: true }));
    expect(titles()).toEqual([
      "데이터 기반 평가의 국한성:",
      "결과서 효력의 한계:",
      "자동화 진단 소견에 대한 면책:",
      "LLM 생성 소견에 대한 면책:",
      "의뢰자 제공 정보에 대한 전제:",
      "제공되지 않은 정보:",
      "목적별 점검 미충족:",
    ]);
    expect(items()[5].textContent).toContain(
      "ISO/IEC TS 4213이 보고를 요구하는 항목 중 정답 라벨 구축 방법, 추론 효율성(지연시간)은 의뢰자로부터 제공받지 못해",
    );
    const impacts = screen.getByRole("list", { name: "제공되지 않은 정보 세부" });
    expect([...impacts.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "정답 라벨 구축 방법: 정답 라벨을 얼마나 믿을 수 있는지 판단할 수 없다.",
      "추론 효율성(지연시간): 응답 속도가 용도에 맞는지 판단할 수 없다.",
    ]);
    const shortfalls = screen.getByRole("list", { name: "목적별 점검 미충족 세부" });
    expect(shortfalls.querySelectorAll("li")).toHaveLength(1);
    expect(shortfalls.textContent).toContain('사용 방식을 "대화형(실시간)"으로 밝혔으나');
  });

  const FIXED_PHRASE_3 = "단일 모델 평가라 통계적 유의성 검정은 적용하지 않았고, 대신 주요 지표의 신뢰구간을 제시한다.";

  it("신뢰구간이 있는 성적서는 고정 문구 13 바로 다음에 고정 문구 3, 그 뒤 제공되지 않은 정보", () => {
    renderWith(materialCheckFixture({ missingLatencyAndLabel: true, realTime: true }), true);
    expect(titles()).toEqual([
      "데이터 기반 평가의 국한성:",
      "결과서 효력의 한계:",
      "자동화 진단 소견에 대한 면책:",
      "LLM 생성 소견에 대한 면책:",
      "의뢰자 제공 정보에 대한 전제:",
      "통계적 유의성 검정:",
      "제공되지 않은 정보:",
      "목적별 점검 미충족:",
    ]);
    expect(items()[5].textContent).toContain(FIXED_PHRASE_3);
  });

  it("신뢰구간이 없는 성적서에는 고정 문구 3 이 없다", () => {
    renderWith(materialCheckFixture(), false);
    expect(titles()).toHaveLength(5);
    expect(screen.queryByText(new RegExp(FIXED_PHRASE_3))).not.toBeInTheDocument();
  });

  it("점검 결과가 없는 성적서에 신뢰구간만 있으면 종전 4항목 뒤에 고정 문구 3", () => {
    renderWith(undefined, true);
    expect(titles()).toHaveLength(5);
    expect(titles()[4]).toBe("통계적 유의성 검정:");
  });

  // 판 3 본문에서 AI/LLM 표현을 뺀다(서술 라운드 세션 B, 사용자 결정 2) — 판 2 는 그대로. 점검 결과 있음/없음·신뢰구간 있음 세 꼴.
  const LLM_TITLE = "LLM 생성 소견에 대한 면책:";
  const CASES: Array<[name: string, mc: Parameters<typeof CompanyInfoSection>[0]["materialCheck"], ci: boolean, oldCount: number]> = [
    ["점검 결과 없음", undefined, false, 4],
    ["모두 제공", materialCheckFixture(), false, 5],
    ["빠진 항목·신뢰구간", materialCheckFixture({ missingLatencyAndLabel: true, realTime: true }), true, 8],
  ];

  it.each(CASES)("판 2 — %s: 'LLM 생성 소견에 대한 면책' 이 넷째 항목으로 있다", (_name, mc, ci, oldCount) => {
    renderWith(mc, ci, false);
    expect(titles()).toHaveLength(oldCount);
    expect(titles()[3]).toBe(LLM_TITLE);
  });

  it.each(CASES)("판 3 — %s: 'LLM 생성 소견에 대한 면책' 만 빠지고 '자동화 진단 소견에 대한 면책' 은 남는다", (_name, mc, ci, oldCount) => {
    renderWith(mc, ci, true);
    expect(titles()).toHaveLength(oldCount - 1);
    expect(titles()).not.toContain(LLM_TITLE);
    expect(titles().slice(0, 3)).toEqual([
      "데이터 기반 평가의 국한성:",
      "결과서 효력의 한계:",
      "자동화 진단 소견에 대한 면책:",
    ]);
    expect(screen.queryByText(/LLM\(Large Language Model\)/)).not.toBeInTheDocument();
  });
});

describe("1.2 평가 의뢰일 이름표 (B1③)", () => {
  it("화면 칸과 같은 '평가 의뢰일' 한 줄, '계약일자'는 없다", () => {
    render(
      <CompanyInfoSection
        applicant={applicant}
        performer={performer}
        evalScope={scope}
        meta={{ ...meta, contractDate: "2026-10-01" }}
      />,
    );
    expect(screen.getAllByRole("cell").filter((td) => td.textContent === "평가 의뢰일")).toHaveLength(1);
    expect(rowValue("평가 의뢰일")).toBe("2026-10-01");
    expect(screen.queryByText("계약일자")).not.toBeInTheDocument();
  });
});

/**
 * 판 1 보관본(운영 main 이 발급, `legacyLayout`)은 발급 당시 1절 모양 그대로 — 판 3 은 새 모양.
 * 정답 글은 main 코드가 그린 것(`src/test/archive/main_d38890d/`)과 같다.
 */
describe("1절 — 판 1 보관본은 운영 main 모양, 판 3 은 새 모양", () => {
  function renderLegacyOr3(legacyLayout: boolean, over: { applicant?: Partial<ApplicantInfo>; evalScope?: Partial<EvalScope> } = {}) {
    render(
      <CompanyInfoSection
        applicant={{ ...applicant, ...over.applicant }}
        performer={performer}
        evalScope={{ ...scope, ...over.evalScope }}
        meta={{ ...meta, contractDate: "2026-10-01" }}
        schema3={!legacyLayout}
        legacyLayout={legacyLayout}
      />,
    );
  }
  const project = {
    reportPurposeKey: "project" as const,
    projectInfo: { name: "AI 과제", agency: "정보통신기획평가원", projectNumber: "2026-0001" },
  };

  it("판 1 — '계약일자'·'외부 제출용', 빈 FAX·홈페이지 줄도 찍는다", () => {
    renderLegacyOr3(true, { applicant: { fax: "", homepage: "" } });
    expect(rowValue("계약일자")).toBe("2026-10-01");
    expect(rowValue("평가 의뢰일")).toBeNull();
    expect(rowValue("용도")).toBe("외부 제출용");
    expect(rowValue("FAX번호")).toBe("");
    expect(rowValue("홈페이지")).toBe("");
  });

  it("판 3 — '평가 의뢰일'·'외부 제출', 빈 FAX·홈페이지 줄은 뺀다", () => {
    renderLegacyOr3(false, { applicant: { fax: "", homepage: "" } });
    expect(rowValue("평가 의뢰일")).toBe("2026-10-01");
    expect(rowValue("계약일자")).toBeNull();
    expect(rowValue("용도")).toBe("외부 제출");
    expect(rowValue("FAX번호")).toBeNull();
    expect(rowValue("홈페이지")).toBeNull();
  });

  it("판 1 — 과제 칸은 '프로젝트 산출물'·'프로젝트명'·'주관기관'·'과제번호'", () => {
    renderLegacyOr3(true, { evalScope: project });
    expect(rowValue("용도")).toBe("프로젝트 산출물");
    expect(rowValue("프로젝트명")).toBe("AI 과제");
    expect(rowValue("주관기관")).toBe("정보통신기획평가원");
    expect(rowValue("과제번호")).toBe("2026-0001");
    expect(rowValue("과제명")).toBeNull();
  });

  it("판 3 — 과제 칸은 '과제 산출물'·'과제명'·'과제 기관'·'과제 번호'", () => {
    renderLegacyOr3(false, { evalScope: project });
    expect(rowValue("용도")).toBe("과제 산출물");
    expect(rowValue("과제명")).toBe("AI 과제");
    expect(rowValue("과제 기관")).toBe("정보통신기획평가원");
    expect(rowValue("과제 번호")).toBe("2026-0001");
    expect(rowValue("프로젝트명")).toBeNull();
  });

  it("1.4 — 판 1 은 문장을 번호 옆 한 덩이(span)로, 판 3 은 문단(p)으로", () => {
    const { unmount } = render(
      <CompanyInfoSection applicant={applicant} performer={performer} evalScope={scope} meta={meta} legacyLayout />,
    );
    expect(screen.getByText("데이터 기반 평가의 국한성:").parentElement!.tagName).toBe("SPAN");
    unmount();
    renderLegacyOr3(false);
    expect(screen.getByText("데이터 기반 평가의 국한성:").parentElement!.tagName).toBe("P");
  });
});
