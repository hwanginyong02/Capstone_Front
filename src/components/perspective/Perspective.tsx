/**
 * ⑤ 평가 관점 — 이 모델에서 무엇을 중요하게 볼지.
 *
 * 지표 선택 **바로 앞**에 온다. 평가 관점이 지표 점검의 기준이라, 먼저 받아야 "놓침이 더
 * 위험하니 Recall 을 권한다"처럼 지표를 골라 줄 수 있다(docs/COMPOSER_COMPONENTS.md).
 *
 * 사용자는 유형과 무관하게 **항상 두 개**를 답한다 — 이진은 중요 오류 유형, 그 외는 클래스
 * 중요도, 거기에 사용 방식이 더해진다. 어느 질문을 띄울지는 레지스트리가 정한다.
 *
 * 값은 지금 **저장만 한다.** 지표 추천·경고와 성적서 인쇄는 이번 범위가 아니다.
 */
import { ComposerCardForm } from "../composer-input/ComposerCardForm";
import { getCard } from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerFieldValue, ComposerValueMap } from "../../types/reportComposer.types";
import type { FieldIssue } from "../../utils/domain/composerFieldGate";

interface PerspectiveProps {
  taskType: TaskType | "";
  values: ComposerValueMap;
  onChange: (fieldId: string, next: ComposerFieldValue) => void;
  issues: FieldIssue[];
}

export function Perspective({ taskType, values, onChange, issues }: PerspectiveProps) {
  return (
    <main className="mx-auto max-w-[1344px] space-y-6 px-8 pt-12 pb-24">
      <div>
        <h1 className="text-heading-large font-bold text-foreground">평가 관점</h1>
        <p className="mt-1 text-body-medium text-muted-foreground">
          이 모델에서 무엇을 중요하게 볼지 알려주세요. 다음 단계의 지표 선택에 쓰입니다.
        </p>
      </div>

      <ComposerCardForm
        card={getCard("perspective")}
        taskType={taskType}
        values={values}
        onChange={onChange}
        issues={issues}
      />
    </main>
  );
}
