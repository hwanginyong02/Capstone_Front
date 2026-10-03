import { HelpCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Link, useNavigate } from "react-router";
import { TaskTypeIcon } from "../../components/task-type/TaskTypeIcon";
import { TASK_TYPE_LABELS } from "../../data/evaluationData";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";

/**
 * @param showTaskType 워크플로우 안에서만 분류 유형 배지를 띄운다. AppShell(워크스페이스·
 *   랜딩)은 특정 평가에 매여 있지 않으므로 기본값은 false 다.
 */
export function AppHeader({ showTaskType = false }: { showTaskType?: boolean }) {
  return (
    <header className="h-14 border-b border-border bg-card sticky top-0 z-50">
      <div className="h-full px-8 flex items-center justify-between max-w-[1344px] mx-auto">
        <Link to="/" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M3 12h4l3 9 4-18 3 9h4"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold leading-none">ML Evaluation</span>
            <span className="text-xs text-muted-foreground">ISO/IEC 4213 based</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {showTaskType && <TaskTypeBadge />}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

/**
 * 현재 분류 유형 배지 — 진입 화면에서 고른 도형이 그대로 따라온다(docs/UI_DESIGN.md §4).
 *
 * 종전에는 유형을 고르고 나면 화면 어디에도 표시가 없어, 2단계부터는 자기가 무슨 평가를
 * 하는 중인지 알 방법이 없었다.
 *
 * 클릭하면 진입 화면으로 돌아가 유형을 바꿀 수 있는데, `setTaskType` 이 2~6단계 입력을
 * **전부 리셋**하므로 경고 없이 보내지 않는다. 전용 Dialog 프리미티브가 아직 없어
 * `window.confirm` 을 쓴다 — 되돌릴 수 없는 작업이라 확인 자체가 없는 것보다 낫다.
 */
function TaskTypeBadge() {
  const navigate = useNavigate();
  const taskType = useWorkflowStore((s) => s.taskType);
  const completedStepIds = useWorkflowStore((s) => s.completedStepIds);

  if (!taskType) return null;

  const handleClick = () => {
    // 아직 아무 단계도 마치지 않았다면 잃을 것이 없다 — 확인 없이 보낸다.
    const hasWorkToLose = completedStepIds.length > 0;
    if (hasWorkToLose) {
      const ok = window.confirm(
        "Changing the classifier type clears the metrics, uploaded data, and column mapping you have entered. Continue?",
      );
      if (!ok) return;
    }
    navigate("/app");
  };

  return (
    <Badge
      variant="secondary"
      asChild
      className="cursor-pointer gap-1.5 py-1 pl-2 pr-2.5 hover:bg-secondary/80"
    >
      <button type="button" onClick={handleClick} title="Change classifier type">
        <TaskTypeIcon type={taskType} size={16} />
        {TASK_TYPE_LABELS[taskType]}
      </button>
    </Badge>
  );
}
