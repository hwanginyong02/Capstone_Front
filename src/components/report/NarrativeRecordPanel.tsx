/**
 * "작성 기록" — 7·8·9절 칸(소절)마다 누가 썼는지(서술 라운드 세션 B, 사용자 결정 4).
 *
 * - 칸별 출처(`narrativeSections`)와 칸별 모델 이름(`narrativeModels`)은 성적서 데이터(그래서 발급 보관본)에 들어
 *   있지만, **서비스 화면에만** 보여 준다 — `/report/:id`(`Report.tsx`)와 `/report/no/:번호`(`ReportByNumber.tsx`)
 *   의 화면 상자. 인쇄 경로(`ReportPrint`)와 본문(`ReportSections`)에는 넣지 않는다(본문은 시험 결과이고 이 기록은
 *   서비스 정보다). 혹시 화면을 브라우저로 인쇄해도 빠지게 `print:hidden` 도 단다.
 * - 판 3 성적서에서 서술이 끝났을 때만(판 1·2 보관본에도 `narrativeSections` 가 있으므로 키가 아니라 판으로 가른다 —
 *   사용자 결정 1). 서술을 기다리는 중·만들지 못함이면 낡은 칸별 출처로 그리지 않는다(칸 배지와 같은 규칙).
 */
import type { FinalReportData, NarrativeSectionSource } from "../../types/finalReport.types";
import { usesSchema3 } from "../../lib/report/normalizeReportContent";

/** 칸 번호와 성적서의 소절 이름(판 3 소절 제목과 같은 말 — 9 는 절 제목). 이 순서로 줄을 세운다. */
export const NARRATIVE_RECORD_SECTIONS: ReadonlyArray<readonly [section: string, title: string]> = [
  ["7.1", "혼동 행렬 기반 클래스 간 간섭 분석"],
  ["7.2", "데이터 분포 유의성 및 클래스 편향성 평가"],
  ["7.3", "추가 관찰"],
  ["8.1", "도메인 성능 벤치마크"],
  ["8.2", "전반적 성능 및 일반화 능력 총평"],
  ["8.3", "기술적 취약점 및 잠재적 리스크 요약"],
  ["9", "기술 개선 권고안"],
];

/** 출처별 이름. AI 칸은 모델 이름을 괄호에 단다(모르면 'AI 작성' 만). */
export function narrativeRecordLabel(source: NarrativeSectionSource, model: string | null | undefined): string {
  if (source === "llm") return model ? `AI 작성(${model})` : "AI 작성";
  if (source === "fallback") return "규칙 기반 문장";
  return "고정 문구";
}

/** 상자를 그릴 성적서인가 — 판 3 · 서술이 끝남(대기·실패 아님) · 칸별 출처가 있음. */
export function showsNarrativeRecord(data: FinalReportData): boolean {
  if (!usesSchema3(data)) return false;
  if (data.narrativeSource === "pending" || data.narrativeSource === "failed") return false;
  return Object.keys(data.narrativeSections ?? {}).length > 0;
}

export function NarrativeRecordPanel({ data }: { data: FinalReportData }) {
  if (!showsNarrativeRecord(data)) return null;
  const sections = data.narrativeSections ?? {};
  const known = NARRATIVE_RECORD_SECTIONS.filter(([section]) => section in sections);
  // 모르는 칸 번호(서버가 칸을 더했을 때)도 버리지 않고 번호 순으로 뒤에 붙인다.
  const extra = Object.keys(sections)
    .filter((section) => !NARRATIVE_RECORD_SECTIONS.some(([known]) => known === section))
    .sort()
    .map((section) => [section, ""] as const);
  return (
    <details
      aria-label="작성 기록"
      className="print:hidden mb-6 rounded border border-border bg-muted px-4 py-3 text-xs text-foreground-secondary"
    >
      <summary className="cursor-pointer select-none">
        <span className="font-semibold text-foreground-secondary">작성 기록</span>
        <span className="text-muted-foreground"> · 7·8·9절 칸마다 쓴 방식(화면에만 보이며 인쇄본에는 없습니다)</span>
      </summary>
      <ul className="mt-2 space-y-1">
        {[...known, ...extra].map(([section, title]) => (
          <li key={section}>
            <span className="text-foreground-secondary">{title ? `${section} ${title}` : section}</span>
            <span className="text-muted-foreground">{" — "}</span>
            <span>{narrativeRecordLabel(sections[section], data.narrativeModels?.[section])}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
