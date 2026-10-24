/**
 * 갈래 b1(표지·1절·2절) 시험 도구 — 시험 파일만 쓴다(수집되지 않음). 렌더 도구(`test/edition4/render/renderEd4.tsx`)의 예시본
 * 블록을 **그린 글과 같은 줄 모양**으로 바꿔, 절 하나의 그린 줄 전체와 `toEqual` 로 맞춘다(사이에 낀 줄·빠진 줄·순서까지 잡음 —
 * `expectExampleBlock` 은 사이 줄을 허용한다).
 */
import { exampleBlock, exampleLines } from "../../../../test/edition4/render/renderEd4";

/** 예시본 블록 → 그린 글의 줄 모양(글 줄은 그대로, 표 줄은 "| 칸1 | 칸2" — 렌더 도구가 표 행을 찍는 꼴). */
export function asRendered(block: string): string[] {
  return exampleLines(block).map((line) => (line.kind === "text" ? line.text : `| ${line.cells.join(" | ")}`));
}

/** 그린 글에서 `first` 줄(정확히 하나)부터 `stop` 줄 앞까지. 둘 중 하나가 없거나 `first` 가 여럿이면 던진다. */
export function partOf(rendered: string, first: string, stop: string): string[] {
  const lines = rendered.split("\n").map((l) => l.trim());
  const starts = lines.flatMap((l, i) => (l === first ? [i] : []));
  if (starts.length !== 1) throw new Error(`그린 글에 "${first}" 줄이 ${starts.length}개다`);
  const end = lines.indexOf(stop, starts[0] + 1);
  if (end < 0) throw new Error(`그린 글에 "${first}" 뒤 "${stop}" 줄이 없다`);
  return lines.slice(starts[0], end);
}

/** 예시본의 ○(시스템이 채우는 칸)를 차례로 실제 값으로 바꾼다. ○ 개수가 값 개수와 다르면 던진다(가림 개수 단정). */
export function fillCircles(block: string, values: ReadonlyArray<string>): string {
  const count = block.split("○").length - 1;
  if (count !== values.length) throw new Error(`○ 칸이 ${count}개다(값 ${values.length}개)`);
  let i = 0;
  return block.replace(/○/g, () => values[i++]);
}

/** 예시본 표지 블록 — 제목 줄부터 "## 1. 시험 개요" 앞까지(제목이 h1 이라 `exampleBlock` 은 문서 끝까지 잡는다). */
export function coverExampleBlock(): string {
  const all = exampleBlock("# 기계학습 분류 성능 시험성적서");
  const end = all.indexOf("\n## 1. 시험 개요");
  if (end < 0) throw new Error("예시본 표지 블록 끝을 찾지 못했다");
  return all.slice(0, end);
}

/** 그린 글의 표 줄 하나를 칸 배열로("| a | b" → ["a", "b"]). */
export function cellsOf(line: string): string[] {
  return line.split("|").slice(1).map((c) => c.trim());
}
