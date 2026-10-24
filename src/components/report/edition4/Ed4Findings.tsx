/**
 * 판 4 5절 분석 소견(판 4 라운드 계획 4절, 갈래 b5) — 맨 앞 ※ 줄(고정 문구 ※ 판 4), 그 아래 5.1~5.6 에 서술 칸을 대응표대로
 * (8.2→5.1 +11a·11b, 7.1→5.2, 7.2→5.3 앞 12, 8.1→5.4 빈 칸 B18, 8.3→5.5, 7.3→5.6 빈 글 15). 배치는 순수 함수 `ed4FindingBlocks`.
 * - 서술은 따옴표·blockquote 없는 문단(대응표 18) — `Ed4Narrative`.
 * - 칸 배지(규칙 기반 칸)는 판 3 7·8절처럼 소절 제목 옆에, **화면에만**(인쇄는 그리지 않고, 배지 자체도 print:hidden).
 */
import { SectionSourceBadge } from "../shared/SectionSourceBadge";
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle, Ed4SubsectionTitle } from "./shared/Ed4Headings";
import { Ed4Narrative, Ed4Paragraph } from "./shared/Ed4Paragraph";
import { FIXED_NOTE_ED4, type Ed4TitleNumber } from "../../../lib/report/edition4/edition4Text";
import { ed4FindingBlocks, type Ed4SlotBody } from "../../../lib/report/edition4/render/findingsEd4";

/** 소절 제목 + 화면 전용 칸 배지(6절도 같이 쓴다). */
export function Ed4SlotHeading({
  place,
  badge,
  mode,
}: {
  place: Ed4TitleNumber;
  badge: "fallback" | null;
  mode: Ed4PartProps["mode"];
}) {
  if (mode !== "screen" || badge === null) return <Ed4SubsectionTitle number={place} />;
  return (
    <div className="flex items-center gap-2">
      <Ed4SubsectionTitle number={place} />
      <SectionSourceBadge kind={badge} />
    </div>
  );
}

/** 칸 몸통 — 서술 문단, 빈 칸 고정 문구, 자리표시(6절도 같이 쓴다). */
export function Ed4SlotBodyView({ body }: { body: Ed4SlotBody }) {
  if (body.kind === "narrative") return <Ed4Narrative text={body.text} />;
  if (body.kind === "fixed") return <Ed4Paragraph>{body.text}</Ed4Paragraph>;
  return (
    <Ed4Paragraph className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-400">
      {body.text}
    </Ed4Paragraph>
  );
}

export function Ed4Findings({ data, mode }: Ed4PartProps) {
  return (
    <section data-ed4-part="Ed4Findings">
      <Ed4SectionTitle number="5" />
      <Ed4Paragraph>{FIXED_NOTE_ED4}</Ed4Paragraph>
      {ed4FindingBlocks(data).map((block) => (
        <div key={block.place} data-ed4-slot={block.slot}>
          <Ed4SlotHeading place={block.place} badge={block.badge} mode={mode} />
          {block.before.map((line) => (
            <Ed4Paragraph key={line}>{line}</Ed4Paragraph>
          ))}
          <Ed4SlotBodyView body={block.body} />
          {block.after.map((line) => (
            <Ed4Paragraph key={line}>{line}</Ed4Paragraph>
          ))}
        </div>
      ))}
    </section>
  );
}
