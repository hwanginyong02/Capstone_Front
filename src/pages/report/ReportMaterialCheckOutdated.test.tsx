/**
 * 성적서 화면의 "점검 표 변경 안내"(점검 표 2.0) — 진행 중인 run 의 재료 선택 점검이 옛 점검 표로 만든 것이면
 * 다시 확인하라고 알린다. 점검 결과는 run 을 만들 때 저장되고 성적서 화면은 다시 계산하지 않는다. 실제 `<Report />`
 * 를 하네스로 그린다(fetch 만 가짜).
 */
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { doneView, fastPolling, renderReportPage, resetAll, seedStores, stubFetch, workflowSnapshot } from "../../hooks/reportJob.harness";
import { mapWorkflowToFinalReport } from "../../lib/report/mapWorkflowToFinalReport";
import { MATERIAL_CHECK_VERSION } from "../../lib/report/materialCheck";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";
import { materialCheckOutdatedMessage } from "../../components/workflow/MaterialCheckNotice";
import { materialCheckFixture } from "../../test/materialCheckFixture";

let restorePolling: () => void;
beforeEach(() => {
  resetAll();
  restorePolling = fastPolling();
});
afterEach(() => {
  restorePolling();
  vi.unstubAllGlobals();
  resetAll();
});

function draftWithCheckVersion(version: string) {
  const draft = mapWorkflowToFinalReport(workflowSnapshot());
  return { ...draft, materialCheck: { ...materialCheckFixture(), version } };
}

describe("점검 표 변경 안내", () => {
  it("발급 전·지금 흐름의 run(lastRunId)이 1.0 이면 '다음을 누르면 다시 만든다'고 안내한다", async () => {
    stubFetch({ views: [{ body: doneView() }] });
    seedStores({ run: { reportData: draftWithCheckVersion("1.0") } });
    renderReportPage();
    const region = await screen.findByRole("region", { name: "점검 표 변경 안내" });
    expect(region).toHaveTextContent("1.0 → 2.0");
    expect(region).toHaveTextContent(materialCheckOutdatedMessage("1.0", true));
    expect(region).toHaveTextContent(/"다음"을 누르면 새 점검 표로 성적서를 다시 만듭니다/);
  });

  it("발급 전이지만 지금 흐름의 run 이 아니면(워크스페이스에서 연 다른 run) 새로 평가해야 한다는 사실만", async () => {
    stubFetch({ views: [{ body: doneView() }] });
    seedStores({ run: { reportData: draftWithCheckVersion("1.0") } });
    useWorkflowStore.setState({ lastRunId: "run-other" });
    renderReportPage();
    const region = await screen.findByRole("region", { name: "점검 표 변경 안내" });
    expect(region).toHaveTextContent(materialCheckOutdatedMessage("1.0", false));
    expect(region).toHaveTextContent(/같은 입력으로 평가를 새로 해야 합니다/);
    expect(region).not.toHaveTextContent(/누르면/);
  });

  it("발급된 성적서(번호 있음)는 1.0 이어도 안내하지 않는다(발급 당시 모양 그대로)", async () => {
    stubFetch({ views: [{ body: doneView() }] });
    const draft = draftWithCheckVersion("1.0");
    const issuedDraft = { ...draft, meta: { ...draft.meta, reportId: "RPT-2026-0001" } };
    seedStores({ run: { reportId: "RPT-2026-0001", reportData: issuedDraft } });
    renderReportPage();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("region", { name: "점검 표 변경 안내" })).toBeNull();
  });

  it("지금 버전으로 만든 run 이면 안내하지 않는다", async () => {
    stubFetch({ views: [{ body: doneView() }] });
    seedStores({ run: { reportData: draftWithCheckVersion(MATERIAL_CHECK_VERSION) } });
    renderReportPage();
    await screen.findByRole("button", { name: /PDF 다운로드/ });
    expect(screen.queryByRole("region", { name: "점검 표 변경 안내" })).toBeNull();
  });
});
