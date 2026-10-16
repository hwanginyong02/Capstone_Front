/**
 * ⑥ 학습 데이터 · ⑦ 테스트 데이터 · ⑧ 정답 라벨 — 카드 하나의 입력 화면.
 *
 * 종전에는 셋을 "데이터 정보" 한 단계에 묶었다. 사용자가 입력 순서를 정하면서 셋이 떨어질 수
 * 있게 돼 카드마다 한 단계가 됐다(docs/MATERIAL_PICKER.md §11).
 *
 * ⑥ 의 클래스별 데이터 양은 **업로드한 파일의 클래스 목록으로 칸을 만든다** — 그래서 학습
 * 데이터는 평가 데이터 뒤에만 놓을 수 있다(`ORDER_RULES`).
 */
import type { ReactNode } from "react";
import { ComposerCardForm } from "../composer-input/ComposerCardForm";
import { getCard } from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerFieldValue, ComposerValueMap } from "../../types/reportComposer.types";
import type { FieldIssue } from "../../utils/domain/composerFieldGate";

/** 이 화면이 받는 카드. 카드마다 한 단계다. */
export const DATA_INFO_CARDS = ["trainingData", "testData", "groundTruth"] as const;
export type DataInfoCardId = (typeof DATA_INFO_CARDS)[number];

interface DataInfoProps {
  taskType: TaskType | "";
  cardId: DataInfoCardId;
  /** 재료 고르기에서 고른 항목. 고르지 않은 권장·선택 필드는 그리지 않는다. */
  picks?: readonly string[];
  values: ComposerValueMap;
  onChange: (fieldId: string, next: ComposerFieldValue) => void;
  issues: FieldIssue[];
  /** 업로드한 파일에서 찾은 클래스. ⑥ 클래스별 데이터 양의 칸이 된다. */
  classNames?: string[];
  /** 빈 필수 칸을 빨갛게 칠할지. 페이지가 다음을 누른 뒤에 켠다. */
  showErrors?: boolean;
  /** 카드 아래에 붙일 것. 레지스트리로 그릴 수 없는 입력(⑥ 의 예시 파일 업로드)이다. */
  after?: ReactNode;
}

export function DataInfo({
  taskType,
  cardId,
  picks,
  values,
  onChange,
  issues,
  classNames,
  showErrors = false,
  after,
}: DataInfoProps) {
  const card = getCard(cardId);
  return (
    <main className="mx-auto max-w-[1344px] space-y-6 px-8 pt-12 pb-24">
      <div>
        <h1 className="text-heading-large font-bold text-foreground">{card.name}</h1>
        <p className="mt-1 text-body-medium text-muted-foreground">
          {card.description} 모르는 것은 모름을 고르세요.
        </p>
      </div>

      <ComposerCardForm
        card={card}
        taskType={taskType}
        values={values}
        onChange={onChange}
        issues={issues}
        classNames={classNames}
        showErrors={showErrors}
        picks={picks}
      />
      {after}
    </main>
  );
}
