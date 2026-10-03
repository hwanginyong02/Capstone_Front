/**
 * ⑨ 모델 설정과 실행 환경.
 *
 * 선택 카드라 켰을 때만 이 단계가 생긴다. 켰으면 안의 필수 항목은 반드시 입력하고, 모르면
 * "모름"을 고른다(docs/COMPOSER_COMPONENTS.md 열린 결정).
 *
 * 기존 `basicInfo.env*` 와 내용이 겹치지만 그쪽은 성적서를 그리는 데 쓰이므로 건드리지 않았다.
 * 중복 정리는 별도 작업이다.
 */
import { ComposerCardForm } from "../composer-input/ComposerCardForm";
import { getCard } from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerFieldValue, ComposerValueMap } from "../../types/reportComposer.types";
import type { FieldIssue } from "../../utils/domain/composerFieldGate";

interface ModelEnvProps {
  taskType: TaskType | "";
  values: ComposerValueMap;
  onChange: (fieldId: string, next: ComposerFieldValue) => void;
  issues: FieldIssue[];
}

export function ModelEnv({ taskType, values, onChange, issues }: ModelEnvProps) {
  return (
    <main className="mx-auto max-w-[1344px] space-y-6 px-8 pt-12 pb-24">
      <div>
        <h1 className="text-heading-large font-bold text-foreground">모델과 환경</h1>
        <p className="mt-1 text-body-medium text-muted-foreground">
          모델 설정값과 실행한 컴퓨터를 적습니다. 모르는 항목은 모름을 고르세요.
        </p>
      </div>

      <ComposerCardForm
        card={getCard("modelEnv")}
        taskType={taskType}
        values={values}
        onChange={onChange}
        issues={issues}
      />
    </main>
  );
}
