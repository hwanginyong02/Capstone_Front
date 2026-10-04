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
import { countAdvancedFields, getCardFields } from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCard,
  ComposerFieldValue,
  ComposerValueMap,
} from "../../types/reportComposer.types";
import { isFieldVisible, type FieldIssue } from "../../utils/domain/composerFieldGate";

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

  // 조건이 성립하지 않은 조건부 필드는 그리지 않는다 — "특정 조건에서만 나타난다".
  const fields = getCardFields(card.id, taskType, { includeAdvanced: showAdvanced }).filter(
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
                invalid={issue?.reason === "exclusive" || (showErrors && Boolean(issue))}
              />
              {issue?.reason === "exclusive" && (
                <p className="mt-1 text-body-small text-destructive">
                  {field.exclusiveChoice} cannot be combined with the others.
                </p>
              )}
              {showErrors && issue?.reason === "missing" && (
                <p className="mt-1 text-body-small text-destructive">
                  Required.{issue.allowsUnknown && " Choose Unknown if you do not know."}
                </p>
              )}
            </div>
          );
        })}

        {advancedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="text-body-medium font-medium"
          >
            {showAdvanced ? "Hide optional fields" : "Show " + advancedCount + (advancedCount === 1 ? " optional field" : " optional fields")}
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
