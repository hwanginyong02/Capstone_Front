/**
 * 예시본 전체 비교기(판 4 라운드 S6 ①) — 시험 파일이 아니다(수집되지 않음). `exampleFull.test.tsx` 가 쓴다.
 *
 * 예시본 사본(`example.md`) **전체**와 그린 글 **전체**를 같은 단위로 바꿔 자리마다 정확히 견준다.
 * - 단위 = 제목·문단·목록 항목 한 줄 하나(`text`), 표 행 하나(`row` — 칸 배열). 표 구분 줄은 단위가 아니다.
 *   예시본 쪽은 렌더 도구의 `exampleLines`(제목 `#`·글머리 `- `·인용 `> `·앞뒤 빈칸을 뗌, 번호 목록 번호는 그대로)를 그대로 쓴다.
 *   그린 글 쪽은 `blockText` 의 한 줄이 한 단위(표 행은 "| 칸1 | 칸2" 를 칸 배열로).
 * - `expectExampleBlock`(사이에 다른 줄이 있어도 통과)과 달리 **개수·순서·자리**까지 같아야 한다 — 단위 수가 다르거나 한 자리라도
 *   다르면 차이 목록이 비지 않는다.
 * - 가림과 허용 동치는 이 파일이 아니라 시험 쪽 명시 목록이 정한다(바꾼 개수를 시험이 단정).
 */
import { exampleLines, type ExampleLine } from "../render/renderEd4";

export type Unit = ExampleLine;

/** 예시본 글(일부 또는 전체) → 단위 목록. */
export const exampleUnits = (markdown: string): Unit[] => exampleLines(markdown);

/** 그린 글(`screenText`·`printText`·`byNumberText`) → 단위 목록. "|" 로 시작하는 줄은 표 행. */
export function renderedUnits(rendered: string): Unit[] {
  return rendered
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "")
    .map((l) => (l.startsWith("|") ? { kind: "row", cells: l.split("|").slice(1).map((c) => c.trim()) } : { kind: "text", text: l }));
}

export const showUnit = (u: Unit | undefined) => (u === undefined ? "(없음)" : u.kind === "row" ? `| ${u.cells.join(" | ")} |` : u.text);

const sameUnit = (a: Unit, b: Unit) => JSON.stringify(a) === JSON.stringify(b);

/**
 * 두 단위 목록의 차이(같으면 빈 목록). 자리마다 견주고, 수가 다르면 그것도 적는다. 첫 차이부터 최대 `limit` 개.
 */
export function compareUnits(want: Unit[], have: Unit[], limit = 5): string[] {
  const out: string[] = [];
  if (want.length !== have.length) out.push(`단위 수가 다르다: 예시본 ${want.length}, 그린 글 ${have.length}`);
  const n = Math.max(want.length, have.length);
  for (let i = 0; i < n && out.length < limit; i += 1) {
    if (want[i] === undefined || have[i] === undefined || !sameUnit(want[i], have[i])) {
      out.push(`#${i}\n  예시본: ${showUnit(want[i])}\n  그린 글: ${showUnit(have[i])}`);
    }
  }
  return out;
}
