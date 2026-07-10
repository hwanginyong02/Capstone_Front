import { reportHighlights } from "../../data/landingData";
import { ScrollableReportPreview } from "./ScrollableReportPreview";

/**
 * 랜딩 "Generate the final report" 섹션. 성적서 미리보기와 리포트 하이라이트 목록을 렌더한다.
 */
export function ReportPreview() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-hidden rounded-lg border bg-card shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-xl font-semibold text-foreground">Final report preview</h3>
        </div>
        <div className="landing-report-preview-frame bg-[#F8FAFC]">
          <ScrollableReportPreview />
        </div>
      </div>
      <div className="space-y-4">
        {reportHighlights.map((item, index) => (
          <div key={item.title} className="rounded-lg border bg-card p-6">
            <p className="text-sm font-medium text-primary">0{index + 1}</p>
            <h4 className="mt-3 text-lg font-semibold text-foreground">
              {item.title}
            </h4>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
