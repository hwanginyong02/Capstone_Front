import { useNavigate } from "react-router";
import { AppShell } from "../layout/AppShell";
import { TaskTypeSelect as TaskTypeSelectContent } from "../components/task-type/TaskTypeSelect";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import type { TaskType } from "../data/evaluationData";

/**
 * 워크플로우 진입 화면 (`/app`) — 분류 유형 선택.
 *
 * 스텝 워크플로우에 들어가기 **전** 이므로 `WorkflowShell`(StepTabs·ActionBar)이 아니라
 * 경량 `AppShell` 을 쓴다.
 *
 * `setTaskType` 은 뒤 단계 입력을 전부 리셋한다(선택이 바뀌면 뒤 단계의 근거가 사라지므로).
 * 그래서 **같은 유형을 다시 고른 경우에는 호출하지 않는다** — 되돌아와서 원래 것을 다시
 * 누른 사용자의 작업을 지우지 않기 위해서다.
 */
export function TaskTypeSelect() {
  const navigate = useNavigate();
  const taskType = useWorkflowStore((s) => s.taskType);

  const handleSelect = (type: TaskType) => {
    const store = useWorkflowStore.getState();

    if (store.taskType !== type) {
      store.setTaskType(type);
      // basicInfo.taskType 도 함께 맞춘다 — 성적서 렌더와 1단계 유효성 판정이 이 값을 본다.
      store.setBasicInfo((prev) => ({ ...prev, taskType: type }));
    }

    // 유형을 고르면 성적서 구성 화면으로 간다 — 무엇을 넣을지 먼저 정하고 나서야 걸을
    // 단계가 정해진다(docs/COMPOSER_COMPONENTS.md "카드별 입력 단계").
    navigate("/app/composer");
  };

  return (
    <AppShell>
      <TaskTypeSelectContent selected={taskType} onSelect={handleSelect} />
    </AppShell>
  );
}
