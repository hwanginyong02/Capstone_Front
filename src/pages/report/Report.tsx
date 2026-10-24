import { useParams } from "react-router";
import { useReportData } from "../../hooks/useReportData";
import { useIssuance } from "../../hooks/useIssuance";
import { usePdfDownload } from "../../hooks/usePdfDownload";
import { useWorkspaceStore } from "../../utils/stores/useWorkspaceStore";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";
import { ReportLayout } from "../../components/report/layout/ReportLayout";
import { ReportLoadingState } from "../../components/report/ReportLoadingState";
import { ReportErrorState } from "../../components/report/ReportErrorState";
import { ReportSections } from "../../components/report/ReportSections";
import { NarrativeRecordPanel } from "../../components/report/NarrativeRecordPanel";
import { UnevaluatedDraftNotice } from "../../components/report/UnevaluatedDraftNotice";
import {
  IssuedEmptyNarrativeNotice,
  NARRATIVE_LOCK_REASON,
  NarrativeStatusBanner,
  ReportNeedsFileState,
  ReportNeedsReevaluationState,
  ReportNotFoundState,
  SAVE_LOCK_REASON,
  SaveErrorBanner,
} from "../../components/report/ReportStateNotices";
import { BackendNoticePanel } from "../../components/workflow/BackendNoticePanel";
import { MaterialCheckOutdatedNotice } from "../../components/workflow/MaterialCheckNotice";
import { usesSchema4 } from "../../lib/report/normalizeReportContent";

export function Report() {
  // 기본값을 두지 않는다 — 폐지된 임시 성적서("preview")로 조용히 떨어지지 않게(E-06).
  const { id = "" } = useParams();
  const report = useReportData(id);
  const { data: reportData, status, error, narrative } = report;
  const issuance = useIssuance(id, reportData, narrative.phase === "done");
  const data = issuance.data; // 발급 반영본(있으면) — 섹션은 이 값을 렌더한다
  // 끝나지 않은 서술은 완성본이 아니다 — 인쇄(PDF)·발급·정정 발급을 잠근다(서술 라운드 S3b, 계획 원칙 4).
  const locked = narrative.phase !== "done" || !data?.isEvaluated;
  // 저장에 실패했으면 인쇄 화면(새 탭, 저장본만 읽음)이 완성본을 못 읽는다 — PDF 도 잠그고 그 이유를 말한다(S3b 검토).
  const printLocked = locked || !!report.saveError;
  const { download } = usePdfDownload(id, !printLocked);
  const migrationNote = useWorkspaceStore(
    (state) => state.evaluationRuns.find((r) => r.id === id)?.migrationNote,
  );
  // 이 run 이 지금 워크플로 흐름의 run 인가 — 검증 화면 "다음"은 지금 입력으로 새 run 을 만들므로, 점검 표 변경
  // 안내의 "다음을 누르면 다시 만든다"는 이때만 참이다.
  const inCurrentFlow = useWorkflowStore((state) => state.lastRunId === id);

  if (status === "not_found") return <ReportNotFoundState />;
  if (status === "loading") return <ReportLoadingState />;
  if (status === "error" && error) {
    return <ReportErrorState error={error} onBack={() => window.history.back()} />;
  }
  if (status === "needs_file") {
    return (
      <ReportNeedsFileState expected={report.expectedFile} onFile={report.provideFile} mismatch={report.fileMismatch} />
    );
  }
  if (status === "needs_reevaluation") return <ReportNeedsReevaluationState />;

  if (!data) return null;

  return (
    <ReportLayout
      onDownload={download}
      issued={issuance.issued}
      canIssue={issuance.canIssue}
      lockReason={locked ? NARRATIVE_LOCK_REASON : undefined}
      printLockReason={!locked && report.saveError ? SAVE_LOCK_REASON : undefined}
      reportId={data.meta.reportId}
      busy={issuance.busy}
      onIssue={issuance.issue}
      onReissue={issuance.reissue}
    >
      <SaveErrorBanner message={report.saveError} />
      {migrationNote === "issued_empty_narrative" && <IssuedEmptyNarrativeNotice />}
      <MaterialCheckOutdatedNotice
        check={data.materialCheck}
        active={!issuance.issued}
        inCurrentFlow={inCurrentFlow}
        edition4={usesSchema4(data)}
      />
      {/* 빠진 재료 안내는 검증 화면(생성 전 안내)으로 옮겼다 — 성적서는 표지·1.4·6.0 에 점검 결과를
          찍는다(재료 선택 점검 6절). 여기서 지금 입력을 다시 판정하면 두 번째 판정 경로가 된다.
          평가를 마친 뒤(서술 진행·실패)에는 서술 띠가 상태를 말한다 — 미평가 안내는 평가 전 초안에만. */}
      <UnevaluatedDraftNotice isEvaluated={!!data.isEvaluated || narrative.phase !== "none"} />

      {/* 평가 전처리 경고(D-16). 이 값은 evaluate 응답에만 실려 오므로
          검증 화면이 아니라 여기서 도착한다 — 도착하는 자리에서 보여준다. */}
      <BackendNoticePanel evaluationWarnings={data.evaluationWarnings} />

      <NarrativeStatusBanner
        phase={narrative.phase}
        stage={narrative.stage}
        failure={narrative.failure}
        retrying={narrative.retrying}
        onRetry={() => void report.retryNarrative()}
        edition4={usesSchema4(data)}
      />
      {/* 작성 기록(판 3, 서술이 끝난 성적서) — 화면에만. 본문(ReportSections)·인쇄 경로에는 없다(사용자 결정 4).
          서술 대기·실패는 화면 출처(displaySource → narrativeSource pending·failed)로 상자가 스스로 가린다. */}
      <NarrativeRecordPanel data={data} />
      <ReportSections data={data} />
    </ReportLayout>
  );
}
