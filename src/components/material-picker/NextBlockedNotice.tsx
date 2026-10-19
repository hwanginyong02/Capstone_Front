/**
 * "다음"이 막혔을 때 다음 버튼 바로 왼쪽에 보이는 안내(docs/MATERIAL_PICKER.md §12.2·§12.3).
 *
 * 버튼은 눌리지만 넘어가지 않는다(사용자 결정). 빠진 필수 항목 이름을 앞에서 셋까지 적고 나머지는
 * "외 n개"로 줄인다(`describeMissingRequired`). 빠진 것이 없으면 그리지 않는다.
 */
import type { FlowLeaf } from "../../types/reportComposer.types";
import { describeMissingRequired } from "../../utils/domain/materialPicks";

export function NextBlockedNotice({ missing }: { missing: readonly FlowLeaf[] }) {
  const message = describeMissingRequired(missing);
  if (!message) return null;
  return (
    <p role="alert" className="line-clamp-2 max-w-[20rem] text-sm leading-[21px] text-destructive">
      {message}
    </p>
  );
}
