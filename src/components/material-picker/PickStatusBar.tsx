/**
 * 평가 흐름 만들기 하단 바의 현황(docs/MATERIAL_PICKER.md §12.3).
 *
 * 구분마다 넣은 수와 전체 수(함께 들어감은 세지 않음)를 보이고, 빠진 필수·권장 항목을 알린다. 빠진
 * 항목은 펼쳐서 바로 넣을 수 있다. 수는 모두 `flowStatus` 한 번의 결과다 — 트리의 블록 줄과 막힘
 * 안내가 같은 결과를 읽는다.
 *
 * 품질 배지(최소·표준·상세)는 없다 — 추천 세트가 없어졌고, 권장 p/t 와 빠진 권장 안내가 같은 정보를
 * 준다.
 */
import { useRef } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { getCard } from "../../data/reportComposer";
import type { ComposerCardId, FlowLeaf } from "../../types/reportComposer.types";
import type { FlowStatus } from "../../utils/domain/materialPicks";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { KindMarker } from "./KindMarker";

interface PickStatusBarProps {
  counts: FlowStatus["counts"];
  missingRequired: FlowLeaf[];
  unplacedRecommended: FlowLeaf[];
  /** "다음"이 막힌 동안은 안내 문장을 빼고 [빠진 항목 보기]만 남긴다(막힘 안내가 다음 버튼 옆에 있다). */
  compact: boolean;
  onPlaceLeaf: (cardId: ComposerCardId, leafId: string) => void;
}

export function PickStatusBar({ counts, missingRequired, unplacedRecommended, compact, onPlaceLeaf }: PickStatusBarProps) {
  const anyMissing = missingRequired.length > 0 || unplacedRecommended.length > 0;
  const doneRef = useRef<HTMLParagraphElement>(null);

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {/* 알리는 영역은 수 한 줄뿐이다 — 안내 문장과 버튼까지 넣으면 넣고 뺄 때마다 길게 다시 읽는다. */}
      <p
        role="status"
        aria-label="항목 현황"
        aria-atomic="true"
        className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <KindMarker kind="required" />
          필수 항목 {counts.required.placed}/{counts.required.total}
        </span>
        <span aria-hidden="true" className="text-border-strong">·</span>
        <span className="flex items-center gap-1.5">
          <KindMarker kind="recommended" />
          권장 {counts.recommended.placed}/{counts.recommended.total}
        </span>
        <span aria-hidden="true" className="text-border-strong">·</span>
        <span className="flex items-center gap-1.5">
          <KindMarker kind="optional" />
          선택 {counts.optional.placed}/{counts.optional.total}
        </span>
      </p>
      {anyMissing ? (
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-foreground-secondary">
          {!compact && (
            <>
              <TriangleAlert className="size-4 shrink-0 text-warning-strong" aria-hidden="true" />
              <span>
                {missingRequired.length > 0
                  ? `필수 항목 ${missingRequired.length}개를 더 넣어야 다음으로 갈 수 있어요.`
                  : `권장 항목 ${unplacedRecommended.length}개가 빠졌어요. 빠진 항목은 성적서에 "제공되지 않음"으로 찍혀요.`}
              </span>
            </>
          )}
          <MissingPopover
            required={missingRequired}
            recommended={unplacedRecommended}
            onPlaceLeaf={onPlaceLeaf}
            onAllPlaced={() => doneRef.current?.focus()}
          />
        </p>
      ) : (
        // 빠진 항목 보기에서 마지막 항목을 넣으면 팝업이 통째로 사라진다 — 포커스는 이 문장으로 온다.
        <p ref={doneRef} tabIndex={-1} className="flex items-center gap-2 text-sm text-foreground-secondary outline-none">
          <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
          필수와 권장 항목을 모두 넣었어요.
        </p>
      )}
    </div>
  );
}

/** 빠진 항목 보기 — "필수 항목"·"권장 항목" 묶음을 블록별로. */
function MissingPopover({
  required,
  recommended,
  onPlaceLeaf,
  onAllPlaced,
}: {
  required: FlowLeaf[];
  recommended: FlowLeaf[];
  onPlaceLeaf: (cardId: ComposerCardId, leafId: string) => void;
  /** 마지막 항목을 넣어 이 팝업이 사라질 때. */
  onAllPlaced: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  /**
   * 넣으면 그 줄이 사라진다 — 포커스가 body 로 떨어지지 않게 다음 [넣기], 없으면 목록으로 옮긴다. 마지막
   * 하나였으면 팝업이 사라지므로 바깥(`onAllPlaced`)에 맡긴다.
   */
  const place = (cardId: ComposerCardId, leafId: string, button: HTMLElement) => {
    const buttons = [...(contentRef.current?.querySelectorAll<HTMLElement>("button[data-place]") ?? [])];
    const at = buttons.indexOf(button);
    const nextKey = (buttons[at + 1] ?? buttons[at - 1])?.dataset.place;
    const last = buttons.length === 1;
    onPlaceLeaf(cardId, leafId);
    requestAnimationFrame(() => {
      if (last) return onAllPlaced();
      const target = nextKey
        ? contentRef.current?.querySelector<HTMLElement>(`button[data-place="${nextKey}"]`)
        : contentRef.current;
      target?.focus();
    });
  };
  const groups = [
    { title: "필수 항목", leaves: required },
    { title: "권장 항목", leaves: recommended },
  ].filter((group) => group.leaves.length > 0);

  return (
    <Popover>
      <PopoverTrigger className="text-sm underline underline-offset-4 hover:text-foreground">빠진 항목 보기</PopoverTrigger>
      <PopoverContent ref={contentRef} tabIndex={-1} side="top" align="start" className="w-80 p-0">
        <div aria-label="빠진 항목" role="group" className="flex max-h-80 flex-col overflow-y-auto py-1">
          {groups.map((group) => (
            <section key={group.title} aria-label={group.title} className="border-t border-border first:border-t-0">
              <h3 className="px-4 pt-2 text-xs font-medium text-muted-foreground">{group.title}</h3>
              <ul className="flex flex-col">
                {byBlock(group.leaves).map(([cardId, leaves]) => (
                  <li key={cardId} className="px-4 py-1.5">
                    <p className="text-sm font-medium text-foreground">{getCard(cardId).name}</p>
                    <ul className="mt-0.5 flex flex-col">
                      {leaves.map((leaf) => (
                        <li key={leaf.leafId} className="flex min-h-8 items-center justify-between gap-3">
                          <span className="text-sm text-foreground-secondary">{leaf.label}</span>
                          <button
                            type="button"
                            aria-label={`${getCard(cardId).name} ${leaf.label} 넣기`}
                            data-place={`${cardId}:${leaf.leafId}`}
                            onClick={(event) => place(cardId, leaf.leafId, event.currentTarget)}
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
            </section>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function byBlock(leaves: FlowLeaf[]): Array<[ComposerCardId, FlowLeaf[]]> {
  const groups = new Map<ComposerCardId, FlowLeaf[]>();
  for (const leaf of leaves) groups.set(leaf.cardId, [...(groups.get(leaf.cardId) ?? []), leaf]);
  return [...groups];
}
