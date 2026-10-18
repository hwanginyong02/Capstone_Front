import { useParams } from "react-router";
import { useReportData } from "../../hooks/useReportData";
import { useIssuance } from "../../hooks/useIssuance";
import { usePdfDownload } from "../../hooks/usePdfDownload";
import { ReportLayout } from "../../components/report/layout/ReportLayout";
import { ReportLoadingState } from "../../components/report/ReportLoadingState";
import { ReportErrorState } from "../../components/report/ReportErrorState";
import { ReportSections } from "../../components/report/ReportSections";
import { UnevaluatedDraftNotice } from "../../components/report/UnevaluatedDraftNotice";
import { BackendNoticePanel } from "../../components/workflow/BackendNoticePanel";

export function Report() {
  // 기본값을 두지 않는다 — 폐지된 임시 성적서("preview")로 조용히 떨어지지 않게(E-06).
  const { id = "" } = useParams();
  const { data: reportData, isLoading, narrativePending, error } = useReportData(id);
  const issuance = useIssuance(id, reportData);
  const data = issuance.data; // 발급 반영본(있으면) — 섹션은 이 값을 렌더한다
  const { download } = usePdfDownload(id);

  if (isLoading) {
    return <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState error={error} onBack={() => window.history.back()} />;
  }

  if (!data) return null;

  return (
    <ReportLayout
      onDownload={download}
      issued={issuance.issued}
      canIssue={issuance.canIssue}
      reportId={data.meta.reportId}
      busy={issuance.busy}
      onIssue={issuance.issue}
      onReissue={issuance.reissue}
    >
      {/* 빠진 재료 안내는 검증 화면(생성 전 안내)으로 옮겼다 — 성적서는 표지·1.4·6.0 에 점검 결과를
          찍는다(재료 선택 점검 6절). 여기서 지금 입력을 다시 판정하면 두 번째 판정 경로가 된다. */}
      <UnevaluatedDraftNotice isEvaluated={!!(data as any).isEvaluated || narrativePending} />

      {/* 평가 전처리 경고(ISSUES.md D-16). 이 값은 evaluate 응답에만 실려 오므로
          검증 화면이 아니라 여기서 도착한다 — 도착하는 자리에서 보여준다. */}
      <BackendNoticePanel evaluationWarnings={data.evaluationWarnings} />

      {narrativePending && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary-subtle px-4 py-2.5 text-sm text-primary">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          AI 정성 서술(7·8·9절)을 생성하는 중입니다. 아래 지표·차트는 이미 확정된 결과이며, 서술은 완료되는 대로 채워집니다.
        </div>
      )}
      <ReportSections data={data} />
    </ReportLayout>
  );
}
