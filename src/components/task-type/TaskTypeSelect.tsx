/**
 * 분류 유형 선택 화면 — 워크플로우 진입점(docs/UI_DESIGN.md §3).
 *
 * 종전에는 `basic-info` 세 번째 카드 맨 아래의 라디오 카드였다. `task_type` 은 노출 지표·
 * 요구 컬럼·매핑 가능 역할·예측 파생 방식·임계값 형태를 전부 가르는데(evaluationData.ts),
 * 필수 입력 12개 중 **마지막**에 놓여 있었다. 앱 전체를 가르는 분기점이 폼 필드 하나와
 * 같은 무게였다.
 *
 * **카드 클릭 = 즉시 진행.** 라디오 인디케이터를 두지 않는다 — 선택 상태를 보여줄 시간이
 * 없고, 넣으면 "고르고 → 다음 버튼" 두 동작이 된다.
 *
 * 세 카드의 설명은 **같은 문장 골격**("Assign ___ to each sample.")을 쓴다. 나란히 읽을 때
 * 바뀌는 부분만 눈에 들어와야 차이가 드러난다. 문구의 언어는 추후 일괄 정리한다.
 */
import { Card } from "../ui/card";
import { cn } from "../../utils/styling/styles";
import { TASK_TYPE_LABELS_KO, type TaskType } from "../../data/evaluationData";
import { TaskTypeIcon } from "./TaskTypeIcon";

interface TaskTypeOption {
  type: TaskType;
  /** 같은 골격을 공유하는 한 줄 설명. */
  description: string;
  /** 추상 설명만으로는 multiclass/multilabel 이 구분되지 않아 붙이는 구체 예시. */
  example: string;
}

const OPTIONS: TaskTypeOption[] = [
  {
    type: "binary",
    description: "샘플 하나를 두 범주 중 하나로 나눕니다.",
    example: "합격 / 불합격",
  },
  {
    type: "multiclass",
    description: "샘플 하나를 여러 범주 중 하나로 나눕니다.",
    example: "고양이 · 개 · 새",
  },
  {
    type: "multilabel",
    description: "샘플 하나에 맞는 범주를 여러 개 붙입니다.",
    example: "고양이 + 실외 + 밤",
  },
];

interface TaskTypeSelectProps {
  /** 현재 선택된 유형. 되돌아왔을 때 어느 것을 골랐는지 표시하는 용도. */
  selected: TaskType | "";
  onSelect: (type: TaskType) => void;
}

export function TaskTypeSelect({ selected, onSelect }: TaskTypeSelectProps) {
  return (
    // 바깥 컨테이너(max-width·좌우 패딩)는 AppShell 의 <main> 이 준다. 여기서 또 감싸지 않는다.
    <div className="pt-4">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          어떤 분류 모델을 평가하나요?
        </h1>
        <p className="text-sm text-muted-foreground">
          고른 유형에 따라 지표, 필요한 컬럼, 검증 규칙이 달라집니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {OPTIONS.map((option) => {
          const isSelected = selected === option.type;

          return (
            <Card
              key={option.type}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(option.type)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(option.type);
                }
              }}
              className={cn(
                "flex flex-col gap-4 p-6 cursor-pointer border-2 transition-colors text-left",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                isSelected
                  ? "border-primary bg-primary-subtle text-primary"
                  : "border-border bg-card hover:border-border-strong",
              )}
            >
              {/* 아이콘은 크게 — 세 카드를 훑을 때 도형이 먼저 눈에 들어와야 한다. */}
              <TaskTypeIcon type={option.type} size={40} />

              <div className="space-y-1.5">
                <div className="text-base font-semibold text-foreground">
                  {TASK_TYPE_LABELS_KO[option.type]}
                </div>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>

              <div className="mt-auto pt-2 font-mono text-xs text-muted-foreground">
                {option.example}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
