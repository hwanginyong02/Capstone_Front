import { BasicInfo } from "./BasicInfo";
import { TestItems } from "./TestItems";
import { MetricDetail } from "./MetricDetail";
import { DataUpload } from "./DataUpload";
import { ColumnMapping } from "./ColumnMapping";
import { DataValidation } from "./DataValidation";
import { LandingPage } from "./LandingPage";

/**
 * Home page — redirects to the first workflow step.
 */
export function Home() {
  return <LandingPage />;
}

export { BasicInfo, TestItems, MetricDetail, DataUpload, ColumnMapping, DataValidation };
