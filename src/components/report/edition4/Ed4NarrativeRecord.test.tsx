/**
 * 판 4 작성 기록 상자(부록 B25·B26, P0)와 판 4 run 의 페이지 수준 안내(판 4 상태 그리기, B27·B29).
 *
 * - 상자: 화면 전용(print:hidden, 인쇄 경로에 없음). `/report/:id`(Report)와 `/report/no/:번호`(ReportByNumber) 두 페이지에서 판 4
 *   상자가 보이고 판 3 상자(머리 "7·8·9절 칸마다")는 없다. 대기·실패면 숨는다.
 * - 페이지 안내: 판 4 run 의 서술 진행 띠는 판 4 절 번호(B27), 점검 표 재확인 안내는 판 4 자리(B29). 판 4 본문 밖의 페이지 글에
 *   판 3 절 번호가 없다(본문은 다른 갈래 — 여기서는 본문 밖만 본다).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fastPolling, renderReportPage, resetAll, runningView, seedStores, stubFetch } from "../../../hooks/reportJob.harness";
import type { FinalReportData } from "../../../types/finalReport.types";
import type { RunNarrativeState } from "../../../types/workspace.types";
import { ED4_FIXTURE_DIR, type Ed4Tag, loadEd4, loadEd4Issuance } from "../../../test/edition4/render/ed4Fixtures";
import { byNumberText, printText } from "../../../test/edition4/render/renderEd4";
import { Ed4NarrativeRecord } from "./Ed4NarrativeRecord";

const MODEL = "claude-sonnet-5-5";
const HEADER = "작성 기록 · 5·6절 칸마다 쓴 방식(화면에만 보이며 인쇄본에는 없습니다)";
const ED3_HEADER_MARK = "7·8·9절 칸마다";

/** 픽스처마다 상자 일곱 줄(B26 앞 글 — 판 3 이름표). 손으로 적은 정확값. */
const AI = `AI 작성(${MODEL})`;
const LINES: Record<Ed4Tag, string[]> = {
  bc_strong: [
    `5.1 판정과 불확실성(8.2 칸) — ${AI}`,
    `5.2 오분류(7.1 칸) — ${AI}`,
    `5.3 데이터 분포(7.2 칸) — ${AI}`,
    `5.4 참조 범위(8.1 칸) — ${AI}`,
    `5.5 운영 위험(8.3 칸) — ${AI}`,
    `5.6 추가 관찰(7.3 칸) — ${AI}`,
    `6 개선 권고(9 칸) — ${AI}`,
  ],
  digits_strong: [
    `5.1 판정과 불확실성(8.2 칸) — ${AI}`,
    `5.2 오분류(7.1 칸) — ${AI}`,
    `5.3 데이터 분포(7.2 칸) — ${AI}`,
    "5.4 참조 범위(8.1 칸) — 규칙 기반 문장",
    `5.5 운영 위험(8.3 칸) — ${AI}`,
    `5.6 추가 관찰(7.3 칸) — ${AI}`,
    `6 개선 권고(9 칸) — ${AI}`,
  ],
  yeast_strong: [
    `5.1 판정과 불확실성(8.2 칸) — ${AI}`,
    `5.2 오분류(7.1 칸) — ${AI}`,
    `5.3 데이터 분포(7.2 칸) — ${AI}`,
    `5.4 참조 범위(8.1 칸) — ${AI}`,
    `5.5 운영 위험(8.3 칸) — ${AI}`,
    "5.6 추가 관찰(7.3 칸) — 고정 문구",
    `6 개선 권고(9 칸) — ${AI}`,
  ],
};
const TAGS: Ed4Tag[] = ["bc_strong", "digits_strong", "yeast_strong"];

/** 판 3 절 번호를 가리키는 페이지 안내 글(판 4 run 의 본문 밖에 나오면 안 됨). */
const ED3_PLACE_MARKS = [/7·8·9절/, /표지·1\.4·6\.0/, /성적서 6\.0/, /\b[789]\.[0-3]절/, /9절/];

const readFixture = (name: string) => JSON.parse(readFileSync(resolve(ED4_FIXTURE_DIR, name), "utf8"));

describe("Ed4NarrativeRecord — 상자 모양(B25·B26)", () => {
  it.each(TAGS)("%s: 머리 한 줄과 B26 순서 일곱 줄, print:hidden", (tag) => {
    const view = render(<Ed4NarrativeRecord data={loadEd4(tag, "final")} />);
    const box = view.container.querySelector('details[aria-label="작성 기록"]')!;
    expect(box).not.toBeNull();
    expect(box.classList.contains("print:hidden")).toBe(true);
    expect(box.querySelector("summary")!.textContent).toBe(HEADER);
    const items = [...box.querySelectorAll("li")].map((li) => li.textContent);
    expect(items.length).toBeGreaterThan(0);
    expect(items).toEqual(LINES[tag]);
    expect(box.textContent).not.toContain(ED3_HEADER_MARK);
    view.unmount();
  });

  it("발급본도 같은 상자(칸 출처는 보관본 그대로)", () => {
    const view = render(<Ed4NarrativeRecord data={loadEd4("bc_strong", "issued")} />);
    expect([...view.container.querySelectorAll("li")].map((li) => li.textContent)).toEqual(LINES.bc_strong);
    view.unmount();
  });

  it("서술 대기·실패면 숨는다(판 3 규칙), 칸 출처가 없으면 숨는다", () => {
    for (const data of [loadEd4("bc_strong", "pending"), loadEd4("bc_strong", "failed"), loadEd4("digits_strong", "pending")]) {
      const view = render(<Ed4NarrativeRecord data={data} />);
      expect(view.container.innerHTML).toBe("");
      view.unmount();
    }
    const view = render(<Ed4NarrativeRecord data={{ ...loadEd4("bc_strong", "final"), narrativeSections: {} }} />);
    expect(view.container.innerHTML).toBe("");
    view.unmount();
  });

  it("모르는 칸은 뒤에 붙는다(복사본 — 판 3 처럼 버리지 않음)", () => {
    const base = loadEd4("bc_strong", "final");
    const data: FinalReportData = { ...base, narrativeSections: { ...base.narrativeSections, "9.9": "fallback" } };
    const view = render(<Ed4NarrativeRecord data={data} />);
    const items = [...view.container.querySelectorAll("li")].map((li) => li.textContent);
    expect(items).toEqual([...LINES.bc_strong, "9.9 — 규칙 기반 문장"]);
    view.unmount();
  });
});

describe("/report/no/:번호 — 판 4 상자가 보이고 판 3 상자는 없다", () => {
  it.each(TAGS)("%s", async (tag) => {
    const text = await byNumberText(loadEd4(tag, "final"), loadEd4Issuance(tag));
    const lines = text.split("\n");
    const at = lines.indexOf(HEADER);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(lines.slice(at + 1, at + 8)).toEqual(LINES[tag]);
    expect(lines.filter((l) => l === HEADER)).toHaveLength(1);
    expect(text).not.toContain(ED3_HEADER_MARK);
    // 본문 제목보다 앞(머리 상자 다음, 본문 앞)
    expect(at).toBeLessThan(lines.indexOf(loadEd4(tag, "final").meta.title));
  });
});

describe("인쇄 경로에는 상자가 없다", () => {
  it("bc_strong 발급본 인쇄 글에 작성 기록 머리·줄이 없다", async () => {
    const text = await printText(loadEd4("bc_strong", "issued"));
    expect(text).toContain("— 끝 —");
    expect(text).not.toContain("작성 기록");
    expect(text).not.toContain("(8.2 칸)");
  });
});

/* ------------------------------------------------------------------ *
 * /report/:id — 실제 Report 페이지(fetch 만 가짜)
 * ------------------------------------------------------------------ */
let restorePolling: () => void;

function seedEd4(reportData: FinalReportData, narrative: RunNarrativeState) {
  seedStores({ run: { reportData, narrative, reportId: reportData.meta.reportId } });
}

/** 판 4 본문(`data-report-edition="4"`) 밖의 페이지 글 — 안내·작성 기록·머리. */
function textOutsideBody(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  const body = clone.querySelectorAll('[data-report-edition="4"]');
  expect(body).toHaveLength(1);
  body.forEach((el) => el.remove());
  return clone.textContent ?? "";
}

describe("/report/:id — 판 4 run 의 상자와 페이지 안내", () => {
  beforeEach(() => {
    resetAll();
    restorePolling = fastPolling();
  });
  afterEach(() => {
    restorePolling();
    vi.unstubAllGlobals();
    resetAll();
  });

  it.each(TAGS)("%s 서술 완료: 판 4 상자(B26 줄)가 보이고 판 3 상자는 없다", async (tag) => {
    stubFetch();
    seedEd4(loadEd4(tag, "final"), { status: "done", jobId: "job-1" });
    const view = renderReportPage();
    const box = await screen.findByRole("group", { name: "작성 기록" });
    expect(box.getAttribute("data-ed4-part")).toBe("Ed4NarrativeRecord");
    expect(box.querySelector("summary")!.textContent).toBe(HEADER);
    expect([...box.querySelectorAll("li")].map((li) => li.textContent)).toEqual(LINES[tag]);
    expect(view.container.querySelectorAll('[aria-label="작성 기록"]')).toHaveLength(1);
    expect(view.container.textContent).not.toContain(ED3_HEADER_MARK);
    // 완료면 진행 띠·실패 띠가 없다
    expect(screen.queryByRole("status")).toBeNull();
    const outside = textOutsideBody(view.container);
    for (const mark of ED3_PLACE_MARKS) expect(outside).not.toMatch(mark);
  });

  it("서술 대기(B27): 진행 띠가 판 4 절 번호, 상자는 숨음, 본문 밖에 판 3 절 번호 없음", async () => {
    const narrative = readFixture("bc_strong.pending.narrative.json") as RunNarrativeState;
    expect(narrative.status).toBe("pending");
    stubFetch({ views: [{ body: runningView("generating", narrative.jobId!) }] });
    // 저장된 시작 시각은 고정 과거라 그대로 두면 기다리기를 포기한다(gave_up) — 지금 시작한 작업으로.
    seedEd4(loadEd4("bc_strong", "pending"), { ...narrative, startedAt: new Date().toISOString() });
    const view = renderReportPage();
    const band = await screen.findByText(/생성 중/, { selector: "strong" });
    expect(band.closest('[role="status"]')!.textContent).toBe(
      "정성 서술(5·6절)을 만드는 중입니다 — 생성 중. 아래 지표·차트는 이미 확정된 결과이며, 서술은 끝나는 대로 채워집니다. " +
        "그동안 인쇄·발급은 잠깁니다.",
    );
    expect(view.container.querySelector('[aria-label="작성 기록"]')).toBeNull();
    // 평가 전 초안 안내는 서술 단계에서는 나오지 않는다(서술 띠가 상태를 말함)
    expect(view.container.textContent).not.toContain("아직 평가가 끝나지 않은 성적서입니다");
    const outside = textOutsideBody(view.container);
    for (const mark of ED3_PLACE_MARKS) expect(outside).not.toMatch(mark);
  });

  it("서술 실패: 실패 띠(판 3 글 — 절 번호 없음), 상자는 숨음, 본문 밖에 판 3 절 번호 없음", async () => {
    const narrative = readFixture("bc_strong.failed.narrative.json") as RunNarrativeState;
    expect(narrative.status).toBe("failed");
    stubFetch();
    seedEd4(loadEd4("bc_strong", "failed"), narrative);
    const view = renderReportPage();
    await screen.findByText(/서술을 만드는 중 서버에서 오류가 났습니다\./);
    expect(view.container.querySelector('[aria-label="작성 기록"]')).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    const outside = textOutsideBody(view.container);
    for (const mark of ED3_PLACE_MARKS) expect(outside).not.toMatch(mark);
  });

  it("점검 표 재확인 안내(B29): 판 4 run 은 '(표지·1.3·부록 1.2)'", async () => {
    stubFetch();
    const base = loadEd4("bc_strong", "final");
    seedEd4({ ...base, materialCheck: { ...base.materialCheck!, version: "1.0" } }, { status: "done", jobId: "job-1" });
    renderReportPage();
    const region = await screen.findByRole("region", { name: "점검 표 변경 안내" });
    expect(region.textContent).toBe(
      "점검 표가 바뀌어(1.0 → 2.0) 다시 확인이 필요합니다. 이 평가의 재료 선택 점검(표지·1.3·부록 1.2)은 옛 점검 표로 만든 것입니다. " +
        '데이터 검증 화면에서 생성 전 안내를 다시 보고 "다음"을 누르면 새 점검 표로 성적서를 다시 만듭니다.',
    );
  });
});
