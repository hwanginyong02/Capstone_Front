import { createElement } from "react";
import { Navigate } from "react-router";
import { Home } from "./pages/Home";
import { BasicInfo } from "./pages/BasicInfo";
import { TestItems } from "./pages/TestItems";
import { MetricDetail } from "./pages/MetricDetail";
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

export const routes = [
  { path: "/", Component: Home },
  { path: "/app", Component: redirectTo("/app/basic-info") },
  { path: "/workspaces", Component: WorkspaceList },
  { path: "/workspaces/:workspaceId", Component: WorkspaceDetail },
  { path: "/app/basic-info", Component: BasicInfo },
  { path: "/app/metrics", Component: TestItems },
  { path: "/app/metric-detail", Component: MetricDetail },
  { path: "/app/data-upload", Component: DataUpload },
  { path: "/app/column-mapping", Component: ColumnMapping },
  { path: "/app/data-validation", Component: DataValidation },
  // 레거시 /step/* 경로는 정식 /app/* 로 리다이렉트 (기존 북마크/링크 보존)
  { path: "/step/basic-info", Component: redirectTo("/app/basic-info") },
  { path: "/step/test-items", Component: redirectTo("/app/metrics") },
  { path: "/step/metric-detail", Component: redirectTo("/app/metric-detail") },
  { path: "/step/data-upload", Component: redirectTo("/app/data-upload") },
  { path: "/step/column-mapping", Component: redirectTo("/app/column-mapping") },
  { path: "/step/data-validation", Component: redirectTo("/app/data-validation") },
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
