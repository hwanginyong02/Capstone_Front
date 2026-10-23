import { WorkflowShell } from "../layout/WorkflowShell";
import { ModelInfoForm, isModelInfoValid } from "../components/basic-info/BasicInfo";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { RemainingNotice } from "../components/composer-input/RemainingNotice";
import { basicInfoIssues, modelInfoGaps } from "../utils/domain/basicInfoValidity";

/**
 * 평가 대상 모델 (`/app/model`) — 의뢰자 정보 다음(docs/MATERIAL_PICKER.md §3).
 *
 * ④ 를 한 화면에서 받는다. 종전에는 이름·버전을 업로드 화면이, 용도를 Details 가 따로 받았다(§5).
 * 이름·버전은 검증에서 run 을 만들 때 워크스페이스에서 이 평가를 가리키는 이름표가 되므로 비울
 * 수 없다 — 빈 채로 통과하면 run 이 "Untitled model" 로 저장된다.
 */
export function ModelInfo() {
  const store = useWorkflowStore();
  const flow = useStepFlow("model");

  return (
    <WorkflowShell
      showActionBar
      showPrevious
      showNext
      onPrevious={() => flow.goPrevious()}
      onNext={() => flow.goNext()}
      nextDisabled={!isModelInfoValid(store.basicInfo)}
      // 비활성 "다음" 옆에 무엇이 비었는지 말한다(작성 화면의 RemainingNotice 꼴, 점검 다-8).
      rightAction={<RemainingNotice issues={basicInfoIssues("model", modelInfoGaps(store.basicInfo))} />}
      previousLabel="이전"
      nextLabel="다음"
    >
      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pt-12 pb-24">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">평가 대상 모델</h1>
          <p className="text-sm text-muted-foreground">
            시험 대상 모델의 이름과 쓰임새입니다. 성적서 1절과 2절에 적힙니다.
          </p>
        </div>
        <ModelInfoForm formData={store.basicInfo} onFormDataChange={store.setBasicInfo} />
      </main>
    </WorkflowShell>
  );
}
