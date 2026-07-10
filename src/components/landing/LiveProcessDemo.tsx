import { LineChart } from "lucide-react";
import { BasicInfoDemo } from "./BasicInfoDemo";
import { MetricsDemo } from "./MetricsDemo";
import { MetricDetailsDemo } from "./MetricDetailsDemo";
import { DataUploadDemo } from "./DataUploadDemo";
import { ColumnMappingDemo } from "./ColumnMappingDemo";
import { ValidationDemo } from "./ValidationDemo";
import { ReportDemo } from "./ReportDemo";

/**
 * 랜딩 "Process" 섹션의 자동 재생 워크플로우 데모(7단계 패널을 순차 애니메이션).
 */
export function LiveProcessDemo() {
  const stepLabels = [
    "Basic info",
    "Metrics",
    "Metric details",
    "Data upload",
    "Column mapping",
    "Validation",
    "Final report",
  ];

  return (
    <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-lg border border-border bg-[#FAFAFA] shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
      <div className="h-14 border-b border-border bg-card">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <LineChart className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold leading-none">ML Evaluation</p>
              <p className="text-xs text-muted-foreground">ISO/IEC 4213 based</p>
            </div>
          </div>
          <span className="rounded-md border bg-card px-3 py-1 text-xs text-muted-foreground">
            Live workflow
          </span>
        </div>
      </div>
      <div className="h-12 border-b border-border bg-card">
        <div className="grid h-full grid-cols-7 max-md:grid-cols-4 max-sm:grid-cols-2">
          {stepLabels.map((label, index) => (
            <div
              key={label}
              className="landing-live-tab relative flex items-center justify-center gap-2 text-sm text-muted-foreground"
              style={{ animationDelay: `${index * 4.2}s` }}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs">
                {index + 1}
              </span>
              <span className="hidden md:inline">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="landing-live-stage relative min-h-[620px] overflow-hidden">
        <BasicInfoDemo />
        <MetricsDemo />
        <MetricDetailsDemo />
        <DataUploadDemo />
        <ColumnMappingDemo />
        <ValidationDemo />
        <ReportDemo />
      </div>
    </div>
  );
}
