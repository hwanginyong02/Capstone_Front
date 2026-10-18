/**
 * 레지스트리의 필드 하나를 입력 컨트롤로 그린다.
 *
 * 화면마다 폼을 따로 쓰지 않고 **레지스트리가 그리는 방식을 정한다**(`field.input`). 필드를
 * 더하거나 선택지를 고치는 일이 `data/reportComposer.ts` 한 곳에서 끝나야, 문서와 화면이
 * 어긋나지 않는다.
 *
 * "모름"을 고르면 컨트롤을 잠근다 — 값과 모름이 동시에 남아 어느 쪽이 참인지 모르게 되는
 * 상태를 만들지 않는다. 성적서에는 "제공되지 않음"으로 찍힌다. 칸이 정해진 글·숫자 묶음은 칸마다
 * 모름을 고른다(W3, `unknownPerEntry`).
 */
import { Plus, X } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { TEXTAREA_CLASS } from "../data-upload/shared";
import { cn } from "../../utils/styling/styles";
import {
  isFieldRequired,
  isFreeEntriesField,
  isOtherChosen,
} from "../../utils/domain/composerFieldGate";
import {
  NOTE_MAX_LENGTH,
  OTHER_TEXT_MAX_LENGTH,
  choiceLabel,
  entryLabel,
  unknownPerEntry,
} from "../../data/reportComposer";
import { CharCount } from "./CharCount";
import {
  MONTH_RANGE_KEYS,
  type ComposerField,
  type ComposerFieldValue,
  type ComposerValueMap,
} from "../../types/reportComposer.types";

/**
 * 선택지 한 줄의 모양. 고른 것은 굵은 강조색 테두리 + 강조 배경 — 재료 고르기의 저장 표시와
 * 같은 색이다(docs/MATERIAL_PICKER.md §10).
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
  /**
   * 칸별 "모름"(W3) — ⑥ 데이터 양·⑨ 실행 환경은 칸마다 고른다. 필드 모름 체크는 두지 않는다. 고른 칸은
   * 잠그고(값은 남겨 두어 다시 풀면 돌아온다) 성적서에는 그 칸만 "제공되지 않음"이 된다.
   */
  const perEntryUnknown = unknownPerEntry(field);
  const unknownKeys = value?.unknownKeys ?? [];
  const toggleEntryUnknown = (key: string, on: boolean) => {
    const rest = unknownKeys.filter((item) => item !== key);
    onChange({ ...value, unknownKeys: on ? [...rest, key] : rest, unknown: false });
  };

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
  const isFreeEntries = isFreeEntriesField(field);
  const required = isFieldRequired(field, siblingValues);
  const otherChosen = isOtherChosen(field, value);
  const otherText = value?.otherText ?? "";

  return (
    <div className={cn("space-y-2", unknown && "opacity-60")}>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={controlId} className="text-body-medium font-medium text-foreground">
          {field.label}
          {/* 기존 폼의 필수 표시와 같은 모양이다(`data-upload/shared.tsx` 의 `Field`). */}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>

        {field.allowsUnknown && !perEntryUnknown && (
          /* 켜면 다른 선택지와 같은 강조색 테두리가 뜬다 — 이것도 하나의 답이다. */
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
              aria-label={field.label + " 모름"}
            />
            모름
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
                <span className="text-body-medium text-foreground">
                  {choiceLabel(field, choice)}
                  {field.choiceDescriptions?.[choice] && (
                    <span className="block text-body-small text-muted-foreground">
                      {field.choiceDescriptions[choice]}
                    </span>
                  )}
                </span>
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
                <span className="text-body-medium text-foreground">{choiceLabel(field, choice)}</span>
              </label>
            ))}
          </div>
        )}

        {/* "기타"를 고른 순간 무엇인지 적을 칸이 나타난다. 선택지만으로는 내용이 없다. */}
        {otherChosen && (
          <Input
            id={controlId + "-other"}
            aria-label={field.label + " 기타 내용"}
            placeholder="무엇인지 적어 주세요"
            aria-invalid={(invalid && otherText.trim() === "") || undefined}
            maxLength={OTHER_TEXT_MAX_LENGTH}
            value={otherText}
            onChange={(event) => onChange({ ...value, otherText: event.target.value, unknown: false })}
          />
        )}
        {otherChosen && <CharCount length={otherText.length} max={OTHER_TEXT_MAX_LENGTH} />}

        {/* 덧붙이는 글(서술 설계 D26). 맞는 선택지가 없으면 글만 써도 답한 것으로 센다. */}
        {field.allowsNote && (
          <textarea
            id={controlId + "-note"}
            className={TEXTAREA_CLASS}
            rows={2}
            aria-label={field.label + " 덧붙이는 글"}
            placeholder="덧붙이는 글 (선택)"
            maxLength={NOTE_MAX_LENGTH}
            value={value?.note ?? ""}
            onChange={(event) => onChange({ ...value, note: event.target.value, unknown: false })}
          />
        )}
        {field.allowsNote && <CharCount length={(value?.note ?? "").length} max={NOTE_MAX_LENGTH} multiline />}

        {field.input === "monthRange" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[MONTH_RANGE_KEYS.from, MONTH_RANGE_KEYS.to].map((key) => (
              <div key={key} className="space-y-1">
                <Label
                  htmlFor={controlId + "-" + key}
                  className="text-body-small font-normal text-muted-foreground"
                >
                  {entryLabel(field, key)}
                </Label>
                <Input
                  id={controlId + "-" + key}
                  type="month"
                  className="font-mono tabular-nums"
                  aria-invalid={invalid || undefined}
                  value={entryValue(key)}
                  onChange={(event) => setEntry(key, event.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {field.input === "entries" && field.entryKeys && (
          <div className="grid gap-3 sm:grid-cols-2">
            {field.entryKeys.map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor={controlId + "-" + key}
                    className="text-body-small font-normal text-muted-foreground"
                  >
                    {entryLabel(field, key)}
                  </Label>
                  {perEntryUnknown && (
                    <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-body-small text-muted-foreground">
                      <Checkbox
                        checked={unknownKeys.includes(key)}
                        onCheckedChange={(next) => toggleEntryUnknown(key, next === true)}
                        aria-label={field.label + " " + entryLabel(field, key) + " 모름"}
                      />
                      모름
                    </label>
                  )}
                </div>
                {/* 칸이 정해진 입력이라도 선택지가 있으면 고르게 한다(⑨ GPU 사용 여부). */}
                {field.choices ? (
                  <RadioGroup
                    value={entryValue(key)}
                    onValueChange={(next) => setEntry(key, next)}
                    aria-label={field.label + " " + entryLabel(field, key)}
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
                        <span className="text-body-medium text-foreground">{choiceLabel(field, choice)}</span>
                      </label>
                    ))}
                  </RadioGroup>
                ) : (
                  <Input
                    id={controlId + "-" + key}
                    className={cn(
                      field.mono && "font-mono",
                      field.numeric && "tabular-nums",
                      unknownKeys.includes(key) && "opacity-60",
                    )}
                    inputMode={field.numeric ? "numeric" : undefined}
                    disabled={unknownKeys.includes(key)}
                    aria-invalid={
                      (invalid && !unknownKeys.includes(key) && entryValue(key).trim() === "") || undefined
                    }
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
              올린 파일에서 클래스를 찾지 못했습니다. 모르면 모름을 고르세요.
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
                    aria-invalid={(invalid && entryValue(name).trim() === "") || undefined}
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
                  placeholder="이름"
                  aria-label={field.label + " 이름 " + (index + 1)}
                  aria-invalid={(invalid && entry.key.trim() === "" && entry.value.trim() !== "") || undefined}
                  value={entry.key}
                  onChange={(event) => {
                    const next = [...entries];
                    next[index] = { ...entry, key: event.target.value };
                    onChange({ ...value, entries: next, unknown: false });
                  }}
                />
                <Input
                  className="font-mono tabular-nums"
                  placeholder="값"
                  aria-label={field.label + " 값 " + (index + 1)}
                  aria-invalid={(invalid && entry.value.trim() === "" && entry.key.trim() !== "") || undefined}
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
                  aria-label={index + 1 + "번째 줄 지우기"}
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
              줄 추가
            </Button>
          </div>
        )}

        {field.input === "textarea" && (
          <textarea
            id={controlId}
            className={TEXTAREA_CLASS}
            aria-invalid={invalid || undefined}
            rows={3}
            placeholder={field.inputExample}
            maxLength={field.maxLength}
            value={value?.text ?? ""}
            onChange={(event) => setText(event.target.value)}
          />
        )}
        {field.input === "textarea" && field.maxLength && (
          <CharCount length={(value?.text ?? "").length} max={field.maxLength} multiline />
        )}

        {(field.input === "text" || field.input === "number" || field.input === "date") && (
          <Input
            id={controlId}
            className={cn(field.mono && "font-mono", field.input === "number" && "tabular-nums")}
            inputMode={
              field.input === "number"
                ? field.numberRange?.integer
                  ? "numeric"
                  : "decimal"
                : undefined
            }
            aria-invalid={invalid || undefined}
            placeholder={field.inputExample}
            maxLength={field.input === "text" ? field.maxLength : undefined}
            value={value?.text ?? ""}
            onChange={(event) => setText(event.target.value)}
          />
        )}
        {field.input === "text" && field.maxLength && (
          <CharCount length={(value?.text ?? "").length} max={field.maxLength} />
        )}
      </fieldset>

      {field.help && <p className="text-body-small text-muted-foreground">{field.help}</p>}
    </div>
  );
}
