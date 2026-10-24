/**
 * 판 4 끝부분 — 부록 1 자리, 발급 이력, "— 끝 —".
 * 지금은 발급 이력 소제목(발급본에만 — 부록 B1)과 "— 끝 —"(늘)만 그린다(판 4 라운드 S4·S5 1단계 뼈대). 발급 이력 표는 2단계.
 */
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4TableTitle } from "./shared/Ed4Headings";
import { Ed4Paragraph } from "./shared/Ed4Paragraph";
import { EX_END_MARK, EX_HISTORY_TITLE } from "../../../lib/report/edition4/edition4Text";

export function Ed4Closing({ data, mode }: Ed4PartProps) {
  const issued = (data.signature?.history ?? []).length > 0;
  return (
    <section data-ed4-part="Ed4Closing">
      {/* 부록 1(성적서 점검 결과) 자리 — 이번 라운드 범위 밖(심판 라운드에 부록 1 과 함께). 생기면 발급 이력 앞에 둔다. */}
      {issued && <Ed4TableTitle>{EX_HISTORY_TITLE}</Ed4TableTitle>}
      <Ed4Paragraph className="mt-10 text-center">{EX_END_MARK}</Ed4Paragraph>
    </section>
  );
}
