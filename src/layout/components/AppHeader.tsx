import { HelpCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { badgeVariants } from "../../components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { Link, useNavigate } from "react-router";
import { TaskTypeIcon } from "../../components/task-type/TaskTypeIcon";
import { TASK_TYPE_DESCRIPTIONS_KO, TASK_TYPE_LABELS_KO } from "../../data/evaluationData";
import { cn } from "../../utils/styling/styles";
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
            <span className="text-base font-semibold leading-none">ML 성능평가</span>
            <span className="text-xs text-muted-foreground">ISO/IEC 4213 기반</span>
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
 * 클릭하면 진입 화면으로 돌아가 유형을 바꿀 수 있는데, `setTaskType` 이 이후 단계 입력을
 * **전부 리셋**하므로 경고 없이 보내지 않는다. 전용 Dialog 프리미티브가 아직 없어
 * `window.confirm` 을 쓴다 — 되돌릴 수 없는 작업이라 확인 자체가 없는 것보다 낫다.
 *
 * 배지만으로는 "다중 레이블"이 무엇의 이름인지 몰랐다(요청서 6장). 왼쪽에 "분류 유형" 글자를 보이고,
 * 버튼 이름도 "분류 유형: {유형}"으로 읽힌다. 설명은 `title` 대신 툴팁으로 — 키보드 포커스에도 뜬다
 * (U2). 유형 설명 문장은 진입 화면과 같은 `TASK_TYPE_DESCRIPTIONS_KO` 한 벌이다
 * (docs/MATERIAL_PICKER.md §12.3).
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
        "분류 유형을 바꾸면 고른 지표, 올린 데이터, 컬럼 매핑이 모두 지워집니다. 계속할까요?",
      );
      if (!ok) return;
    }
    navigate("/app");
  };

  const label = TASK_TYPE_LABELS_KO[taskType];

  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="hidden text-xs text-muted-foreground sm:inline">
        분류 유형
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Badge 는 ref 를 넘기지 않아(React 18) 툴팁 기준이 될 수 없다 — 버튼에 배지 모양만 입힌다. */}
          <button
            type="button"
            onClick={handleClick}
            aria-label={`분류 유형: ${label}`}
            className={cn(
              badgeVariants({ variant: "secondary" }),
              "cursor-pointer gap-1.5 py-1 pl-2 pr-2.5 hover:bg-secondary/80",
            )}
          >
            <TaskTypeIcon type={taskType} size={16} />
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="flex flex-col gap-1">
          <span className="font-medium">분류 유형: {label}</span>
          <span>{TASK_TYPE_DESCRIPTIONS_KO[taskType]}</span>
          <span>누르면 분류 유형을 바꿀 수 있어요. 바꾸면 고른 지표·올린 데이터·컬럼 매핑이 지워져요.</span>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
