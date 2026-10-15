import { createElement } from "react";
import { Navigate, useParams, type Params } from "react-router";
import { Home } from "./pages/Home";
import { TaskTypeSelect } from "./pages/TaskTypeSelect";
import { MaterialPicker } from "./pages/MaterialPicker";
import { DataInfo } from "./pages/report/DataInfo";
import { ModelEnv } from "./pages/report/ModelEnv";
import { ReportInfo } from "./pages/report/ReportInfo";
import { TestItems } from "./pages/TestItems";
import { DataUpload } from "./pages/DataUpload";
import { ColumnMapping } from "./pages/ColumnMapping";
import { DataValidation } from "./pages/DataValidation";
import { Report } from "./pages/report/Report";
import { ReportPrint } from "./pages/report/ReportPrint";
import { ReportByNumber } from "./pages/report/ReportByNumber";
import { WorkspaceDetail } from "./pages/workspaces/WorkspaceDetail";
import { WorkspaceList } from "./pages/workspaces/WorkspaceList";
import { NotFound } from "./pages/NotFound";

/** 지정 경로로 replace 리다이렉트하는 라우트 컴포넌트를 만든다. */
function redirectTo(path: string) {
  return () => createElement(Navigate, { to: path, replace: true });
}

/** 경로 파라미터로 목적지를 만들어 replace 리다이렉트한다(`/report/:id/...` 처럼 id 를 이어야 할 때). */
function redirectWithParams(build: (params: Readonly<Params<string>>) => string) {
  return function RedirectWithParams() {
    const params = useParams();
    return createElement(Navigate, { to: build(params), replace: true });
  };
}

export const routes = [
  { path: "/", Component: Home },
  // 워크플로우 진입점 = 분류 유형 선택(docs/UI_DESIGN.md §3).
  // 종전에는 /app/basic-info 로 바로 리다이렉트해, 유형 선택이 1단계 폼 안에 묻혀 있었다.
  { path: "/app", Component: TaskTypeSelect },
  // 재료 고르기 — 작업 유형 다음, 입력 단계 시작 전(docs/MATERIAL_PICKER.md §1·§4). 단계가 아닌
  // 화면이라 STEP_CATALOG 에 넣지 않는다. 경로는 종전 성적서 구성 화면의 것을 그대로 쓴다.
  { path: "/app/composer", Component: MaterialPicker },
  { path: "/workspaces", Component: WorkspaceList },
  { path: "/workspaces/:workspaceId", Component: WorkspaceDetail },
  // 모델 버전 비교는 폐지됐다(docs/WORKFLOW_REDESIGN.md §11). 저장된 링크가 죽지 않도록
  // 그 워크스페이스로 보낸다.
  {
    path: "/workspaces/:workspaceId/models/:modelName",
    Component: redirectWithParams(({ workspaceId }) => "/workspaces/" + (workspaceId ?? "")),
  },
  // 평가 구간. **이 배열의 순서는 단계 순서가 아니다** — 걸을 순서는 고른 카드에서
  // 계산되고, 정본 순서는 `data/workflowSteps.ts` 의 STEP_CATALOG 에 있다.
  // (종전 주석은 "배열 순서 = 단계 번호"라고 적었는데 그때도 사실이 아니었다.)
  { path: "/app/data-upload", Component: DataUpload },
  { path: "/app/column-mapping", Component: ColumnMapping },
  { path: "/app/metrics", Component: TestItems },
  { path: "/app/data-validation", Component: DataValidation },
  // 성적서 입력 — 검증에서 run 이 생긴 뒤라 run id 경로에 둔다. Details 는 항상,
  // Data info·Model info 는 켠 카드에 따라 나타난다.
  { path: "/report/:id/issue-info", Component: ReportInfo },
  { path: "/report/:id/data-info", Component: DataInfo },
  { path: "/report/:id/model-env", Component: ModelEnv },
  // 평가 결과 화면은 폐지됐다(docs/WORKFLOW_REDESIGN.md §11) — 같은 run 의 성적서로 보낸다.
  {
    path: "/report/:id/summary",
    Component: redirectWithParams(({ id }) => "/report/" + (id ?? "")),
  },
  // 평가 관점은 단계에서 빠지고 지표 선택 화면 맨 위로 들어갔다. 저장된 링크·북마크가
  // 죽지 않도록 그쪽으로 보낸다.
  { path: "/app/perspective", Component: redirectTo("/app/metrics") },
  // 지표 상세(구 3단계)는 폐지됐다 — β 는 지표 선택으로, 목표값은 성적서 구간으로 갔다.
  { path: "/app/metric-detail", Component: redirectTo("/app/metrics") },
  // 기본 정보는 더 이상 평가 구간의 단계가 아니다(ISSUES.md 없음 — 2026-09-19 재배치).
  { path: "/app/basic-info", Component: redirectTo("/app") },
  // 레거시 /step/* 경로는 정식 /app/* 로 리다이렉트 (기존 북마크/링크 보존)
  { path: "/step/basic-info", Component: redirectTo("/app") },
  { path: "/step/test-items", Component: redirectTo("/app/metrics") },
  { path: "/step/metric-detail", Component: redirectTo("/app/metrics") },
  { path: "/step/data-upload", Component: redirectTo("/app/data-upload") },
  { path: "/step/column-mapping", Component: redirectTo("/app/column-mapping") },
  { path: "/step/data-validation", Component: redirectTo("/app/data-validation") },
  // 폐지된 임시 성적서 경로. 옛 북마크가 `/report/:id` 에 id="preview" 로 매칭돼
  // 빈 성적서를 렌더하지 않도록 명시적으로 앞에 둔다(ISSUES.md E-06).
  { path: "/report/preview", Component: redirectTo("/workspaces") },
  // 성적서 번호로 서버 보관본 복원(ISSUES.md F-04).
  // react-router 는 정적 세그먼트("no")를 동적 세그먼트(":id")보다 높게 랭크하므로
  // 이 항목의 배열 위치와 무관하게 "/report/no/RPT-..." 가 이긴다
  // (ReportByNumber.test.tsx 의 '라우팅' 테스트가 그 전제를 고정한다).
  { path: "/report/no/:reportNo", Component: ReportByNumber },
  { path: "/report/:id", Component: Report },
  { path: "/report/:id/print", Component: ReportPrint },
  // 미매칭 URL 은 백지 대신 안내 화면으로(ISSUES.md E-12).
  // react-router 는 "*" 를 가장 낮게 랭크하므로 다른 라우트를 가리지 않는다.
  { path: "*", Component: NotFound },
] as const;
