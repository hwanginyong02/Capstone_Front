/**
 * 인쇄 화면(서술 라운드 S3b) — 저장된 완성본만 인쇄한다. 평가·서술 작업을 시작하지 않는다.
 */
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RUN_ID, renderPrintPage, resetAll, seedStores, storedRun, stubFetch, workflowSnapshot } from "../../hooks/reportJob.harness";
import { mapWorkflowToFinalReport } from "../../lib/report/mapWorkflowToFinalReport";
import { useWorkspaceStore } from "../../utils/stores/useWorkspaceStore";

let print: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetAll();
  print = vi.fn();
  vi.stubGlobal("print", print);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetAll();
});

function setNarrative(isEvaluated: boolean, narrative?: any) {
  const report = mapWorkflowToFinalReport(workflowSnapshot());
  useWorkspaceStore.getState().updateRun(RUN_ID, (r) => ({ ...r, reportData: { ...report, isEvaluated }, narrative }));
}

describe("인쇄 화면", () => {
  it("서술을 기다리는 중이면 인쇄하지 않고 이유를 말한다 — 평가·작업도 부르지 않는다(파일이 메모리에 있어도)", async () => {
    const fetchStub = stubFetch();
    seedStores();
    setNarrative(false, { status: "pending", jobId: "job-1", startedAt: new Date().toISOString() });
    const { container } = renderPrintPage();
    expect(await screen.findByText("서술이 끝나지 않아 인쇄할 수 없습니다")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 400));
    expect(print).not.toHaveBeenCalled();
    expect(container.querySelector("[data-pdf-ready]")).toBeNull();
    expect(fetchStub.calls).toEqual([]);
  });

  it.each([
    ["실패", { status: "failed", jobId: "job-1", failure: "timeout" }, false],
    ["평가 전 초안", undefined, false],
  ])("%s 성적서도 인쇄하지 않는다", async (_name, narrative, isEvaluated) => {
    stubFetch();
    seedStores({ rawFile: null });
    setNarrative(isEvaluated as boolean, narrative);
    renderPrintPage();
    expect(await screen.findByText("서술이 끝나지 않아 인쇄할 수 없습니다")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 400));
    expect(print).not.toHaveBeenCalled();
  });

  it("완성본이면 인쇄한다", async () => {
    stubFetch();
    seedStores({ rawFile: null });
    setNarrative(true, { status: "done", jobId: "job-1" });
    const { container } = renderPrintPage();
    await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(container.querySelector('[data-pdf-ready="true"]')).not.toBeNull();
    expect(storedRun()!.reportData.isEvaluated).toBe(true);
  });

  it("서술 칸이 없는 옛 완성본(판 2 이전)도 인쇄한다", async () => {
    stubFetch();
    seedStores({ rawFile: null });
    setNarrative(true, undefined);
    renderPrintPage();
    await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  });

  it("없는 id 는 찾을 수 없음", async () => {
    stubFetch();
    seedStores({ withoutRun: true });
    renderPrintPage("run-nope");
    expect(await screen.findByText("성적서를 찾을 수 없습니다")).toBeInTheDocument();
    expect(print).not.toHaveBeenCalled();
  });
});
