/**
 * 카드 하나의 입력 폼.
 *
 * 성적서 구성 화면에서 본 그 카드가 여기서 실제 입력란이 된다. 더보기로 접히는 필드는 같은
 * 규칙으로 접어 두고(선택 항목이라 비워도 진행할 수 있다), 카드의 도움말을 아래에 둔다.
 *
 * 켜지 않은 카드는 **아예 그리지 않는다** — 7단계는 ⑥ ⑦ ⑧ 중 켠 카드만 받는다
 * (docs/COMPOSER_COMPONENTS.md "카드별 입력 단계").
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ComposerFieldInput } from "./ComposerFieldInput";
import { choiceLabel, countAdvancedFields, getCardFields } from "../../data/reportComposer";
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
}

export function ComposerCardForm({
  card,
  taskType,
  values,
  onChange,
  issues,
  classNames,
  showErrors = false,
}: ComposerCardFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 더보기 안의 칸이 틀렸으면(범위 밖 숫자, 뒤집힌 기간) 접어 두지 않는다 — 접힌 채로 막히면
  // 무엇 때문인지 찾을 수 없다.
  const advancedHasIssue = getCardFields(card.id, taskType).some(
    (field) => field.advanced && issues.some((issue) => issue.fieldId === field.id),
  );
  const expanded = showAdvanced || advancedHasIssue;

  // 조건이 성립하지 않은 조건부 필드는 그리지 않는다 — "특정 조건에서만 나타난다".
  const fields = getCardFields(card.id, taskType, { includeAdvanced: expanded }).filter(
    (field) => isFieldVisible(field, values),
  );
  const advancedCount = countAdvancedFields(card.id, taskType);
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
              {issue?.reason === "outOfRange" && rangeFor(field, values) && (
                <p className="mt-1 text-body-small text-destructive">
                  {describeRange(rangeFor(field, values)!)}
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

        {advancedCount > 0 && !advancedHasIssue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="text-body-medium font-medium"
          >
            {showAdvanced ? "선택 항목 접기" : "선택 항목 " + advancedCount + "개 더 보기"}
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}

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
