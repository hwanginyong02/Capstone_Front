/**
 * 범례 — 페이지 머리에 **한 번만** 둔다(docs/MATERIAL_PICKER.md §12.3). 항목마다 포커스를 받아
 * 툴팁으로 뜻을 풀어 준다.
 */
import type { PickKind } from "../../types/reportComposer.types";
import { FOCUS_RING, cn } from "../../utils/styling/styles";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { KindMarker } from "./KindMarker";
import { KIND_HINT, KIND_LABEL } from "./kindStyles";

const ORDER: PickKind[] = ["required", "recommended", "optional", "conditional"];

export function KindLegend() {
  return (
    <ul aria-label="범례" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {ORDER.map((kind) => (
        <li key={kind}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className={cn(
                  "flex items-center gap-1.5 rounded-sm text-xs text-foreground-secondary",
                  FOCUS_RING,
                )}
              >
                <KindMarker kind={kind} />
                {KIND_LABEL[kind]}
              </span>
            </TooltipTrigger>
            <TooltipContent>{KIND_HINT[kind]}</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
