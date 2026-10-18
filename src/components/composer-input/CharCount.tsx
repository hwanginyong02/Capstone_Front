/**
 * 글 칸 아래의 남은 글자 수(B7). 칸에는 `maxLength` 를 함께 걸어 상한을 넘겨 받지 않는다.
 *
 * 여러 줄 칸은 늘 보이고, 한 줄 칸은 상한의 80% 를 넘었을 때만 보인다 — 이름 한 줄마다 숫자가
 * 붙으면 화면이 시끄럽다.
 */
import { cn } from "../../utils/styling/styles";

/** 한 줄 칸에서 남은 글자를 보이기 시작하는 비율. */
export const SINGLE_LINE_COUNT_FROM = 0.8;

export function CharCount({
  length,
  max,
  multiline = false,
}: {
  length: number;
  max: number;
  multiline?: boolean;
}) {
  if (!multiline && length < max * SINGLE_LINE_COUNT_FROM) return null;
  const left = Math.max(0, max - length);
  return (
    <p
      className={cn(
        "text-right text-body-small tabular-nums",
        left === 0 ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {left === 0 ? `최대 ${max.toLocaleString()}자까지 적을 수 있어요` : `${left.toLocaleString()}자 남음`}
    </p>
  );
}
