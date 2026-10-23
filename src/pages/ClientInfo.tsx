import { Navigate } from "react-router";
import { WorkflowShell } from "../layout/WorkflowShell";
import { ClientInfoForm, isClientInfoValid } from "../components/basic-info/BasicInfo";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { RemainingNotice } from "../components/composer-input/RemainingNotice";
import { basicInfoIssues, clientInfoGaps } from "../utils/domain/basicInfoValidity";

/**
 * 의뢰자 정보 (`/app/client-info`) — 재료 고르기에서 정한 순서의 한 단계(docs/MATERIAL_PICKER.md §11).
 *
 * ③ 만 받는다. 종전 Details 화면은 ④ 모델 용도와 ② 합격 기준·핵심 지표까지 함께 받았는데, 이제
 * 그것들은 각자 카드의 단계가 받는다(§5). 선택 항목은 재료 고르기에서 체크한 것만 보인다.
 *
 * 여기 모인 것은 평가 계산에 쓰이지 않는다 — 성적서 1절과 판정 문서를 그릴 때만 쓰인다.
 * 첫 단계면 이전은 재료 고르기로 간다(`useStepFlow`). 유형을 고르지 않고 URL 로 들어오면 작업
 * 유형 화면으로 보낸다.
 */
export function ClientInfo() {
  const store = useWorkflowStore();
  const flow = useStepFlow("clientInfo");

  if (!store.taskType) return <Navigate to="/app" replace />;

  return (
    <WorkflowShell
      showActionBar
      showPrevious
      showNext
      onPrevious={() => flow.goPrevious()}
      onNext={() => flow.goNext()}
      nextDisabled={!isClientInfoValid(store.basicInfo)}
      // 비활성 "다음" 옆에 무엇이 비었는지 말한다(작성 화면의 RemainingNotice 꼴, 점검 다-8).
      rightAction={<RemainingNotice issues={basicInfoIssues("clientInfo", clientInfoGaps(store.basicInfo))} />}
      previousLabel="이전"
      nextLabel="다음"
    >
      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pt-12 pb-24">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">의뢰자 정보</h1>
          <p className="text-sm text-muted-foreground">
            성적서를 받는 회사와 용도입니다. 성적서 1절에 들어가고, 측정 결과는 바꾸지 않습니다.
          </p>
        </div>
        <ClientInfoForm
          formData={store.basicInfo}
          onFormDataChange={store.setBasicInfo}
          picks={store.materialPicks.clientInfo}
        />
      </main>
    </WorkflowShell>
  );
}
