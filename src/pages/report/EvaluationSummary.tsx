import { useParams } from "react-router";
import { WorkflowShell } from "../../layout/WorkflowShell";
import { EvaluationSummary as EvaluationSummaryContent } from "../../components/evaluation-summary/EvaluationSummary";
import { ReportLoadingState } from "../../components/report/ReportLoadingState";
import { ReportErrorState } from "../../components/report/ReportErrorState";
import { useReportData } from "../../hooks/useReportData";
import { useStepFlow } from "../../hooks/useStepFlow";
import { useWorkspaceStore } from "../../utils/stores/useWorkspaceStore";

/**
 * 평가 결과.
 *
 * 검증과 성적서 사이에 있다. 고른 지표의 값만 보여주고 **합불 판정은 하지 않는다** —
 * 목표값은 성적서 구간에서 받으므로 이 시점엔 기준이 없다.
 *
 * 경로가 `/report/:id/summary` 인 이유: 평가 결과는 run 하나에 매인 데이터다. `/app/*` 아래
 * 두면 어느 run 을 보는지 URL 이 말하지 못해, 새로고침·공유·뒤로가기가 전부 깨진다.
 * `useReportData` 가 저장된 run 을 읽거나 없으면 평가를 실행한다.
 */
export function EvaluationSummary() {
  const { id = "" } = useParams();
  const { data, isLoading, error } = useReportData(id);
  const compareTo = useCompareLink(id);
  const flow = useStepFlow("summary");

  /**
   * 종전에는 여기서 `useEffect` 로 자기 단계를 직접 등록했다. `pathToStep` 이 `/app/*` 만
   * 알아보고 `/report/*` 를 조용히 1단계로 돌려줬기 때문이다. 이제 `pathToStepId` 가 run
   * 경로까지 알아보므로 그 보정이 필요 없다 — `WorkflowShell` 이 알아서 맞춘다.
   *
   * 다음 목적지도 적지 않는다. 켠 카드에 따라 데이터 정보(7)·모델과 환경(8)이 끼어들 수
   * 있어서, 여기서 `/report/:id/issue-info` 를 직접 가리키면 그 둘을 건너뛴다.
   */
  const handleNext = () => flow.goNext({ runId: id });
  const handlePrevious = () => flow.goPrevious({ runId: id });

  if (isLoading) return <ReportLoadingState />;
  if (error) return <ReportErrorState error={error} onBack={handlePrevious} />;
  if (!data) return null;

  return (
    <WorkflowShell
      showActionBar
      showPrevious
      showNext
      onPrevious={handlePrevious}
      onNext={handleNext}
      nextLabel="Prepare report"
    >
      <EvaluationSummaryContent data={data} compareTo={compareTo} />
    </WorkflowShell>
  );
}

/**
 * 같은 모델의 다른 버전이 있을 때만 비교 화면 경로를 돌려준다.
 *
 * 평가가 하나뿐이면 비교할 대상이 없으므로 링크 자체를 만들지 않는다 — 눌러봐야
 * 열 하나짜리 표가 나오는 버튼은 안 보이는 편이 낫다.
 */
function useCompareLink(runId: string): string | undefined {
  return useWorkspaceStore((state) => {
    const run = state.evaluationRuns.find((item) => item.id === runId);
    if (!run) return undefined;

    const modelName = run.modelName.trim() || "Untitled model";
    const siblings = state.evaluationRuns.filter(
      (item) =>
        item.workspaceId === run.workspaceId &&
        (item.modelName.trim() || "Untitled model") === modelName,
    );

    if (siblings.length < 2) return undefined;
    return `/workspaces/${run.workspaceId}/models/${encodeURIComponent(modelName)}`;
  });
}
