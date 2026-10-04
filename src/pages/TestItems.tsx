import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { WorkflowShell } from "../layout/WorkflowShell";
import { TestItems as TestItemsContent } from "../components/test-items/TestItems";
import { useColumnAnalysis } from "../hooks/useColumnAnalysis";
import { RemainingNotice } from "../components/composer-input/RemainingNotice";
import { focusFirstIssue } from "../components/composer-input/focusFirstIssue";
import { getCard } from "../data/reportComposer";
import { getCardIssues } from "../utils/domain/composerFieldGate";

/**
 * 평가 지표 선택.
 *
 * 컬럼 매핑·검증보다 **앞선다**. `/api/validate-data` 가 `selected_metric_ids` 를 필수로
 * 받기 때문이다(`EvaluateRequest` 의 `min_length=1` — 빈 목록이면 결측 제거 범위를 좁힐 수
 * 없어 거절한다). 검증을 지표보다 앞에 두려면 백엔드 스키마를 갈라야 한다.
 *
 * 목표값(합격 기준)은 여기서 묻지 않는다. 합불 판정은 성적서의 일이고, 평가는 "정확도가
 * 몇 %인가"만 답하면 된다 — 목표값은 성적서 구간으로 갔다.
 *
 * β(M5)만 여기 남는다. 목표값과 달리 `/api/evaluate` 페이로드에 실리는 **평가 입력**이다.
 *
 * ⑤ 평가 관점은 이 화면 맨 위에 있다. 종전에는 바로 앞의 독립 단계였는데, 질문 둘이 곧
 * 어떤 지표를 권할지 정하는 근거라 고르는 화면과 한 자리에 두는 편이 읽힌다.
 */
export function TestItems() {
  const store = useWorkflowStore();
  const flow = useStepFlow("metrics");
  const { analyzeColumns, isAnalyzing, cancel } = useColumnAnalysis();
  // 종전에는 raw alert() 로만 드러났다. 화면 안에 남겨야 사용자가 읽고 조치할 수 있다(E-18).
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // ⑤ 의 빈 칸은 다음을 누른 뒤에만 빨갛게 칠한다(`pages/report/DataInfo.tsx` 와 같은 규칙).
  const [showPerspectiveErrors, setShowPerspectiveErrors] = useState(false);

  // ⑤ 는 잠긴 필수 카드라 included 는 항상 참이다.
  const perspectiveIssues = getCardIssues(
    getCard("perspective"),
    store.taskType,
    store.composerPerspective,
    true,
  );

  const beta = store.metricDetails["M5"]?.beta ?? "1.0";
  const betaInvalid =
    store.selectedMetricIds.includes("M5") &&
    (beta.trim() === "" || !Number.isFinite(Number(beta)) || Number(beta) <= 0);

  const handleBetaChange = (value: string) => {
    store.setMetricDetails((prev) => {
      const existing = prev.M5 ?? {
        id: "M5",
        name: "F-beta Score",
        description: "",
        targetValue: "",
        positiveClass: "",
        completed: false,
        beta: "1.0",
      };
      return { ...prev, M5: { ...existing, beta: value } };
    });
  };

  /**
   * 다음 화면(컬럼 매핑)이 쓸 자동 매핑을 여기서 받아둔다.
   *
   * 업로드 단계가 아니라 여기인 이유: 이 호출은 최대 150초가 걸리는데
   * (`ANALYSIS_TIMEOUT_MS`), 결과를 소비하는 건 바로 다음 화면이다. 업로드에서 돌리면
   * 결과가 필요 없는 이 화면으로 오려고 그 시간을 기다리게 된다.
   */
  const handleNext = async () => {
    // 평가 관점을 먼저 본다 — 화면 맨 위의 질문이라 여기서 막히면 긴 분석을 돌릴 이유가 없다.
    if (perspectiveIssues.length > 0) {
      setShowPerspectiveErrors(true);
      focusFirstIssue(perspectiveIssues);
      return;
    }

    if (!store.rawFile) {
      setAnalysisError("Evaluation file is missing. Please re-upload it in the evaluation file step.");
      return;
    }

    setAnalysisError(null);
    try {
      const { rows, metadata, columnNotes } = await analyzeColumns(
        store.rawFile,
        store.taskType || "multiclass",
      );

      store.setColumnMapping(rows);
      store.setMetadata(metadata);
      // 백엔드가 만든 컬럼 대조 안내를 검증 단계까지 나른다(ISSUES.md B-03).
      store.setColumnNotes(columnNotes);

      flow.goNext();
    } catch (err: any) {
      console.error("Column analysis failed:", err);
      setAnalysisError(err?.message || String(err));
    }
  };

  const handlePrevious = () => flow.goPrevious();

  return (
    <WorkflowShell
      showActionBar
      showPrevious={!isAnalyzing}
      showNext
      onPrevious={handlePrevious}
      onNext={handleNext}
      // ⑤ 는 잠그지 않는다 — 누르면 어느 칸이 비었는지 말해 준다. 지표는 격자가 눈앞에
      // 있어 무엇을 해야 할지 보이므로 종전대로 잠근다.
      nextDisabled={store.selectedMetricIds.length === 0 || betaInvalid || isAnalyzing}
      nextLabel={isAnalyzing ? "Analyzing columns..." : "Next step"}
      rightAction={<RemainingNotice issues={perspectiveIssues} />}
      leftAction={
        isAnalyzing ? (
          <Button variant="outline" onClick={cancel}>
            Cancel analysis
          </Button>
        ) : undefined
      }
    >
      {analysisError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{analysisError}</AlertDescription>
        </Alert>
      )}
      <TestItemsContent
        taskType={store.taskType}
        onSelectedMetricsChange={store.setSelectedMetricIds}
        beta={beta}
        onBetaChange={handleBetaChange}
        perspectiveValues={store.composerPerspective}
        onPerspectiveChange={(fieldId, next) =>
          store.setComposerPerspective((prev) => ({ ...prev, [fieldId]: next }))
        }
        perspectiveIssues={perspectiveIssues}
        perspectiveShowErrors={showPerspectiveErrors}
      />
    </WorkflowShell>
  );
}
