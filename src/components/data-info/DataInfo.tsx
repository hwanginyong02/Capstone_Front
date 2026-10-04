/**
 * ⑥ 학습 데이터 · ⑦ 테스트 데이터 · ⑧ 정답 라벨 — 켠 카드만.
 *
 * 셋 중 하나라도 켜면 이 단계가 생기고, 켠 카드의 폼만 그린다
 * (docs/COMPOSER_COMPONENTS.md "카드별 입력 단계"). 셋을 한 화면에 묶은 이유는 같은
 * 데이터 이야기이고, 각각을 단계로 쪼개면 성적서까지 가는 길이 두 화면 더 길어지기 때문이다.
 *
 * ⑥ 의 클래스별 데이터 양은 **업로드한 파일의 클래스 목록으로 칸을 만든다** — 그래서 이
 * 단계가 업로드 뒤에 있어야 한다.
 */
import { ComposerCardForm } from "../composer-input/ComposerCardForm";
import { getCard } from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCardId,
  ComposerFieldValue,
  ComposerValueMap,
} from "../../types/reportComposer.types";
import type { FieldIssue } from "../../utils/domain/composerFieldGate";

/** 이 단계가 받는 카드. 배열 순서가 화면 순서다. */
export const DATA_INFO_CARDS: ComposerCardId[] = ["trainingData", "testData", "groundTruth"];

interface DataInfoProps {
  taskType: TaskType | "";
  /** 켜져 있어 그릴 카드. 하나도 없으면 이 단계 자체가 목록에 없다. */
  includedCards: ComposerCardId[];
  valuesOf: (cardId: ComposerCardId) => ComposerValueMap;
  onChange: (cardId: ComposerCardId, fieldId: string, next: ComposerFieldValue) => void;
  issues: FieldIssue[];
  /** 업로드한 파일에서 찾은 클래스. ⑥ 클래스별 데이터 양의 칸이 된다. */
  classNames?: string[];
}

export function DataInfo({
  taskType,
  includedCards,
  valuesOf,
  onChange,
  issues,
  classNames,
}: DataInfoProps) {
  return (
    <main className="mx-auto max-w-[1344px] space-y-6 px-8 pt-12 pb-24">
      <div>
        <h1 className="text-heading-large font-bold text-foreground">Data info</h1>
        <p className="mt-1 text-body-medium text-muted-foreground">
          The cards you added to the report ask for these. Choose Unknown for anything you do
          not know.
        </p>
      </div>

      {DATA_INFO_CARDS.filter((id) => includedCards.includes(id)).map((id) => (
        <ComposerCardForm
          key={id}
          card={getCard(id)}
          taskType={taskType}
          values={valuesOf(id)}
          onChange={(fieldId, next) => onChange(id, fieldId, next)}
          issues={issues.filter((issue) => issue.cardId === id)}
          classNames={classNames}
        />
      ))}
    </main>
  );
}
