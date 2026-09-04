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
import { WorkspaceDetail } from "./pages/workspaces/WorkspaceDetail";
import { WorkspaceList } from "./pages/workspaces/WorkspaceList";

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
  { path: "/report/:id", Component: Report },
  { path: "/report/:id/print", Component: ReportPrint },
] as const;
