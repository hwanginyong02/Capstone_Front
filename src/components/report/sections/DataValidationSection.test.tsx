/**
 * DataValidationSection — 성적서 6절 '시험 수행 요약' 수치 검증.
 *
 * ISSUES.md E-17 / D-01 — 화면(Report.tsx)은 validationSummary 를 넘기는데
 * 인쇄본(ReportPrint.tsx)은 넘기지 않아, **고객에게 실제로 나가는 산출물인 PDF** 가
 * 폴백값을 인쇄한다. 폴백은 `datasetInfo.sampleCount`, 즉 사용자가 2단계에서 손으로
 * 타이핑한 숫자다. 라벨은 "누락값·오류 제외 후 실제 metric 산출에 사용된 건수" 인데.
 */
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { DataValidationSection } from "./DataValidationSection";
import { materialCheckFixture } from "../../../test/materialCheckFixture";
import type { KpiResult, ValidationResult } from "../../../types/finalReport.types";

const KPIS: KpiResult[] = [
  { metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass" },
];

const VALIDATION: ValidationResult[] = [
  { checkName: "Missing values", detail: "2 rows", status: "warning", group: "common" },
];

/** 6.0 요약 표에서 라벨에 해당하는 값 셀의 텍스트를 읽는다. */
function summaryValue(label: string): string {
  const cell = screen.getByText(label).closest("tr")?.querySelectorAll("td")[1];
  return cell?.textContent ?? "";
}

describe("검증 요약 수치", () => {
  it("[D-01] validationSummary 가 있으면 실측 행 수를 인쇄한다", () => {
    render(
      <DataValidationSection
        dataValidation={VALIDATION}
        kpiResults={KPIS}
        totalSamples={5000} taskTypeLabel="이진 분류"
        validationSummary={{ totalRows: 200, validRows: 198, excludedRows: 2 }}
      />
    );

    expect(summaryValue("총 검증 수행 건수")).toContain("200");
    expect(summaryValue("유효 예측 건수")).toContain("198");
    expect(summaryValue("제외된 샘플 수")).toContain("2");
  });

  it("[E-17] validationSummary 가 없으면 사용자 입력값으로 폴백한다 — 이것이 인쇄본의 실제 증상", () => {
    render(
      <DataValidationSection
        dataValidation={VALIDATION}
        kpiResults={KPIS}
        totalSamples={5000} taskTypeLabel="이진 분류"
      />
    );

    // 5000 은 사용자가 2단계에서 타이핑한 값이지 실제 평가 행 수가 아니다.
    expect(summaryValue("유효 예측 건수")).toContain("5,000");
    expect(summaryValue("제외된 샘플 수")).toContain("0");
  });
});

/**
 * 배선 계약 — 화면과 인쇄본이 같은 근거로 같은 수를 찍어야 한다.
 *
 * 이 결함의 본체는 컴포넌트가 아니라 **두 호출부의 어긋남**이므로, 두 소스에서
 * DataValidationSection 에 넘기는 prop 이름 집합을 직접 대조한다.
 */
function propsPassedTo(component: string, relPath: string): string[] {
  const src = readFileSync(resolve(__dirname, relPath), "utf-8");
  const open = src.indexOf(`<${component}`);
  if (open === -1) throw new Error(`${relPath} 에 <${component}> 사용처가 없다`);
  const close = src.indexOf("/>", open);
  return propNamesIn(src.slice(open + component.length + 1, close));
}

/**
 * JSX 여는 태그 안의 prop 이름. `name={…}`·`name="…"` 뿐 아니라 값 없는 불리언 prop(`<X flag />`)도 잡는다 —
 * 판 3 표시처럼 한쪽만 `flag` 로 넘기면 `=\{` 만 보던 정규식이 놓쳤다(서술 라운드 세션 B).
 * 주석과 값(`{…}`·따옴표)은 먼저 지운다 — 값 안의 낱말(`undefined` …)을 prop 으로 읽지 않게.
 */
function propNamesIn(block: string): string[] {
  let bare = "";
  let depth = 0;
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (depth === 0 && ch === "/" && block[i + 1] === "/") {
      i = block.indexOf("\n", i);
      if (i === -1) break;
      bare += " ";
      continue;
    }
    if (depth === 0 && ch === "/" && block[i + 1] === "*") {
      i = block.indexOf("*/", i) + 1;
      bare += " ";
      continue;
    }
    if (depth === 0 && (ch === '"' || ch === "'")) {
      i = block.indexOf(ch, i + 1);
      bare += " ";
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    else if (depth === 0) bare += ch;
  }
  return [...bare.matchAll(/([A-Za-z_]\w*)\s*=?/g)].map((m) => m[1]).sort();
}

/** 화면 본문의 단일 출처. /report/:id 와 /report/no/:reportNo 가 함께 쓴다. */
const SCREEN = "../ReportSections.tsx";
const PRINT = "../../../pages/report/ReportPrint.tsx";

describe("화면 ↔ 인쇄본 배선", () => {
  it("prop 이름 읽기 — 값 있는 prop, 따옴표 값, 값 없는 불리언 prop 을 모두 잡고 주석·값 안 낱말은 뺀다", () => {
    const block = `
        a={x ? undefined : y.z}
        // 주석 안의 낱말 words
        b="문자열 value"
        flag
        {/* 블록 주석 c */}
        d={{ nested: 1 }} last `;
    expect(propNamesIn(block)).toEqual(["a", "b", "d", "flag", "last"]);
  });

  it("판 3 표시(schema3)를 모든 섹션에 넘긴다 — 화면과 인쇄 양쪽", () => {
    for (const section of ["ReportCoverSection", "CompanyInfoSection", "InterpretSection", "SignatureSection"]) {
      expect(propsPassedTo(section, SCREEN)).toContain("schema3");
      expect(propsPassedTo(section, PRINT)).toContain("schema3");
    }
  });

  it("판 1 보관본 표시(legacyLayout)를 옛 모양 갈래가 있는 섹션에 넘긴다 — 화면과 인쇄 양쪽", () => {
    for (const section of ["CompanyInfoSection", "EvalScopeSection", "DatasetSection", "ChartSection", "ConclusionSection"]) {
      expect(propsPassedTo(section, SCREEN)).toContain("legacyLayout");
      expect(propsPassedTo(section, PRINT)).toContain("legacyLayout");
    }
  });

  it("[E-17] 인쇄본이 화면과 같은 prop 을 DataValidationSection 에 넘긴다", () => {
    const onScreen = propsPassedTo("DataValidationSection", SCREEN);
    const onPrint = propsPassedTo("DataValidationSection", PRINT);

    expect(onScreen).toContain("validationSummary"); // 화면 쪽 전제 확인
    // 옛 발급본의 6.0 묶음 이름은 저장된 유형 이름으로 고른다 — 넘기지 않으면 늘 한국어가 된다(S10 마무리).
    expect(onScreen).toContain("taskTypeLabel");
    expect(onPrint).toEqual(onScreen);
  });

  it("[E-17] 화면과 인쇄본이 같은 섹션 집합을 렌더한다", () => {
    const sectionsIn = (relPath: string) =>
      [
        ...readFileSync(resolve(__dirname, relPath), "utf-8").matchAll(/<(\w+Section)\b/g),
      ]
        .map((m) => m[1])
        .sort();

    expect(sectionsIn(PRINT)).toEqual(sectionsIn(SCREEN));
  });

  // 섹션에 prop 을 더할 때 한쪽만 고치면 화면과 인쇄본이 갈린다. 처음에는 DataValidation 만
  // 대조했으나, 설계 차이 수정 라운드가 여러 섹션에 prop 을 더하므로 모든 섹션으로 넓힌다.
  const screenSections = [
    ...new Set(
      [...readFileSync(resolve(__dirname, SCREEN), "utf-8").matchAll(/<(\w+Section)\b/g)].map((m) => m[1]),
    ),
  ];

  it("대조할 섹션이 실제로 있다(빈 목록이면 아래 대조가 아무것도 검사하지 않는다)", () => {
    expect(screenSections.length).toBeGreaterThan(10);
  });

  it.each(screenSections)("인쇄본이 화면과 같은 prop 을 %s 에 넘긴다", (section) => {
    expect(propsPassedTo(section, PRINT)).toEqual(propsPassedTo(section, SCREEN));
  });
});

describe("6.0 재료 선택 점검 세 줄 (고정 문구 14 · 2.1 한눈에 보기)", () => {
  it("점검 결과가 있으면 보고 항목·목적별 점검·생성 전 안내 확인 줄을 찍는다", () => {
    render(
      <DataValidationSection
        dataValidation={VALIDATION}
        kpiResults={KPIS}
        totalSamples={10} taskTypeLabel="이진 분류"
        materialCheck={materialCheckFixture({ missingLatencyAndLabel: true, realTime: true })}
      />,
    );
    expect(summaryValue("보고 항목 제공")).toBe("11개 중 9개");
    expect(summaryValue("목적별 점검")).toBe("1줄 중 0줄 충족");
    expect(summaryValue("생성 전 안내 확인")).toBe("확인 기록 없음");
    expect(screen.getByText("점검 표 2.0")).toBeInTheDocument();
  });

  it("점검 결과가 없는 옛 성적서에는 세 줄이 없다", () => {
    render(<DataValidationSection dataValidation={VALIDATION} kpiResults={KPIS} totalSamples={10} taskTypeLabel="이진 분류" />);
    expect(screen.queryByText("보고 항목 제공")).not.toBeInTheDocument();
    expect(screen.queryByText("생성 전 안내 확인")).not.toBeInTheDocument();
  });
});

describe("6.0 묶음 이름 — 옛 발급본은 그때 글자 그대로 (W9 발급본, S10 마무리)", () => {
  const ALL_GROUPS: ValidationResult[] = (["common", "multiclass", "binary", "multilabel"] as const).map((group) => ({
    checkName: `${group} check`,
    detail: "-",
    status: "pass" as const,
    group,
  }));

  it("영문 저장값(Binary 등)이면 W9 이전 이름·설명", () => {
    for (const label of ["Binary", "Multi-class", "Multi-label"]) {
      const { unmount } = render(
        <DataValidationSection dataValidation={ALL_GROUPS} kpiResults={KPIS} totalSamples={10} taskTypeLabel={label} />,
      );
      expect(screen.getByText("모든 태스크 유형에 공통 적용")).toBeInTheDocument();
      expect(screen.getByText("다중 분류 검증 항목")).toBeInTheDocument();
      expect(screen.getByText("태스크 유형이 Multiclass인 경우 적용")).toBeInTheDocument();
      expect(screen.getByText("이진 분류 검증 항목")).toBeInTheDocument();
      expect(screen.getByText("태스크 유형이 Binary인 경우 적용")).toBeInTheDocument();
      expect(screen.getByText("다중 레이블 검증 항목")).toBeInTheDocument();
      expect(screen.getByText("태스크 유형이 Multilabel인 경우 적용")).toBeInTheDocument();
      expect(screen.queryByText(/분류 유형이/)).not.toBeInTheDocument();
      unmount();
    }
  });

  it("한국어 저장값이면 한국어 이름·설명", () => {
    render(
      <DataValidationSection dataValidation={ALL_GROUPS} kpiResults={KPIS} totalSamples={10} taskTypeLabel="다중 클래스 분류" />,
    );
    expect(screen.getByText("모든 분류 유형에 공통 적용")).toBeInTheDocument();
    expect(screen.getByText("다중 클래스 분류 검증 항목")).toBeInTheDocument();
    expect(screen.getByText("분류 유형이 다중 클래스 분류인 경우 적용")).toBeInTheDocument();
    expect(screen.getByText("이진 분류 검증 항목")).toBeInTheDocument();
    expect(screen.getByText("분류 유형이 이진 분류인 경우 적용")).toBeInTheDocument();
    expect(screen.getByText("다중 레이블 분류 검증 항목")).toBeInTheDocument();
    expect(screen.getByText("분류 유형이 다중 레이블 분류인 경우 적용")).toBeInTheDocument();
    expect(screen.queryByText(/태스크 유형|Binary|Multiclass|Multilabel/)).not.toBeInTheDocument();
  });
});
