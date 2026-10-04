/**
 * 레지스트리의 필드 하나를 입력 컨트롤로 그린다.
 *
 * 화면마다 폼을 따로 쓰지 않고 **레지스트리가 그리는 방식을 정한다**(`field.input`). 필드를
 * 더하거나 선택지를 고치는 일이 `data/reportComposer.ts` 한 곳에서 끝나야, 문서와 화면이
 * 어긋나지 않는다.
 *
 * "Unknown" 을 고르면 컨트롤을 잠근다 — 값과 모름이 동시에 남아 어느 쪽이 참인지 모르게 되는
 * 상태를 만들지 않는다. 성적서에는 "제공되지 않음"으로 찍힌다(이번 범위에서는 저장까지만).
 */
import { Plus, X } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { TEXTAREA_CLASS } from "../data-upload/shared";
import { cn } from "../../utils/styling/styles";
import { isFieldRequired } from "../../utils/domain/composerFieldGate";
import type {
  ComposerField,
  ComposerFieldValue,
  ComposerValueMap,
} from "../../types/reportComposer.types";

/**
 * 선택지 한 줄의 모양. 구성 화면의 카드와 같은 규칙이다
 * (`report-composer/ComposerCard.tsx`): 고른 것은 굵은 파란 테두리 + 연한 파랑 바탕.
 *
 * 줄 전체가 `<label>` 이라 글자를 눌러도 골라진다 — 16px 짜리 표식 하나만 누를 수 있으면
 * 과녁이 너무 작다. 고른 줄은 테두리가 1px 두꺼워지므로 여백을 1px 줄여 줄 높이를 지킨다.
 */
const TILE_BASE =
  "flex cursor-pointer items-center gap-3 rounded-md transition-colors has-disabled:cursor-not-allowed";
const TILE_ON = "border-2 border-primary bg-primary-subtle p-[11px]";
const TILE_OFF = "border border-border bg-card p-3 hover:border-border-strong";

interface ComposerFieldInputProps {
  field: ComposerField;
  value: ComposerFieldValue | undefined;
  onChange: (next: ComposerFieldValue) => void;
  /** `entryKeysFrom: "classes"` 가 쓸 클래스 목록. 업로드한 파일에서 온다. */
  classNames?: string[];
  /** 점검에 걸린 필드. 비어 있다는 사실만 표시하고 문구로 꾸짖지 않는다. */
  invalid?: boolean;
  /**
   * 카드 전체의 값. 별표를 붙일지 정하는 데만 쓴다 — 조건부 필드는 같은 카드의 다른 답이
   * 특정 값일 때만 필수가 되므로(`isFieldRequired`), 이 필드 하나만 봐서는 알 수 없다.
   */
  siblingValues?: ComposerValueMap;
}

export function ComposerFieldInput({
  field,
  value,
  onChange,
  classNames = [],
  invalid = false,
  siblingValues = {},
}: ComposerFieldInputProps) {
  const unknown = Boolean(value?.unknown);
  const entries = value?.entries ?? [];
  const chosen = value?.choices ?? [];

  const setText = (text: string) => onChange({ ...value, text, unknown: false });
  const setEntry = (key: string, next: string) => {
    const rest = entries.filter((entry) => entry.key !== key);
    onChange({ ...value, entries: [...rest, { key, value: next }], unknown: false });
  };
  const entryValue = (key: string) => entries.find((entry) => entry.key === key)?.value ?? "";

  const toggleChoice = (choice: string) => {
    const has = chosen.includes(choice);
    let next = has ? chosen.filter((c) => c !== choice) : [...chosen, choice];
    // 배타 선택지는 혼자만 남는다 — 고르면 나머지를 치우고, 다른 것을 고르면 스스로 빠진다.
    if (!has && field.exclusiveChoice) {
      next =
        choice === field.exclusiveChoice
          ? [choice]
          : next.filter((c) => c !== field.exclusiveChoice);
    }
    onChange({ ...value, choices: next, unknown: false });
  };

  const controlId = "field-" + field.id;
  const isFreeEntries = field.input === "entries" && !field.entryKeys && !field.entryKeysFrom;
  const required = isFieldRequired(field, siblingValues);

  return (
    <div className={cn("space-y-2", unknown && "opacity-60")}>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={controlId} className="text-body-medium font-medium text-foreground">
          {field.label}
          {/* 기존 폼의 필수 표시와 같은 모양이다(`data-upload/shared.tsx` 의 `Field`). */}
          {required && <span className="ml-1 text-red-600">*</span>}
        </Label>

        {field.allowsUnknown && (
          /* 켜면 다른 선택지와 같은 파란 테두리가 뜬다 — 이것도 하나의 답이다. */
          <label
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-2 rounded-md text-body-small transition-colors",
              unknown
                ? "border-2 border-primary bg-primary-subtle px-[9px] py-[5px] text-primary"
                : "border border-border px-2.5 py-1.5 text-muted-foreground hover:border-border-strong",
            )}
          >
            <Checkbox
              checked={unknown}
              onCheckedChange={(next) => onChange({ ...value, unknown: next === true })}
              aria-label={field.label + " unknown"}
            />
            Unknown
          </label>
        )}
      </div>

      {/* 묶음 입력은 래퍼에 id 를 둔다 — 라디오 하나가 아니라 질문 전체로 옮겨가야 한다. */}
      <fieldset id={controlId + "-group"} disabled={unknown} className="space-y-2">
        {field.input === "single" && (
          <RadioGroup
            value={value?.text ?? ""}
            onValueChange={setText}
            aria-label={field.label}
            className="gap-2"
          >
            {(field.choices ?? []).map((choice) => (
              <label
                key={choice}
                className={cn(TILE_BASE, value?.text === choice ? TILE_ON : TILE_OFF)}
              >
                <RadioGroupItem shape="square" value={choice} />
                <span className="text-body-medium text-foreground">{choice}</span>
              </label>
            ))}
          </RadioGroup>
        )}

        {field.input === "multi" && (
          <div className="space-y-2" role="group" aria-label={field.label}>
            {(field.choices ?? []).map((choice) => (
              <label
                key={choice}
                className={cn(TILE_BASE, chosen.includes(choice) ? TILE_ON : TILE_OFF)}
              >
                <Checkbox
                  checked={chosen.includes(choice)}
                  onCheckedChange={() => toggleChoice(choice)}
                />
                <span className="text-body-medium text-foreground">{choice}</span>
              </label>
            ))}
          </div>
        )}

        {field.input === "entries" && field.entryKeys && (
          <div className="grid gap-3 sm:grid-cols-2">
            {field.entryKeys.map((key) => (
              <div key={key} className="space-y-1">
                <Label
                  htmlFor={controlId + "-" + key}
                  className="text-body-small font-normal text-muted-foreground"
                >
                  {key}
                </Label>
                {/* 칸이 정해진 입력이라도 선택지가 있으면 고르게 한다(⑨ GPU 사용 여부). */}
                {field.choices ? (
                  <RadioGroup
                    value={entryValue(key)}
                    onValueChange={(next) => setEntry(key, next)}
                    aria-label={field.label + " " + key}
                    className="flex gap-2"
                  >
                    {field.choices.map((choice) => (
                      <label
                        key={choice}
                        className={cn(
                          TILE_BASE,
                          "flex-1",
                          entryValue(key) === choice ? TILE_ON : TILE_OFF,
                        )}
                      >
                        <RadioGroupItem shape="square" value={choice} />
                        <span className="text-body-medium text-foreground">{choice}</span>
                      </label>
                    ))}
                  </RadioGroup>
                ) : (
                  <Input
                    id={controlId + "-" + key}
                    className={cn(field.mono && "font-mono", field.numeric && "tabular-nums")}
                    inputMode={field.numeric ? "numeric" : undefined}
                    value={entryValue(key)}
                    onChange={(event) => setEntry(key, event.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {field.input === "entries" &&
          field.entryKeysFrom === "classes" &&
          (classNames.length === 0 ? (
            <p className="text-body-small text-muted-foreground">
              No classes were found in the uploaded file. Choose Unknown if you do not know them.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {classNames.map((name) => (
                <div key={name} className="space-y-1">
                  <Label
                    htmlFor={controlId + "-" + name}
                    className="text-body-small font-normal text-muted-foreground"
                  >
                    {name}
                  </Label>
                  <Input
                    id={controlId + "-" + name}
                    className={cn(field.mono && "font-mono", field.numeric && "tabular-nums")}
                    inputMode={field.numeric ? "numeric" : undefined}
                    value={entryValue(name)}
                    onChange={(event) => setEntry(name, event.target.value)}
                  />
                </div>
              ))}
            </div>
          ))}

        {isFreeEntries && (
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  className="font-mono"
                  placeholder="Name"
                  aria-label={field.label + " name " + (index + 1)}
                  value={entry.key}
                  onChange={(event) => {
                    const next = [...entries];
                    next[index] = { ...entry, key: event.target.value };
                    onChange({ ...value, entries: next, unknown: false });
                  }}
                />
                <Input
                  className="font-mono tabular-nums"
                  placeholder="Value"
                  aria-label={field.label + " value " + (index + 1)}
                  value={entry.value}
                  onChange={(event) => {
                    const next = [...entries];
                    next[index] = { ...entry, value: event.target.value };
                    onChange({ ...value, entries: next, unknown: false });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={"Remove row " + (index + 1)}
                  onClick={() =>
                    onChange({ ...value, entries: entries.filter((_, i) => i !== index) })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({
                  ...value,
                  entries: [...entries, { key: "", value: "" }],
                  unknown: false,
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add a row
            </Button>
          </div>
        )}

        {field.input === "textarea" && (
          <textarea
            id={controlId}
            className={TEXTAREA_CLASS}
            rows={3}
            value={value?.text ?? ""}
            onChange={(event) => setText(event.target.value)}
          />
        )}

        {(field.input === "text" || field.input === "number" || field.input === "date") && (
          <Input
            id={controlId}
            className={cn(field.mono && "font-mono", field.input === "number" && "tabular-nums")}
            inputMode={field.input === "number" ? "decimal" : undefined}
            aria-invalid={invalid || undefined}
            placeholder={field.inputExample}
            value={value?.text ?? ""}
            onChange={(event) => setText(event.target.value)}
          />
        )}
      </fieldset>

      {field.help && <p className="text-body-small text-muted-foreground">{field.help}</p>}
    </div>
  );
}
