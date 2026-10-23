/**
 * ⑨ 모델 설정과 실행 환경.
 *
 * 선택 카드라 재료 고르기에서 항목을 골라 저장했을 때만 이 단계가 생긴다. 고른 항목만 받고,
 * 받기로 한 항목은 비울 수 없으며 모르면 "모름"을 고른다(docs/MATERIAL_PICKER.md §6).
 *
 * 실행 환경 다섯 칸은 성적서가 `basicInfo.env*` 로 옮겨 읽는다(`buildReportInput`). 종전의
 * Details "시험 환경" 폼은 없앴다 — 같은 값을 두 곳에서 받던 중복이다.
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
  /** 빈 필수 칸을 빨갛게 칠할지. 페이지가 다음을 누른 뒤에 켠다. */
  showErrors?: boolean;
  /** 재료 고르기에서 ⑨ 에 고른 항목. */
  picks?: readonly string[];
}

export function ModelEnv({
  taskType,
  values,
  onChange,
  issues,
  showErrors = false,
  picks,
}: ModelEnvProps) {
  return (
    <main className="mx-auto max-w-[1344px] space-y-6 px-8 pt-12 pb-24">
      <div>
        <h1 className="text-heading-large font-bold text-foreground">모델 설정과 실행 환경</h1>
        <p className="mt-1 text-body-medium text-muted-foreground">
          모델을 어떻게 설정했고 어디서 실행했는지입니다. 모르는 것은 모름을 고르세요.
        </p>
      </div>

      <ComposerCardForm
        card={getCard("modelEnv")}
        taskType={taskType}
        values={values}
        onChange={onChange}
        issues={issues}
        showErrors={showErrors}
        picks={picks}
      />
    </main>
  );
}
