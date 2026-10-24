import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { BackendNoticePanel } from "../components/workflow/BackendNoticePanel";
import { ensureActiveWorkspace } from "../utils/domain/ensureActiveWorkspace";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { WorkflowShell } from "../layout/WorkflowShell";
import { Alert, AlertDescription } from "../components/ui/alert";
import { DataValidation as DataValidationContent } from "../components/data-validation/DataValidation";
import { useDataValidation } from "../hooks/useDataValidation";
import {
  describeValidationGate,
  getValidationGateReason,
} from "../utils/domain/validationGate";
import { FileReuploadNotice } from "../components/workflow/FileReuploadNotice";
import {
  canFixInInputOf,
  MaterialCheckNotice,
  MaterialCheckOutdatedNotice,
  type MaterialCheckTarget,
} from "../components/workflow/MaterialCheckNotice";
import { layerOneGaps, screenRuleGaps, type LayerOneGap } from "../utils/domain/layerOne";
import { buildEvaluationRequestSnapshot } from "../lib/report/evaluationRequest";
import { getCard, stepOfLeaf } from "../data/reportComposer";
import type { MaterialCheckResult } from "../types/finalReport.types";
import { usesSchema4 } from "../lib/report/normalizeReportContent";
import type { FlowEntryState } from "../types/reportComposer.types";

/** 평가 실행(성적서 생성) 중 발생한 예외를 사용자가 읽을 수 있는 문장으로 바꾼다. */
function describeSubmitError(err: unknown): string {
  // 평가 결과는 localStorage 에 저장된다(서버에 사본이 없음). run 하나당 컬럼별 고유값
  // 전량이 담긴 metadata 가 함께 들어가 용량이 크고, 한도를 넘으면 여기서 예외가 난다.
  const isQuota =
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");

  if (isQuota) {
    return (
      "브라우저 저장 공간이 가득 차 평가 결과를 저장하지 못했습니다. " +
      "워크스페이스 화면에서 오래된 평가를 지우고 다시 시도하세요."
    );
  }

  return err instanceof Error ? err.message : String(err);
}

/**
 * 데이터 검증 — 평가를 실행하는 단계.
 *
 * 페칭/검증 로직은 useDataValidation 훅이 담당하고, 페이지는 결과 주입과
 * 네비게이션(평가 실행 이력 저장 포함)만 처리하는 얇은 컨트롤러다.
 */
export function DataValidation() {
  const store = useWorkflowStore();
  const flow = useStepFlow("validation");
  const { activeWorkspaceId, addEvaluationRun } = useWorkspaceStore();
  // 이 흐름으로 마지막에 만든 run — 발급 전인데 옛 점검 표로 점검했으면 다시 확인하라고 알린다(점검 표 2.0).
  const lastRun = useWorkspaceStore((state) => state.evaluationRuns.find((run) => run.id === store.lastRunId));
  const { validationData, isLoading, error, buildEvaluationResult } = useDataValidation();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [gaps, setGaps] = useState<LayerOneGap[]>([]);
  const navigate = useNavigate();

  // 검증이 실패했거나 아예 수행되지 않은 경우(validationData === null)를 '오류 0건'으로
  // 읽지 않는다. 종전 판정 `(validationData?.error_count ?? 0) > 0` 은 그 둘을 `?? 0` 에
  // 흡수시켜, 검증 절이 통째로 빈 성적서를 발급 가능 상태까지 통과시켰다(E-04).
  const gateReason = getValidationGateReason({ validationData, isLoading, error });
  const gateMessage = describeValidationGate(gateReason);

  // 생성 전 안내(재료 선택 점검 6절). 판정은 성적서를 만드는 같은 경로(매퍼 → checkMaterialSelection)
  // 의 결과를 읽기만 한다. 검증이 끝나야 IR 을 셀 분포가 생긴다.
  let materialCheck: MaterialCheckResult | undefined;
  let newRunEdition4 = false; // 미리 만든 성적서에 찍힌 판(매퍼가 판 플래그로 정함) — 생성 전 안내 문장(부록 B28)
  if (gateReason === "ok") {
    try {
      const preview = buildEvaluationResult()?.reportData;
      materialCheck = preview?.materialCheck;
      newRunEdition4 = !!preview && usesSchema4(preview);
    } catch {
      materialCheck = undefined; // 안내는 보조다 — 실패해도 "다음"의 오류 처리가 알린다.
    }
  }

  const handleFix = (target: MaterialCheckTarget) => {
    if (target.kind === "step") {
      flow.goTo(target.stepId);
      return;
    }
    if (target.kind === "cardInput") {
      flow.goTo(target.stepId ?? getCard(target.cardId).steps[0]);
      return;
    }
    // 평가 흐름 만들기에서 그 블록(항목을 가리키면 그 항목)을 펼친다 — 넣지 않은 항목은 입력 화면에 칸이
    // 없다. 넣고 "다음"을 누르면 그 항목을 받는 입력 화면으로 돌아간다(`composerNextStep`).
    const entry: FlowEntryState = target.leafIds?.length
      ? { cardId: target.cardId, leafIds: target.leafIds, returnStep: stepOfLeaf(target.cardId, target.leafIds[0]) }
      : { cardId: target.cardId, returnStep: getCard(target.cardId).steps[0] };
    navigate("/app/composer", { state: entry });
  };
  /** 입력 화면에서 고칠 수 있는가 — 블록을 넣었고, 항목을 가리키면 그 항목을 받는지(`canFixInInputOf`). */
  const canFixInInput = (target: Extract<MaterialCheckTarget, { kind: "card" }>) =>
    canFixInInputOf(target, store.composerCards, store.materialPicks);

  // 이 핸들러에서 예외가 나면 React 는 잡아주지 않는다(ErrorBoundary 도 없음).
  // 감싸지 않으면 "버튼을 눌러도 아무 일도 안 일어나는" 무증상 실패가 된다.
  const handleNext = () => {
    setSubmitError(null);

    // 1층 — 없으면 성적서가 성립하지 않는다. 끝난 단계로 돌아가 필수 칸을 지운 경우를 막는다. ⑥~⑨ 화면 규칙 중
    // 빈칸이 아닌 것(범위·기간·배타·같은 이름 줄 등)도 다시 본다 — 단계 표시줄로 건너뛴 경우(점검 나-16).
    const state = useWorkflowStore.getState();
    const missingRequired = [...layerOneGaps(state), ...screenRuleGaps(state)];
    setGaps(missingRequired);
    if (missingRequired.length > 0) return;

    try {
      // 2·3층 — 막지 않는다. 지금 경고를 보고 진행한 사실을 기록한 뒤 성적서를 만든다(6절).
      const check = buildEvaluationResult().reportData.materialCheck;
      store.setMaterialCheckAck(
        check && check.warningIds.length > 0
          ? { at: new Date().toISOString(), version: check.version, warningIds: [...check.warningIds] }
          : null,
      );

      const { workflowSnapshot, reportData } = buildEvaluationResult();

      // 워크스페이스가 없으면 만든다(E-02). 종전에는 없을 때 계산해 둔
      // reportData 를 **버리고** /report/preview 로 갔고, 그 성적서는 어디에도
      // 저장되지 않아 발급·재조회가 전부 불가능했다.
      const workspaceId = ensureActiveWorkspace(store.basicInfo.modelName ?? "");

      const run = addEvaluationRun({
        workspaceId,
        modelName: store.basicInfo.modelName || "Untitled model",
        versionName: reportData.evalScope.version,
        reportId: reportData.meta.reportId,
        workflowSnapshot,
        reportData,
        // 성적서 화면은 지금 입력이 아니라 이 스냅샷으로 평가한다 — 다른 평가를 연 뒤 돌아와도 이 평가의 입력·파일로
        // 평가한다(서술 라운드 S3b, 점검 유-8). 파일은 지문만 남긴다.
        evaluationRequest: buildEvaluationRequestSnapshot(useWorkflowStore.getState()),
      });

      // 저장에 성공한 뒤에만 단계를 넘긴다(실패 시 검증 화면에 머물러 재시도 가능).
      // run id 를 남겨야 성적서를 벗어난 뒤 성적서 탭으로 돌아올 수 있다(E-16).
      store.setLastRunId(run.id);
      // 다음은 확인과 생성 — 검증은 모든 재료 입력 뒤, 성적서 바로 앞이다(docs/MATERIAL_PICKER.md
      // §3). 평가 API 는 성적서 화면에서 불린다. 단계 목록이 순서를 들고 있으므로 여기서 목적지를
      // 적지 않는다.
      //
      // run id 를 넘기는 이유: 방금 만든 run 이라 스토어에 아직 반영되지 않았을 수 있는데,
      // 목적지 경로(`/report/<runId>`)에는 이미 그 id 가 필요하다.
      flow.goNext({ runId: run.id });
    } catch (err) {
      console.error("평가 실행(성적서 생성) 실패:", err);
      setSubmitError(describeSubmitError(err));
    }
  };

  const handlePrevious = () => flow.goPrevious();

  return (
    <WorkflowShell
      showActionBar
      showPrevious={true}
      showNext={true}
      onPrevious={handlePrevious}
      onNext={handleNext}
      nextDisabled={gateReason !== "ok"}
      previousLabel="이전"
      nextLabel="다음"
    >
      <DataValidationContent
        validationData={validationData}
        isLoading={isLoading}
        error={error}
        notices={
          <>
            {submitError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            {gaps.length > 0 && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p>필수 입력이 비었거나 고쳐야 할 값이 있어 성적서를 만들 수 없습니다. 아래 화면에서 고친 뒤 다시 오세요.</p>
                  <ul aria-label="비어 있는 필수 입력" className="mt-2 flex flex-col gap-1">
                    {gaps.map((gap) => (
                      <li key={gap.stepId}>
                        <button
                          type="button"
                          onClick={() => flow.goTo(gap.stepId)}
                          className="underline underline-offset-4"
                        >
                          {gap.label}에서 {gap.invalid ? "고치기" : "채우기"}
                        </button>
                        {gap.details && (
                          <ul aria-label={`${gap.label} 문제`} className="mt-1 list-disc pl-5">
                            {gap.details.map((detail) => (
                              <li key={detail}>{detail}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {gateMessage && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{gateMessage}</AlertDescription>
              </Alert>
            )}
            <FileReuploadNotice />
            <MaterialCheckOutdatedNotice
              check={lastRun?.reportData?.materialCheck}
              active={!!lastRun && !lastRun.reportId && !lastRun.reportData?.meta?.reportId}
              edition4={!!lastRun?.reportData && usesSchema4(lastRun.reportData)}
            />
            {materialCheck && (
              <MaterialCheckNotice
                check={materialCheck}
                onFix={handleFix}
                canFixInInput={canFixInInput}
                edition4={newRunEdition4}
              />
            )}
            {/* 백엔드가 평가 데이터·매핑 단계에서 내려보낸 안내를 여기 합쳐 보여준다(B-03·B-04·A-12).
                그 화면들에서 띄우면 사용자는 이미 다음 단계로 넘어간 뒤라 읽지 못한다. */}
            <BackendNoticePanel
              columnNotes={store.columnNotes}
              mappingWarnings={store.mappingWarnings}
            />
          </>
        }
      />
    </WorkflowShell>
  );
}
