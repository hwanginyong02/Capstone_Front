import { createElement } from "react";
import {
  Home,
  BasicInfo,
  TestItems,
  MetricDetail,
  DataUpload,
  ColumnMapping,
  DataValidation,
} from "./pages/Home";
import { Navigate } from "react-router";
import { Report } from "./pages/report/Report";
import { ReportPrint } from "./pages/report/ReportPrint";
import { WorkspaceDetail } from "./pages/workspaces/WorkspaceDetail";
import { WorkspaceList } from "./pages/workspaces/WorkspaceList";

function AppIndexRedirect() {
  return createElement(Navigate, { to: "/app/basic-info", replace: true });
}

export const routes = [
  { path: "/", Component: Home },
  { path: "/app", Component: AppIndexRedirect },
  { path: "/workspaces", Component: WorkspaceList },
  { path: "/workspaces/:workspaceId", Component: WorkspaceDetail },
  { path: "/app/basic-info", Component: BasicInfo },
  { path: "/app/metrics", Component: TestItems },
  { path: "/app/metric-detail", Component: MetricDetail },
  { path: "/app/data-upload", Component: DataUpload },
  { path: "/app/column-mapping", Component: ColumnMapping },
  { path: "/app/data-validation", Component: DataValidation },
  { path: "/step/basic-info", Component: BasicInfo },
  { path: "/step/test-items", Component: TestItems },
  { path: "/step/tc-detail", Component: MetricDetail },
  { path: "/step/data-upload", Component: DataUpload },
  { path: "/step/column-mapping", Component: ColumnMapping },
  { path: "/step/data-validation", Component: DataValidation },
  { path: "/report/:id", Component: Report },
  { path: "/report/:id/print", Component: ReportPrint },
] as const;
