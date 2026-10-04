/**
 * 상세 영역의 필드 표.
 *
 * 누르는 표가 아니라 읽는 표다 — 그래서 행 hover 를 두지 않는다
 * (docs/COMPOSER_DESIGN.md "필드 표"). 더보기 필드는 표 아래 버튼으로 접어 둔다.
 */
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { cn } from "../../utils/styling/styles";
import { KindBadge } from "./KindBadge";
import type { ComposerField } from "../../types/reportComposer.types";

interface FieldTableProps {
  /** 지금 보여줄 필드. 더보기가 접혀 있으면 호출하는 쪽이 이미 걸러서 넘긴다. */
  fields: ComposerField[];
  /** 접혀 있는 더보기 필드 수. 0 이면 버튼을 두지 않는다. */
  advancedCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
}

const HEAD_CLASS = "h-9 bg-muted px-3 text-body-xs font-medium text-foreground-secondary";

export function FieldTable({
  fields,
  advancedCount,
  expanded,
  onToggleExpanded,
}: FieldTableProps) {
  return (
    <div>
      <Table className="text-body-small">
        <colgroup>
          <col className="w-[28%]" />
          <col />
          <col className="w-32" />
        </colgroup>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className={HEAD_CLASS}>Field</TableHead>
            <TableHead className={HEAD_CLASS}>Example</TableHead>
            <TableHead className={HEAD_CLASS}>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => (
            <TableRow key={field.id} className="h-11 border-border hover:bg-transparent">
              <TableCell className="px-3 py-3 align-top text-body-small whitespace-normal text-foreground">
                {field.label}
              </TableCell>
              <TableCell
                className={cn(
                  "px-3 py-3 align-top text-body-small whitespace-normal text-foreground",
                  // 파일명·숫자 예시는 고정폭으로 — 자리수가 흔들리지 않아야 읽힌다.
                  field.mono && "font-mono tabular-nums",
                )}
              >
                {field.inputExample}
              </TableCell>
              <TableCell className="px-3 py-3 align-top whitespace-normal">
                <KindBadge field={field} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {advancedCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
          className="mt-2 text-body-medium font-medium"
        >
          {expanded ? "Hide optional fields" : "Show " + advancedCount + (advancedCount === 1 ? " optional field" : " optional fields")}
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
