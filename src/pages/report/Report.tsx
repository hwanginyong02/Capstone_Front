import { useParams } from "react-router";
import { useReportData } from "../../hooks/useReportData";
import { useIssuance } from "../../hooks/useIssuance";
import { usePdfDownload } from "../../hooks/usePdfDownload";
import { ReportLayout } from "../../components/report/layout/ReportLayout";
import { ReportLoadingState } from "../../components/report/ReportLoadingState";
import { ReportErrorState } from "../../components/report/ReportErrorState";
import { ReportSections } from "../../components/report/ReportSections";
import { UnevaluatedDraftNotice } from "../../components/report/UnevaluatedDraftNotice";
import { ReportNotFoundState } from "../../components/report/ReportNotFoundState";
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

  // 여기까지 왔는데 데이터가 없다 == **이 브라우저에 그 run 이 없다.**
  // (run 이 있으면 `run.reportData` 는 6단계가 만들어 넣은 초안이라 항상 값이 있고,
  //  계산 중이면 위 `isLoading` 에서 이미 걸렸다.)
  // 종전에는 `return null` 이라 **아무 설명 없는 흰 화면**이었다 — 지워진 run 의 링크나
  // 다른 기기에서 만든 성적서 주소를 열면 사용자는 원인도 다음 행동도 알 수 없었다.
  if (!data) return <ReportNotFoundState />;

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
      <UnevaluatedDraftNotice isEvaluated={!!data.isEvaluated || narrativePending} />

      {/* 평가 전처리 경고(ISSUES.md D-16). 이 값은 evaluate 응답에만 실려 오므로
          6단계가 아니라 여기서 도착한다 — 도착하는 자리에서 보여준다. */}
      <BackendNoticePanel evaluationWarnings={data.evaluationWarnings} />

      {narrativePending && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-700">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          AI 정성 서술(7·8·9절)을 생성하는 중입니다. 아래 지표·차트는 이미 확정된 결과이며, 서술은 완료되는 대로 채워집니다.
        </div>
      )}
      <ReportSections data={data} />
    </ReportLayout>
  );
}
