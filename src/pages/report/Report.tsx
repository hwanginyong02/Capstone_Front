import { useNavigate, useParams } from "react-router";
import { useReportData } from "../../hooks/useReportData";
import { useIssuance } from "../../hooks/useIssuance";
import { usePdfDownload } from "../../hooks/usePdfDownload";
import { ReportLayout } from "../../components/report/layout/ReportLayout";
import { ReportLoadingState } from "../../components/report/ReportLoadingState";
import { ReportErrorState } from "../../components/report/ReportErrorState";
import { ReportSections } from "../../components/report/ReportSections";
import { UnevaluatedDraftNotice } from "../../components/report/UnevaluatedDraftNotice";
import { BackendNoticePanel } from "../../components/workflow/BackendNoticePanel";
import { MissingRecommendedNotice } from "../../components/workflow/MissingRecommendedNotice";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";
import { missingRecommended } from "../../utils/domain/materialPicks";

export function Report() {
  // 기본값을 두지 않는다 — 폐지된 임시 성적서("preview")로 조용히 떨어지지 않게(E-06).
  const { id = "" } = useParams();
  const { data: reportData, isLoading, narrativePending, error } = useReportData(id);
  const issuance = useIssuance(id, reportData);
  const data = issuance.data; // 발급 반영본(있으면) — 섹션은 이 값을 렌더한다
  const { download } = usePdfDownload(id);
  const navigate = useNavigate();
  const taskType = useWorkflowStore((s) => s.taskType);
  const picks = useWorkflowStore((s) => s.materialPicks);
  const lastRunId = useWorkflowStore((s) => s.lastRunId);

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
      {/* 고르지 않은 권장 항목(docs/MATERIAL_PICKER.md §5·§6). 방금 입력을 마친 run 이고 아직
          발급 전일 때만 보인다 — 워크스페이스에서 다른 run 을 열었을 때 지금 입력 중인 선택을
          그 성적서에 대어 보이면 안 된다. */}
      {id === lastRunId && !issuance.issued && (
        <MissingRecommendedNotice
          items={missingRecommended(taskType, picks)}
          onOpenPicker={(cardId) => navigate("/app/composer", { state: { cardId } })}
        />
      )}

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
