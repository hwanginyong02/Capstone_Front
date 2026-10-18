/**
 * 카드 하나의 입력 폼.
 *
 * 재료 고르기에서 고른 그 카드가 여기서 실제 입력란이 된다. 필수 필드는 늘 보이고, 권장·선택
 * 필드는 재료 고르기에서 고른 것만 보인다(`picks`, docs/MATERIAL_PICKER.md §5). 받기로
 * 한 선택 필드는 접지 않고 바로 보인다 — 고른 것 자체가 그 칸을 쓰겠다는 뜻이다. 카드의 도움말은
 * 아래에 둔다.
 *
 * 넣지 않은 카드는 **아예 그리지 않는다** — 그 카드의 단계 자체가 생기지 않는다.
 */
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ComposerFieldInput } from "./ComposerFieldInput";
import { choiceLabel, getCardFields, isFieldPicked } from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCard,
  ComposerFieldValue,
  ComposerValueMap,
  NumberRange,
} from "../../types/reportComposer.types";
import { isFieldVisible, rangeFor, type FieldIssue } from "../../utils/domain/composerFieldGate";

/** 숫자 칸의 허용 범위를 문장으로. 무엇이 틀렸는지가 아니라 무엇을 넣으면 되는지를 말한다. */
function describeRange(range: NumberRange): string {
  const kind = range.integer ? "정수" : "숫자";
  if (range.max === undefined) return `${range.min} 이상의 ${kind}를 넣으세요.`;
  return `${range.min}~${range.max} 사이의 ${kind}를 넣으세요.`;
}

interface ComposerCardFormProps {
  card: ComposerCard;
  taskType: TaskType | "";
  values: ComposerValueMap;
  onChange: (fieldId: string, next: ComposerFieldValue) => void;
  /** 지금 걸려 있는 문제. 해당 필드에 표시만 하고 진행 차단은 페이지가 한다. */
  issues: FieldIssue[];
  classNames?: string[];
  /**
   * 빈 필수 칸을 빨갛게 칠할지. 페이지가 **다음을 누른 뒤에** 켠다.
   *
   * 화면에 들어오자마자 켜면 아무것도 하지 않은 사용자를 꾸짖는 꼴이 된다. 반대로 끝까지
   * 켜지 않으면 막힌 이유가 하단 한 줄에만 남아, 긴 폼에서는 어느 칸인지 못 찾는다.
   */
  showErrors?: boolean;
  /** 재료 고르기에서 이 카드에 고른 항목. 없으면 모든 필드를 그린다. */
  picks?: readonly string[];
}

export function ComposerCardForm({
  card,
  taskType,
  values,
  onChange,
  issues,
  classNames,
  showErrors = false,
  picks,
}: ComposerCardFormProps) {
  // 받지 않기로 한 필드, 조건이 성립하지 않은 조건부 필드, 전용 화면이 받는 필드(⑥ 예시 파일)는
  // 그리지 않는다.
  const fields = getCardFields(card.id, taskType).filter(
    (field) => !field.dedicatedScreen && isFieldVisible(field, values, isFieldPicked(card, field, picks)),
  );
  const issueOf = (fieldId: string) => issues.find((issue) => issue.fieldId === fieldId);

  return (
    <Card className="gap-0 rounded-lg border-border bg-card">
      <CardHeader className="p-6">
        <h2 className="text-heading-medium font-semibold text-foreground">{card.name}</h2>
        <p className="mt-2 text-body-small text-muted-foreground">{card.description}</p>
      </CardHeader>

      <CardContent className="space-y-5 p-6 pt-0">
        {fields.map((field) => {
          const issue = issueOf(field.id);

          return (
            <div key={field.id}>
              <ComposerFieldInput
                field={field}
                value={values[field.id]}
                onChange={(next) => onChange(field.id, next)}
                classNames={classNames}
                siblingValues={values}
                /**
                 * **비어 있는 것은 아직 잘못이 아니다.** 들어오자마자 필수 칸을 빨갛게
                 * 칠하면 아무 일도 하지 않은 사용자를 꾸짖는 꼴이 된다. 잘못 고른 경우
                 * (배타 선택)는 지금 당장 틀린 것이라 바로 표시하고, 비어 있는 것은
                 * 사용자가 넘어가려 한 뒤에야 표시한다.
                 */
                invalid={(issue && issue.reason !== "missing") || (showErrors && Boolean(issue))}
              />
              {issue?.reason === "exclusive" && (
                <p className="mt-1 text-body-small text-destructive">
                  다른 선택지와 함께 고를 수 없는 답입니다: {choiceLabel(field, field.exclusiveChoice ?? "")}
                </p>
              )}
              {issue?.reason === "outOfRange" && (issue.message || rangeFor(field, values)) && (
                <p className="mt-1 text-body-small text-destructive">
                  {issue.message ?? describeRange(rangeFor(field, values)!)}
                </p>
              )}
              {issue?.reason === "incompatible" && issue.message && (
                <p className="mt-1 text-body-small text-destructive">{issue.message}</p>
              )}
              {issue?.reason === "invalidPeriod" && (
                <p className="mt-1 text-body-small text-destructive">
                  시작 월과 끝 월을 모두 넣고, 시작 월이 끝 월보다 늦지 않게 하세요.
                </p>
              )}
              {showErrors && issue?.reason === "missing" && (
                <p className="mt-1 text-body-small text-destructive">
                  필수 항목입니다.{issue.allowsUnknown && " 모르면 모름을 고르세요."}
                </p>
              )}
            </div>
          );
        })}

        {card.help && (
          <div className="flex gap-2 border-t border-border pt-5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-body-small text-muted-foreground">{card.help}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
