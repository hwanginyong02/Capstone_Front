/**
 * 재료 고르기 하단 바의 현황(docs/MATERIAL_PICKER.md §11).
 *
 * 무엇이 얼마나 들어갔는지(필수 카드, 권장, 선택)와 지금 품질 단계를 보이고, 표준에 못 미치면
 * 빠진 권장 항목을 경고한다. 빠진 항목은 펼쳐서 바로 넣을 수 있다.
 *
 * 품질 기준: **표준이 충분한 품질의 기준선이다** — 표준 보고 항목(권장)을 모두 받는다. 권장을
 * 빼도 성적서는 나오지만 그 자리가 "제공되지 않음"으로 찍힌다.
 */
import { TriangleAlert, CircleCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../utils/styling/styles";
import { KIND_STYLE } from "./kindStyles";
import type { ComposerCardId } from "../../types/reportComposer.types";
import {
  tierInfo,
  type MissingRecommended,
  type PickCoverage,
  type PickTier,
} from "../../utils/domain/materialPicks";

interface PickStatusBarProps {
  coverage: PickCoverage;
  tier: PickTier;
  missing: MissingRecommended[];
  onAddRecommended: (cardId: ComposerCardId, fieldId: string) => void;
}

export function PickStatusBar({ coverage, tier, missing, onAddRecommended }: PickStatusBarProps) {
  const missingCount = coverage.recommended.total - coverage.recommended.picked;
  const info = tierInfo(tier);

  return (
    <div role="status" aria-label="재료 현황" className="flex min-w-0 flex-col gap-0.5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-foreground">
        <span>필수 카드 {coverage.requiredCards}장</span>
        <span aria-hidden="true" className="text-border-strong">|</span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", KIND_STYLE.recommended.dot)} />
          권장 {coverage.recommended.picked}/{coverage.recommended.total}
        </span>
        <span aria-hidden="true" className="text-border-strong">|</span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", KIND_STYLE.optional.dot)} />
          선택 {coverage.optional.picked}/{coverage.optional.total}
        </span>
        <span className="rounded-md bg-primary-subtle px-2 py-0.5 text-xs font-medium text-primary">
          품질 {info.name}
        </span>
      </p>
      {missingCount > 0 ? (
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-foreground-secondary">
          <TriangleAlert className="size-4 shrink-0 text-warning-strong" aria-hidden="true" />
          <span>
            표준까지 권장 {missingCount}개가 남았어요. 빠진 항목은 성적서에 "제공되지 않음"으로 찍혀요.
          </span>
          <Popover>
            <PopoverTrigger className="text-sm underline underline-offset-4 hover:text-foreground">
              빠진 항목 보기
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-80 p-0">
              <ul aria-label="빠진 권장 항목" className="flex max-h-80 flex-col overflow-y-auto py-1">
                {missing.map(({ card, fields }) => (
                  <li key={card.id} className="border-t border-border px-4 py-2 first:border-t-0">
                    <p className="text-sm font-medium text-foreground">{card.name}</p>
                    <ul className="mt-1 flex flex-col">
                      {fields.map((field) => (
                        <li key={field.id} className="flex min-h-8 items-center justify-between gap-3">
                          <span className="text-sm text-foreground-secondary">{field.label}</span>
                          <button
                            type="button"
                            aria-label={`${card.name} ${field.label} 넣기`}
                            onClick={() => onAddRecommended(card.id, field.id)}
                            className="text-xs text-primary underline underline-offset-4"
                          >
                            넣기
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm text-foreground-secondary">
          <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {info.description}
        </p>
      )}
    </div>
  );
}
