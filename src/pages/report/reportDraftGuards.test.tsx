/**
 * 초안 성적서가 **산출물이 되는 것**을 막는 두 가드 — ISSUES.md H-03 파생.
 *
 * H-03 하네스를 만들면서 드러난 결함 둘이다. 둘 다 대장에 없었고, 둘 다 평범한 동선이다.
 *
 * ① **인쇄 탭이 초안을 자동 인쇄한다.** 서버는 PDF 를 만들지 않으므로(F-05, ★결정 8)
 *    브라우저 인쇄물이 **최종 산출물**이다. 그런데 인쇄 탭은 새 문서라 워크플로우
 *    store 의 `rawFile`(File 객체 — persist 불가)이 없고, 그래서 저장된
 *    `run.reportData` 를 렌더한다. 서술 병합이 끝나기 전이면 그것은 초안이고,
 *    초안의 판정은 `buildConclusion([])` 의 기본값 "조건부 적합 / 0.0%" 다.
 *    `usePrintOnReady` 가 그것을 **자동으로** 인쇄 다이얼로그까지 띄웠다.
 *    그 창은 평가마다 서술 병합 구간(최대 160초) 내내 열려 있었다.
 *
 * ② **없는 run 을 열면 백지가 나온다.** `Report.tsx` 가 `if (!data) return null` 이라
 *    지워진 run 의 링크·북마크가 아무 설명 없는 흰 화면이 됐다.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Report } from "./Report";
import { ReportPrint } from "./ReportPrint";
import {
  RUN_ID,
  evaluatedReport,
  resetStores,
  seedStores,
  stubFetch,
} from "../../hooks/useReportData.harness";

let printSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetStores();
  stubFetch();
  // jsdom 에는 window.print 가 없다(호출하면 'Not implemented' 를 던진다).
  printSpy = vi.fn();
  vi.stubGlobal("print", printSpy);
  // recharts ResponsiveContainer 가 요구한다. 없으면 렌더가 죽어 다른 절도 볼 수 없다.
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetStores();
});

function renderPrint(id: string = RUN_ID) {
  return render(
    <MemoryRouter initialEntries={[`/report/${id}/print`]}>
      <Routes>
        <Route path="/report/:id/print" element={<ReportPrint />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderReport(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/report/${id}`]}>
      <Routes>
        <Route path="/report/:id" element={<Report />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** 인쇄 훅은 rAF → setTimeout(300) 순서로 인쇄한다. 그 예산을 결정론적으로 소진한다. */
async function letPrintFire() {
  await vi.advanceTimersByTimeAsync(500);
}

describe("[H-03 파생] 초안은 인쇄되지 않는다", () => {
  it("미평가 초안은 인쇄 다이얼로그를 띄우지 않고 이유를 말한다", async () => {
    vi.useFakeTimers();
    // 인쇄 탭의 실제 상태: run 은 저장돼 있지만 rawFile 이 없다(File 은 persist 불가).
    seedStores({ workflow: { rawFile: null } });

    renderPrint();
    await letPrintFire();

    expect(printSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/아직 인쇄할 수 없는 성적서입니다/)).toBeVisible();
    // 성적서 본문이 아예 렌더되지 않아야 한다 — 초안의 빈 지표표가 인쇄물이 되는 것이
    // 이 결함의 본체다. 6절 KPI 표의 열 머리글로 판정한다(안내문에는 없는 문자열).
    expect(screen.queryByText("산출 결과")).toBeNull();
    expect(screen.queryByText("합격 기준")).toBeNull();
  });

  it("완성본은 그대로 인쇄된다 (가드가 정상 경로를 막지 않는다)", async () => {
    vi.useFakeTimers();
    seedStores({ workflow: { rawFile: null }, run: { reportData: evaluatedReport() } });

    renderPrint();
    await letPrintFire();

    expect(printSpy).toHaveBeenCalled();
    expect(screen.queryByText(/아직 인쇄할 수 없는 성적서입니다/)).toBeNull();
  });

  it("완성본 인쇄 컨테이너에는 Puppeteer 대기용 표식이 붙는다", async () => {
    vi.useFakeTimers();
    seedStores({ workflow: { rawFile: null }, run: { reportData: evaluatedReport() } });

    const { container } = renderPrint();
    await letPrintFire();

    expect(container.querySelector('[data-pdf-ready="true"]')).not.toBeNull();
  });

  it("초안에는 그 표식이 붙지 않는다 — Puppeteer 가 초안을 캡처하지 않게", async () => {
    vi.useFakeTimers();
    seedStores({ workflow: { rawFile: null } });

    const { container } = renderPrint();
    await letPrintFire();

    expect(container.querySelector('[data-pdf-ready="true"]')).toBeNull();
  });
});

describe("[H-03 파생] 없는 run 을 열면 백지가 아니다", () => {
  it("run 이 없으면 무엇이 잘못됐는지와 돌아갈 길을 보여준다", async () => {
    seedStores({ withoutRun: true, workflow: { rawFile: null } });

    renderReport("run-지워짐");

    expect(await screen.findByText(/성적서를 찾을 수 없습니다/)).toBeVisible();
    // 발급본은 서버에 있으므로 번호로 복원할 길을 함께 알린다(F-01·F-04).
    expect(screen.getByText(/report\/no\//)).toBeVisible();
    expect(screen.getByRole("link", { name: /워크스페이스 목록으로/ })).toBeVisible();
  });

  it("run 이 있으면 그 화면이 나타나지 않는다", async () => {
    seedStores({ workflow: { rawFile: null }, run: { reportData: evaluatedReport() } });

    renderReport(RUN_ID);

    // 성적서 화면의 고유 표식으로 판정한다(정규식이 여러 요소에 걸리면 getByText 가 던진다).
    expect(await screen.findByRole("button", { name: /PDF 다운로드/ })).toBeVisible();
    expect(screen.queryByText(/성적서를 찾을 수 없습니다/)).toBeNull();
  });
});
