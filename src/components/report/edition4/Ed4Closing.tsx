/**
 * 판 4 끝부분(갈래 b5) — 부록 1 자리, 발급 이력, "— 끝 —".
 * - 발급 이력은 발급본에만(부록 B1 — 발급 판정 `isIssuedEd4` 이고 `signature.history` 가 비어 있지 않을 때): 소제목 "발급 이력" + 표 "버전 | 발급일 | 비고"
 *   (예시본 글자, 저장된 `signature.history` 그대로 — 발급일은 저장 글자).
 * - "— 끝 —" 은 늘 찍는다.
 */
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4TableTitle } from "./shared/Ed4Headings";
import { Ed4Paragraph } from "./shared/Ed4Paragraph";
import { Ed4Table } from "./shared/Ed4Table";
import { EX_END_MARK, EX_HISTORY_TITLE } from "../../../lib/report/edition4/edition4Text";
import { EX_HISTORY_COLUMNS } from "../../../lib/report/edition4/render/recommendText";
import { isIssuedEd4 } from "../../../lib/report/edition4/render/issuance";

export function Ed4Closing({ data }: Ed4PartProps) {
  const history = isIssuedEd4(data) ? (data.signature?.history ?? []) : [];
  return (
    <section data-ed4-part="Ed4Closing">
      {/* 부록 1(성적서 점검 결과) 자리 — 이번 라운드 범위 밖(심판 라운드에 부록 1 과 함께). 생기면 발급 이력 앞에 둔다. */}
      {history.length > 0 && (
        <>
          <Ed4TableTitle>{EX_HISTORY_TITLE}</Ed4TableTitle>
          <Ed4Table
            columns={EX_HISTORY_COLUMNS}
            rows={history.map((h) => [h.version, h.issuedAt, h.note])}
            rowKeys={history.map((h, i) => `${i}:${h.version}`)}
          />
        </>
      )}
      <Ed4Paragraph className="mt-10 text-center">{EX_END_MARK}</Ed4Paragraph>
    </section>
  );
}
