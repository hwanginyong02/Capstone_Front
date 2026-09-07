import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { stepToPath } from "../utils/stores/useWorkflowStore";
import { ensureActiveWorkspace } from "../utils/domain/ensureActiveWorkspace";

/**
 * ISSUES.md E-02 · E-06 (2026-09-07 ★확정된 제품 결정 7).
 *
 * `/report/preview` 는 라우트가 아니라 `/report/:id` 에 `id="preview"` 로 매칭되는
 * 문자열 리터럴 뭉치였다. 그 화면은 워크플로우 store 를 직접 읽어 성적서를 조립하므로
 * **워크스페이스 없이도 워크플로우를 완주**할 수 있었고(E-02), 그 상태에서 PDF 를
 * 누르면 내용 검증 없이 자동 인쇄됐다(E-06).
 *
 * 그리고 랜딩의 성적서 미리보기 iframe 이 바로 그 경로를 가리켰는데 `?showcase=1` 이
 * 없어서, **방문자의 실제 회사명·사업자등록번호·주소가 공개 랜딩 페이지에 렌더**됐다.
 */

const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

describe("preview 경로가 코드에서 사라졌다 (E-06)", () => {
  it.each([
    "components/landing/ScrollableReportPreview.tsx",
    "utils/stores/useWorkflowStore.ts",
    "hooks/useReportData.ts",
    "hooks/useIssuance.ts",
    "pages/report/Report.tsx",
    "pages/report/ReportPrint.tsx",
  ])("%s 가 'preview' 를 코드로 쓰지 않는다", (path) => {
    // 설명 주석에 단어가 남는 것은 허용한다 — 금지 대상은 **동작하는 코드**다.
    const code = read(path)
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("*") && !line.trimStart().startsWith("//"))
      .join("\n");

    expect(code).not.toMatch(/[=!]==\s*"preview"/);
    expect(code).not.toMatch(/=\s*"preview"/);
    expect(code).not.toContain("/report/preview");
  });

  it("랜딩 미리보기가 iframe 을 쓰지 않는다(방문자 입력 렌더 차단)", () => {
    expect(read("components/landing/ScrollableReportPreview.tsx")).not.toContain("<iframe");
  });

  it("옛 북마크는 워크스페이스 목록으로 보낸다", () => {
    const routes = read("routes.ts");
    expect(routes).toContain("/report/preview");
    expect(routes).toContain('redirectTo("/workspaces")');
  });
});

describe("stepToPath(7) — preview 를 가리키지 않는다", () => {
  it("워크스페이스 목록으로 간다", () => {
    expect(stepToPath(7)).toBe("/workspaces");
  });
});

describe("ensureActiveWorkspace — 워크스페이스 자동 생성 (E-02)", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ workspaces: [], evaluationRuns: [], activeWorkspaceId: null });
    useWorkflowStore.getState().resetWorkflow();
  });

  it("활성 워크스페이스가 없으면 하나 만든다", () => {
    const id = ensureActiveWorkspace("스팸 분류기");

    expect(id).toBeTruthy();
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(id);
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
  });

  it("모델명을 워크스페이스 이름으로 쓴다", () => {
    ensureActiveWorkspace("스팸 분류기");

    expect(useWorkspaceStore.getState().workspaces[0].name).toBe("스팸 분류기");
  });

  it("모델명이 없으면 빈 이름을 만들지 않는다", () => {
    ensureActiveWorkspace("");

    expect(useWorkspaceStore.getState().workspaces[0].name.trim()).not.toBe("");
  });

  it("이미 활성 워크스페이스가 있으면 새로 만들지 않는다", () => {
    const first = ensureActiveWorkspace("A");
    const second = ensureActiveWorkspace("B");

    expect(second).toBe(first);
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
  });

  it("자동 생성임을 설명에 남긴다(사용자가 나중에 구분할 수 있게)", () => {
    ensureActiveWorkspace("스팸 분류기");

    expect(useWorkspaceStore.getState().workspaces[0].description).toMatch(/자동/);
  });
});

describe("6단계는 워크스페이스 없이 성적서로 넘어가지 않는다 (E-02)", () => {
  it("DataValidation 이 워크스페이스를 보장한 뒤 run 을 만든다", () => {
    const source = read("pages/DataValidation.tsx");

    expect(source).toContain("ensureActiveWorkspace");
    // 워크스페이스 없이 stepToPath(7) 로 빠지는 폴백이 사라졌다 —
    // 그 분기는 계산해 둔 reportData 를 버리고 preview 로 갔다.
    expect(source).not.toContain("navigate(stepToPath(7))");
  });
});
