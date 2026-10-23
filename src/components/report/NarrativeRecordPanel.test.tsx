/** 작성 기록 상자(서술 라운드 세션 B, 사용자 결정 4) — 그리는 조건과 줄 이름. 화면 경로 배선은 `test/archive/schema3Layout.test.tsx`. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NarrativeRecordPanel, narrativeRecordLabel, showsNarrativeRecord } from "./NarrativeRecordPanel";
import type { FinalReportData } from "../../types/finalReport.types";

function report(over: Partial<FinalReportData> = {}): FinalReportData {
  return {
    contentSchema: 3,
    narrativeSource: "llm",
    narrativeSections: { "7.1": "llm", "8.1": "fallback", "9": "fixed" },
    narrativeModels: { "7.1": "model-a", "8.1": null, "9": null },
    ...over,
  } as FinalReportData;
}

const rows = () => screen.getAllByRole("listitem").map((li) => li.textContent);

describe("작성 기록 — 줄 이름", () => {
  it("AI 칸은 모델 이름, 모델이 없으면(null·키 없음) 'AI 작성' 만", () => {
    expect(narrativeRecordLabel("llm", "model-a")).toBe("AI 작성(model-a)");
    expect(narrativeRecordLabel("llm", null)).toBe("AI 작성");
    expect(narrativeRecordLabel("llm", undefined)).toBe("AI 작성");
    expect(narrativeRecordLabel("fallback", "model-a")).toBe("규칙 기반 문장");
    expect(narrativeRecordLabel("fixed", null)).toBe("고정 문구");
  });

  it("칸 순서대로, 모델 기록이 없는 성적서는 AI 칸이 'AI 작성' 만", () => {
    render(<NarrativeRecordPanel data={report({ narrativeModels: undefined })} />);
    expect(rows()).toEqual([
      "7.1 혼동 행렬 기반 클래스 간 간섭 분석 — AI 작성",
      "8.1 도메인 성능 벤치마크 — 규칙 기반 문장",
      "9 기술 개선 권고안 — 고정 문구",
    ]);
  });

  it("모르는 칸 번호도 버리지 않고 뒤에 붙인다", () => {
    render(<NarrativeRecordPanel data={report({ narrativeSections: { "9": "fixed", "10.1": "llm", "7.1": "llm" } })} />);
    expect(rows()).toEqual([
      "7.1 혼동 행렬 기반 클래스 간 간섭 분석 — AI 작성(model-a)",
      "9 기술 개선 권고안 — 고정 문구",
      "10.1 — AI 작성",
    ]);
  });
});

describe("작성 기록 — 그리는 조건(장치마다 따로)", () => {
  it("판 3·서술 끝남·칸별 출처 있음이면 그린다", () => {
    expect(showsNarrativeRecord(report())).toBe(true);
    render(<NarrativeRecordPanel data={report()} />);
    expect(screen.getByRole("group", { name: "작성 기록" })).toHaveClass("print:hidden");
  });

  it("판 2(칸별 출처가 있어도)·판 표시 없음(판 1)은 그리지 않는다", () => {
    expect(showsNarrativeRecord(report({ contentSchema: 2 }))).toBe(false);
    expect(showsNarrativeRecord(report({ contentSchema: undefined }))).toBe(false);
    const { container } = render(<NarrativeRecordPanel data={report({ contentSchema: 2 })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each(["pending", "failed"] as const)("서술 %s(화면 출처)면 낡은 칸별 출처로 그리지 않는다", (source) => {
    expect(showsNarrativeRecord(report({ narrativeSource: source }))).toBe(false);
  });

  it("규칙 기반 성적서(narrativeSource fallback)도 끝난 서술이라 그린다", () => {
    expect(showsNarrativeRecord(report({ narrativeSource: "fallback" }))).toBe(true);
  });

  it("칸별 출처가 없거나 비었으면 그리지 않는다", () => {
    expect(showsNarrativeRecord(report({ narrativeSections: undefined }))).toBe(false);
    expect(showsNarrativeRecord(report({ narrativeSections: {} }))).toBe(false);
  });
});
