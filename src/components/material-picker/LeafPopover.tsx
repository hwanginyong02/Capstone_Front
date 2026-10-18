/**
 * 항목 설명 팝업(docs/MATERIAL_PICKER.md §12.3) — 의미 / 입력 형태 / 입력 예시 / 표준 근거.
 *
 * 이름 버튼을 이 컴포넌트가 직접 그린다. 열림 상태는 페이지가 쥐고(`openLeafKey`), 한 번에 하나만 연다.
 *
 * - 이름을 누르면 **열기만** 한다(토글 아님). 닫기는 Esc, 바깥 클릭, ✕. 그래서 두 번 누르기가
 *   "열고 넣기"가 되어 깜빡이지 않는다.
 * - 같은 이름을 다시 눌러도 닫혔다 열리지 않게, 이름 버튼을 누르거나 그리로 포커스가 가는 것은 바깥
 *   동작으로 치지 않는다.
 * - 열리면 내용에 포커스가 가고(제목과 내용을 먼저 읽음), 닫히면 이름 버튼으로 돌아온다(N4).
 *   PopoverAnchor 는 Trigger 가 아니라 Radix 가 돌려줄 곳을 모르므로 직접 돌린다.
 * - 표준 근거가 없는 항목은 그 줄을 그리지 않는다(`leafDetail`).
 */
import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { TASK_TYPE_LABELS_KO, type TaskType } from "../../data/evaluationData";
import type { PickKind } from "../../types/reportComposer.types";
import type { LeafDetail } from "../../utils/domain/leafDetail";
import { FOCUS_RING, cn } from "../../utils/styling/styles";
import { CsvExampleViewer } from "../data-upload/CsvExampleViewer";
import { Button } from "../ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";
import { KindMarker } from "./KindMarker";
import { KIND_LABEL } from "./kindStyles";

interface LeafPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PickKind;
  detail: LeafDetail;
  placed: boolean;
  taskType: TaskType | "";
  /** 넣기·빼기. 함께 들어감 항목은 따로 넣고 빼지 않으므로 없다. */
  onToggle?: () => void;
  /** 이름을 두 번 눌렀을 때 — 팝업은 연 채로 그 항목을 넣는다. */
  onDoubleClick?: () => void;
  side?: "right" | "bottom";
  /** 이름 버튼의 클래스와 내용. */
  buttonClassName?: string;
  children: ReactNode;
}

export function LeafPopover({
  open,
  onOpenChange,
  kind,
  detail,
  placed,
  taskType,
  onToggle,
  onDoubleClick,
  side = "right",
  buttonClassName,
  children,
}: LeafPopoverProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  return (
    <Popover open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
      <PopoverAnchor asChild>
        <button
          ref={anchorRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => onOpenChange(true)}
          onDoubleClick={onDoubleClick}
          className={cn(FOCUS_RING, buttonClassName)}
        >
          {children}
        </button>
      </PopoverAnchor>
      <PopoverContent
        ref={contentRef}
        side={side}
        align="start"
        tabIndex={-1}
        aria-labelledby={titleId}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          anchorRef.current?.focus();
        }}
        // 바깥 클릭·포커스 이동이 자기 이름 버튼이면 닫지 않는다 — 두 번 누르기에서 둘째 클릭이 포커스를
        // 이름 버튼으로 옮겨도 열린 채 둔다.
        onInteractOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
        className={cn(
          "flex max-h-[min(32rem,80vh)] flex-col gap-3 overflow-y-auto p-4",
          detail.file ? "w-[26rem]" : "w-80",
        )}
      >
        <LeafPopoverBody
          kind={kind}
          detail={detail}
          placed={placed}
          taskType={taskType}
          titleId={titleId}
          onToggle={onToggle}
          onClose={() => onOpenChange(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

function LeafPopoverBody({
  kind,
  detail,
  placed,
  taskType,
  titleId,
  onToggle,
  onClose,
}: {
  kind: PickKind;
  detail: LeafDetail;
  placed: boolean;
  taskType: TaskType | "";
  titleId: string;
  onToggle?: () => void;
  onClose: () => void;
}) {
  const triggers = detail.companion?.triggerLabels.map((label) => `‘${label}’`).join(", ");
  const status = detail.companion
    ? placed
      ? `${triggers} 항목과 함께 들어가 있어요.`
      : null
    : placed
      ? `‘${detail.blockName}’ 블록에 들어가 있어요.`
      : kind === "required"
        ? "필수 항목이라 넣어야 다음으로 갈 수 있어요."
        : "아직 넣지 않았어요.";

  return (
    <>
      <header className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <KindMarker kind={kind} />
            {KIND_LABEL[kind]} · {detail.blockName}
          </p>
          <h3 id={titleId} className="text-base font-medium text-foreground">
            {detail.label}
          </h3>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="닫기" onClick={onClose} className="-mr-1 -mt-1">
          <X className="size-4" />
        </Button>
      </header>

      {detail.companion && (
        <p className="text-sm leading-[21px] text-foreground-secondary">
          ↳ {triggers} 항목을 넣으면 함께 들어가요.
          {detail.companion.condition && (
            <span className="block text-xs text-muted-foreground">조건: {detail.companion.condition}</span>
          )}
        </p>
      )}
      {detail.group && (
        <p className="text-sm leading-[21px] text-foreground-secondary">
          ‘{detail.group.label}’의 한 칸이에요. {detail.group.description}
        </p>
      )}

      <dl className="flex flex-col gap-2.5 text-sm">
        {detail.meaning && <Row term="의미">{detail.meaning}</Row>}
        {(detail.format || detail.parts) && (
          <Row term="입력 형태">
            {detail.format && (
              <span className="flex flex-col gap-0.5">
                <span>{detail.format.kind}</span>
                {detail.format.choices && (
                  <span className="text-xs text-foreground-secondary">{detail.format.choices}</span>
                )}
              </span>
            )}
            {detail.parts && (
              <ul aria-label="들어가는 칸" className="mt-1 flex flex-col gap-0.5 border-l-2 border-border pl-2.5">
                {detail.parts.map((part) => (
                  <li key={part.key} className="flex flex-wrap gap-x-2 text-xs">
                    <span className="text-foreground">{part.label}</span>
                    {part.format && <span className="text-foreground-secondary">{part.format}</span>}
                  </li>
                ))}
              </ul>
            )}
            {detail.allowsUnknown && (
              <span className="mt-1 block text-xs text-muted-foreground">모르면 ‘모름’을 고를 수 있어요.</span>
            )}
          </Row>
        )}
        {detail.example && <Row term="입력 예시">{detail.example}</Row>}
        {detail.basis && <Row term="표준 근거">{detail.basis}</Row>}
      </dl>

      {detail.file && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
          <span className="text-xs font-medium text-foreground-secondary">
            파일 예시 · {TASK_TYPE_LABELS_KO[taskType || "multiclass"]} · CSV
          </span>
          <CsvExampleViewer taskType={taskType || "multiclass"} />
        </div>
      )}

      {(status || onToggle) && (
        <footer className="flex items-center justify-between gap-3 border-t border-border pt-3">
          {status && <p className="text-xs text-muted-foreground">{status}</p>}
          {onToggle && (
            <Button type="button" size="sm" variant={placed ? "outline" : "default"} onClick={onToggle}>
              {placed ? "빼기" : "넣기"}
            </Button>
          )}
        </footer>
      )}
    </>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{term}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}
