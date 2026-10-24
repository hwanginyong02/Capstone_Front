/**
 * 검증 화면의 판 4 안내(부록 B28·B29, P1) — 생성 전 안내의 기록 문장과 점검 표 재확인 안내의 자리.
 *
 * - B28: 새 성적서가 판 4 로 만들어질 때(검증 화면이 미리 만든 성적서에 찍힌 판 — 판 플래그는 매퍼가 한 번 읽는다)만 판 4 글.
 * - B29: 이 흐름의 마지막 run 이 판 4 run 일 때만 "(표지·1.3·부록 1.2)".
 * - 판 3 글은 한 글자도 바뀌지 않는다(대조군을 함께 단정).
 */
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseDataValidation = vi.fn();
vi.mock("../../../../hooks/useDataValidation", () => ({ useDataValidation: () => mockUseDataValidation() }));
vi.mock("../../../../components/data-validation/DataValidation", () => ({
  DataValidation: ({ notices }: { notices?: ReactNode }) => <div data-testid="validation-content">{notices}</div>,
}));

import { DataValidation } from "../../../../pages/DataValidation";
import { MaterialCheckNotice, materialCheckOutdatedMessage } from "../../../../components/workflow/MaterialCheckNotice";
import { materialCheckFixture } from "../../../../test/materialCheckFixture";
import { NarrativeStatusBanner } from "../../../../components/report/ReportStateNotices";
import { useWorkflowStore } from "../../../../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../../../../utils/stores/useWorkspaceStore";

const ED3_RULE =
  '진행은 막지 않습니다. "다음"을 누르면 이 안내를 확인하고 진행한 것으로 성적서 6.0에 기록됩니다 (점검 표 2.0).';
const ED4_RULE = '진행은 막지 않습니다. "다음"을 누르면 이 안내를 확인하고 진행한 것으로 기록됩니다 (입력 점검 규칙 2.0).';

const ED3_RECHECK =
  "점검 표가 바뀌어(1.0 → 2.0) 다시 확인이 필요합니다. 이 평가의 재료 선택 점검(표지·1.4·6.0)은 옛 점검 표로 만든 것입니다. " +
  '데이터 검증 화면에서 생성 전 안내를 다시 보고 "다음"을 누르면 새 점검 표로 성적서를 다시 만듭니다.';
const ED4_RECHECK =
  "점검 표가 바뀌어(1.0 → 2.0) 다시 확인이 필요합니다. 이 평가의 재료 선택 점검(표지·1.3·부록 1.2)은 옛 점검 표로 만든 것입니다. " +
  '데이터 검증 화면에서 생성 전 안내를 다시 보고 "다음"을 누르면 새 점검 표로 성적서를 다시 만듭니다.';

/** 생성 전 안내 상자의 기록 문장(둘째 p). */
function ruleSentence(): string {
  const region = screen.getByRole("region", { name: "생성 전 안내" });
  const ps = region.querySelectorAll(":scope > p");
  expect(ps.length).toBeGreaterThanOrEqual(2);
  return (ps[1].textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("MaterialCheckNotice 기록 문장(B28)", () => {
  const check = materialCheckFixture({ missingLatencyAndLabel: true, realTime: true });

  it("판 4 면 '성적서 6.0에' 없이 '입력 점검 규칙 {v}'", () => {
    expect(check.warningIds.length).toBeGreaterThan(0);
    render(<MaterialCheckNotice check={check} onFix={() => {}} edition4 />);
    expect(ruleSentence()).toBe(ED4_RULE);
  });

  it("판 3(기본값)은 그대로", () => {
    render(<MaterialCheckNotice check={check} onFix={() => {}} />);
    expect(ruleSentence()).toBe(ED3_RULE);
  });
});

describe("서술 진행 띠(B27)", () => {
  const band = (edition4?: boolean) => {
    const view = render(
      <NarrativeStatusBanner phase="pending" stage="checking" retrying={false} onRetry={() => {}} edition4={edition4} />,
    );
    const text = screen.getByRole("status").textContent;
    view.unmount();
    return text;
  };
  const TAIL = " 아래 지표·차트는 이미 확정된 결과이며, 서술은 끝나는 대로 채워집니다. 그동안 인쇄·발급은 잠깁니다.";

  it("판 4 면 '정성 서술(5·6절)…', 뒤 문장은 판 3 그대로", () => {
    expect(band(true)).toBe(`정성 서술(5·6절)을 만드는 중입니다 — 검사 중.${TAIL}`);
  });

  it("판 3(기본값)은 그대로", () => {
    expect(band()).toBe(`정성 서술(7·8·9절)을 만드는 중입니다 — 검사 중.${TAIL}`);
    expect(band(false)).toBe(`정성 서술(7·8·9절)을 만드는 중입니다 — 검사 중.${TAIL}`);
  });
});

describe("materialCheckOutdatedMessage 자리(B29)", () => {
  it("판 4 면 '(표지·1.3·부록 1.2)', 판 3 은 그대로(두 갈래 모두)", () => {
    expect(materialCheckOutdatedMessage("1.0", true, true)).toBe(ED4_RECHECK);
    expect(materialCheckOutdatedMessage("1.0", true)).toBe(ED3_RECHECK);
    expect(materialCheckOutdatedMessage("1.0", false, true)).toBe(
      "점검 표가 바뀌어(1.0 → 2.0) 다시 확인이 필요합니다. 이 평가의 재료 선택 점검(표지·1.3·부록 1.2)은 옛 점검 표로 만든 것입니다. " +
        "이 평가는 지금 진행 중인 평가 흐름의 결과가 아니어서, 새 점검 표를 적용하려면 같은 입력으로 평가를 새로 해야 합니다.",
    );
  });
});

/* ------------------------------------------------------------------ *
 * 검증 화면 배선 — 생성 전 안내는 미리 만든 성적서의 판, 재확인 안내는 마지막 run 의 판을 읽는다
 * ------------------------------------------------------------------ */
const CHECK = materialCheckFixture({ missingLatencyAndLabel: true, realTime: true });

function renderPage(options: { previewSchema?: number; lastRunSchema?: number; lastRunVersion?: string }) {
  useWorkspaceStore.setState({
    evaluationRuns: [
      {
        id: "run-old",
        reportId: "",
        reportData: {
          meta: { reportId: "" },
          materialCheck: { version: options.lastRunVersion ?? "1.0" },
          ...(options.lastRunSchema ? { contentSchema: options.lastRunSchema } : {}),
        },
      },
    ],
  } as never);
  useWorkflowStore.setState({ lastRunId: "run-old" });
  mockUseDataValidation.mockReturnValue({
    validationData: { error_count: 0 },
    isLoading: false,
    error: null,
    buildEvaluationResult: vi.fn(() => ({
      workflowSnapshot: {},
      reportData: {
        evalScope: { version: "v1" },
        meta: { reportId: "R" },
        materialCheck: CHECK,
        ...(options.previewSchema ? { contentSchema: options.previewSchema } : {}),
      },
    })),
  });
  render(
    <MemoryRouter initialEntries={["/app/data-validation"]}>
      <DataValidation />
    </MemoryRouter>,
  );
}

const recheckText = () => screen.getByRole("region", { name: "점검 표 변경 안내" }).textContent;

describe("검증 화면(DataValidation) — 판 4 안내 배선", () => {
  beforeEach(() => mockUseDataValidation.mockReset());

  it("새 성적서가 판 4 이고 마지막 run 이 판 3 이면: 생성 전 안내만 판 4 글", () => {
    renderPage({ previewSchema: 4, lastRunSchema: 3 });
    expect(ruleSentence()).toBe(ED4_RULE);
    expect(recheckText()).toBe(ED3_RECHECK);
  });

  it("새 성적서가 판 3 이고 마지막 run 이 판 4 이면: 재확인 안내만 판 4 자리", () => {
    renderPage({ previewSchema: 3, lastRunSchema: 4 });
    expect(ruleSentence()).toBe(ED3_RULE);
    expect(recheckText()).toBe(ED4_RECHECK);
  });

  it("판 표시가 없으면(옛 데이터) 둘 다 판 3 글", () => {
    renderPage({});
    expect(ruleSentence()).toBe(ED3_RULE);
    expect(recheckText()).toBe(ED3_RECHECK);
  });
});
