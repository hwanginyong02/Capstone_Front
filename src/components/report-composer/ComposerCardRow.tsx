/**
 * 카드 한 줄 — 섹션 라벨과 격자.
 *
 * 두 줄의 열 수가 다른 것은 의도한 것이다(docs/COMPOSER_DESIGN.md "화면 골격과 치수").
 * 선택 카드 4장을 필수와 같은 5열 격자에 맞추면 오른쪽에 빈칸이 생겨 "카드가 하나 빠진"
 * 것처럼 보인다.
 */
import type { ReactNode } from "react";
import { cn } from "../../utils/styling/styles";

interface ComposerCardRowProps {
  label: string;
  count: number;
  /** 라벨 아래 보조 문구. 선택 줄에만 있다. */
  note?: string;
  /** 열 수가 줄마다 다르다. */
  columns: "required" | "optional";
  children: ReactNode;
}

const GRID_CLASS = {
  // 필수 5장: 5 / 3 / 2 / 1열
  required: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  // 선택 4장: 4 / 2 / 2 / 1열
  optional: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
} as const;

export function ComposerCardRow({
  label,
  count,
  note,
  columns,
  children,
}: ComposerCardRowProps) {
  return (
    <section>
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-heading-small font-semibold text-foreground">{label}</h2>
          <span className="text-mono-small font-mono font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        </div>
        {note && <p className="text-body-small text-muted-foreground">{note}</p>}
      </div>

      <div className={cn("grid gap-3", GRID_CLASS[columns])}>{children}</div>
    </section>
  );
}
