/**
 * 예시본 전체 대조(판 4 라운드 S6 ①, 계획 6절 검증 1 "비교기") — bc_strong 판 4 발급본(`render/fixtures/bc_strong.issued.json`)을
 * 세 경로(화면·인쇄·번호 열기)로 그린 **전체 글**을 예시본 사본(`example.md`) **전체**와 같은 단위(제목·문단·목록 항목·표 행의 칸)로
 * 맞춰 자리마다 정확히 비교한다(`exampleCompare.ts`). 사이에 낀 줄·빠진 줄·순서·개수까지 잡는다.
 *
 * 예시본 쪽에서 바꾸는 것은 아래 명시 목록뿐이고, 목록마다 바꾼 개수를 단정한다.
 * - 가림(예시본 글을 대조하지 않거나 실제 값으로 바꿔 대조):
 *   1. 머리 메모 — 예시본 첫 줄 "> 예시본 메모 (성적서 내용 아님)…"(1단위, 뺌)
 *   2. 부록 1 — "## 부록 1. 성적서 점검 결과"부터 "발급 이력" 앞까지(62단위, 뺌 — 판 4 범위 밖, 심판 라운드 몫)
 *   3. ○ 칸 — 파일 해시·파일 크기·평가 엔진 버전(3칸, 손으로 적은 실제 값으로 바꿔 대조. 값이 맞는지는 `rpt0001.test.tsx` 가
 *      저장소 안 CSV 로 다시 계산해 단정)
 *   4. 평가 수행 일시 — 픽스처의 평가 응답은 S1 골든(2026-10-22T16:23:38+09:00)이라 발급본의 18:45:58 과 다르다(1칸, 실제 값으로 바꿈)
 * - 허용 동치(같은 뜻으로 보는 글 차이):
 *   1. 4.7 그림 줄 — 예시본 줄 끝 " (그림)"은 그림 자리 표시, 그린 글은 그림을 글로 뽑지 않는다(2줄, 꼬리를 떼고 대조)
 * - 계획에 있던 나머지 후보는 필요 없어 목록에 넣지 않았다(필요 없음을 아래에서 단정):
 *   - 서술 문단 8개·권고 칸 6개: bc_strong 픽스처의 서술 칸이 예시본 글자 그대로라(`render/generate.test.tsx`) 가리지 않고 대조한다.
 *   - 혼자 선 목록 번호: 판 4 는 번호를 글로 찍어(ol 없음) 번호만 있는 줄이 생기지 않는다.
 * 그린 글 쪽에서 빼는 것은 보고서 밖 화면 상자뿐이다: 번호 열기 머리 상자 3줄·작성 기록 상자 8줄(화면·인쇄 0줄).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { loadEd4, loadEd4Issuance } from "../render/ed4Fixtures";
import { byNumberText, EXAMPLE_PATH, printText, screenText } from "../render/renderEd4";
import { compareUnits, exampleUnits, renderedUnits, type Unit } from "./exampleCompare";

const EXAMPLE = readFileSync(EXAMPLE_PATH, "utf8");
const TITLE = "기계학습 분류 성능 시험성적서";
const END = "— 끝 —";
/** 2.2 파일 해시 실제 값(손으로 옮겨 적음 — RPT-2026-0001 원본 CSV 의 sha256). */
const BC_SHA256 = "4ead9f2ccc8da32c0c3148f02ea6ff4e030c156d9873eeb99883df73f3a49f9d";

const text = (t: string): Unit => ({ kind: "text", text: t });
const isText = (u: Unit, t: string) => u.kind === "text" && u.text === t;

/* ------------------------------------------------------------------ *
 * 명시 목록 — 가림·허용 동치
 * ------------------------------------------------------------------ */

/** 가림 1·2: 뺄 단위 구간(시작 단위 ~ 끝 단위 앞). 개수 단정. */
const DROPS = [
  { name: "머리 메모", from: (u: Unit) => u.kind === "text" && u.text.startsWith("예시본 메모 (성적서 내용 아님): "), until: (u: Unit) => isText(u, TITLE), count: 1 },
  { name: "부록 1", from: (u: Unit) => isText(u, "부록 1. 성적서 점검 결과"), until: (u: Unit) => isText(u, "발급 이력"), count: 62 },
] as const;

/** 가림 3·4: 표 행(첫 칸으로 찾음)의 둘째 칸을 실제 값으로. */
const CELLS = [
  { name: "○ 파일 해시", label: "파일 해시(SHA-256)", from: "○", to: BC_SHA256 },
  { name: "○ 파일 크기", label: "파일 크기", from: "○", to: "3,727바이트" },
  { name: "○ 평가 엔진 버전", label: "평가 엔진 버전", from: "○", to: "1.0.0" },
  { name: "평가 수행 일시", label: "평가 수행 일시", from: "2026-10-22T18:45:58+09:00", to: "2026-10-22T16:23:38+09:00" },
] as const;

/** 허용 동치 1: 4.7 그림 줄의 꼬리. */
const FIGURE_TAIL = " (그림)";

interface Applied {
  units: Unit[];
  dropped: Record<string, number>;
  cells: Record<string, number>;
  figure: number;
}

/** 예시본 전체 단위에 명시 목록을 적용한다(개수를 함께 돌려준다). */
function maskedExampleUnits(markdown = EXAMPLE): Applied {
  let units = exampleUnits(markdown);
  const dropped: Record<string, number> = {};
  for (const d of DROPS) {
    const a = units.findIndex(d.from);
    const b = units.findIndex((u, i) => i > a && d.until(u));
    if (a < 0 || b < 0) throw new Error(`가림 "${d.name}" 구간을 찾지 못했다`);
    dropped[d.name] = b - a;
    units = [...units.slice(0, a), ...units.slice(b)];
  }
  const cells: Record<string, number> = {};
  for (const c of CELLS) {
    cells[c.name] = 0;
    units = units.map((u) => {
      if (u.kind !== "row" || u.cells[0] !== c.label || u.cells[1] !== c.from) return u;
      cells[c.name] += 1;
      return { kind: "row", cells: [u.cells[0], c.to, ...u.cells.slice(2)] };
    });
  }
  const s47 = units.findIndex((u) => isText(u, "4.7 곡선"));
  const s48 = units.findIndex((u) => isText(u, "4.8 응답시간"));
  let figure = 0;
  units = units.map((u, i) => {
    if (u.kind !== "text" || !u.text.endsWith(FIGURE_TAIL)) return u;
    if (i < s47 || i > s48) throw new Error(`4.7 밖의 그림 줄: ${u.text}`);
    figure += 1;
    return text(u.text.slice(0, -FIGURE_TAIL.length));
  });
  return { units, dropped, cells, figure };
}

/** 그린 글 → 보고서 본문 단위(제목 줄 ~ "— 끝 —"). 앞에 붙은 화면 상자 줄 수를 함께 돌려준다. */
function bodyUnits(rendered: string): { units: Unit[]; before: number; after: number } {
  const all = renderedUnits(rendered);
  const a = all.findIndex((u) => isText(u, TITLE));
  const b = all.findIndex((u) => isText(u, END));
  if (a < 0 || b < 0) throw new Error("그린 글에 제목 또는 끝 줄이 없다");
  return { units: all.slice(a, b + 1), before: a, after: all.length - b - 1 };
}

/* ------------------------------------------------------------------ *
 * 명시 목록 자체
 * ------------------------------------------------------------------ */
describe("가림·허용 동치 목록 — 개수 단정", () => {
  const m = maskedExampleUnits();

  it("가림: 머리 메모 1단위, 부록 1 62단위, ○ 칸 3개, 평가 수행 일시 1칸", () => {
    expect(m.dropped).toEqual({ "머리 메모": 1, "부록 1": 62 });
    expect(m.cells).toEqual({ "○ 파일 해시": 1, "○ 파일 크기": 1, "○ 평가 엔진 버전": 1, "평가 수행 일시": 1 });
  });

  it("허용 동치: 4.7 그림 줄 2개", () => {
    expect(m.figure).toBe(2);
  });

  it("예시본 전체 단위 수 329 → 가린 뒤 266(부록 1 뒤 발급 이력·끝 줄은 남는다)", () => {
    expect(exampleUnits(EXAMPLE)).toHaveLength(329);
    expect(m.units).toHaveLength(266);
    expect(m.units[0]).toEqual(text(TITLE));
    expect(m.units.at(-1)).toEqual(text(END));
    // 부록 1 구간은 "발급 이력" 앞에서 끝난다 — 6.2 권고 마지막 행 뒤에 바로 발급 이력이 온다.
    expect(m.units.slice(-5)).toEqual([
      { kind: "row", cells: ["중간", "P1 · 핵심 지표 근소 합격 (Recall)", "결정 임계값을 조정할 때는 Recall과 Precision을 함께 확인하고, 변경 후 다시 평가한다.", "임계값 변경이 놓침과 재판독 부담에 미치는 영향을 사전에 파악할 수 있다."] },
      text("발급 이력"),
      { kind: "row", cells: ["버전", "발급일", "비고"] },
      { kind: "row", cells: ["v1.0", "2026-10-22", "최초 발급"] },
      text(END),
    ]);
  });

  it("가린 뒤 예시본 본문에 ○ 가 남지 않는다(○ 는 머리 메모·부록 1.3 의 것뿐이었다)", () => {
    expect(JSON.stringify(m.units)).not.toContain("○");
    expect(EXAMPLE.split("○").length - 1).toBe(3 + 3 + 2); // 본문 3칸 + 부록 1.3 의 ○건 3개 + 머리 메모의 ○ 2번
  });

  it("서술 문단 8개·권고 행 3개는 가리지 않고 대조한다(가린 단위에 5·6절이 없다)", () => {
    const i5 = m.units.findIndex((u) => isText(u, "5. 분석 소견"));
    const i6 = m.units.findIndex((u) => isText(u, "6. 개선 권고"));
    const hist = m.units.findIndex((u) => isText(u, "발급 이력"));
    // 서술 칸 8개 = 5.1~5.6 소절 제목 뒤 문단 6 + 6.1·6.2 소절 제목 뒤 문단 2 — 모두 가린 구간 밖에 남아 있다.
    const heads = ["5.1 판정과 불확실성", "5.2 오분류", "5.3 데이터 분포", "5.4 참조 범위", "5.5 운영 위험", "5.6 추가 관찰", "6.1 데이터", "6.2 모델과 운영"];
    const paragraphs = heads.map((h) => m.units[m.units.findIndex((u) => isText(u, h)) + 1]);
    expect(paragraphs.filter((u) => u?.kind === "text" && u.text.length > 100)).toHaveLength(8);
    expect(i5).toBeLessThan(i6);
    const recommendRows = m.units.slice(i6, hist).filter((u) => u.kind === "row" && /^(낮음|중간|높음)$/.test(u.cells[0]));
    expect(recommendRows).toHaveLength(3); // 권고 칸 = 3행 × (권고·기대 효과) 6칸
  });

  it("혼자 선 목록 번호는 필요 없다 — 예시본에도 그린 글에도 번호만 있는 단위가 없다", () => {
    const lone = (us: Unit[]) => us.filter((u) => u.kind === "text" && /^\d+\.$/.test(u.text));
    expect(lone(exampleUnits(EXAMPLE))).toEqual([]);
    expect(lone(renderedUnits(screenText(loadEd4("bc_strong", "issued"))))).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 세 경로 전체 대조
 * ------------------------------------------------------------------ */
describe("bc_strong 판 4 발급본 = 예시본 전체(가림·허용 동치만 빼고) — 세 경로", () => {
  const want = maskedExampleUnits().units;

  it("화면 — 앞뒤 화면 상자 0줄, 단위 266개가 자리마다 같다", () => {
    const body = bodyUnits(screenText(loadEd4("bc_strong", "issued")));
    expect([body.before, body.after]).toEqual([0, 0]);
    expect(compareUnits(want, body.units)).toEqual([]);
  });

  it("인쇄 — 앞뒤 화면 상자 0줄, 단위 266개가 자리마다 같다", async () => {
    const body = bodyUnits(await printText(loadEd4("bc_strong", "issued")));
    expect([body.before, body.after]).toEqual([0, 0]);
    expect(compareUnits(want, body.units)).toEqual([]);
  });

  it("번호 열기 — 앞에 머리 상자 3줄·작성 기록 상자 8줄(보고서 밖), 본문 단위 266개가 자리마다 같다", async () => {
    const rendered = await byNumberText(loadEd4("bc_strong", "final"), loadEd4Issuance("bc_strong"));
    const body = bodyUnits(rendered);
    expect([body.before, body.after]).toEqual([11, 0]);
    const head = renderedUnits(rendered).slice(0, 11);
    expect(head[0]).toMatchObject({ kind: "text", text: expect.stringMatching(/^서버 보관본 · /) });
    expect(head[3]).toMatchObject({ kind: "text", text: expect.stringMatching(/^작성 기록 · /) });
    expect(compareUnits(want, body.units)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 비교기 자체 — 이빨
 * ------------------------------------------------------------------ */
describe("비교기 자체 시험 — 진짜 그린 글(화면)을 하나씩 망가뜨리면 차이가 나온다", () => {
  const want = maskedExampleUnits().units;
  const rendered = screenText(loadEd4("bc_strong", "issued"));
  const lines = rendered.split("\n");
  const units = (t: string) => bodyUnits(t).units;
  const replaceLine = (i: number, line: string) => lines.map((l, j) => (j === i ? line : l)).join("\n");
  const at = (pred: (l: string) => boolean) => {
    const i = lines.findIndex(pred);
    expect(i).toBeGreaterThanOrEqual(0);
    return i;
  };

  it("그대로면 차이 없음", () => {
    expect(compareUnits(want, units(rendered))).toEqual([]);
  });

  it("문단 글자 하나 바뀜", () => {
    const i = at((l) => l.startsWith("종합 판정은 최종 합격이다."));
    const diff = compareUnits(want, units(replaceLine(i, lines[i].replace("최종 합격이다", "최종 합겨이다"))));
    expect(diff).toHaveLength(1);
    expect(diff[0]).toContain("최종 합겨이다");
  });

  it("표 칸 글자 하나 바뀜", () => {
    const i = at((l) => l.startsWith("| M3 | Recall (핵심) |"));
    expect(compareUnits(want, units(replaceLine(i, lines[i].replace("0.984", "0.985"))))).toHaveLength(1);
  });

  it("문단 순서 바뀜(5.2 와 5.3 의 서술 문단 맞바꿈)", () => {
    const a = at((l) => l.startsWith("혼동행렬 기준 전체 171건 중"));
    const b = at((l) => l.startsWith("평가 데이터의 불균형 비율은"));
    const swapped = lines.map((l, j) => (j === a ? lines[b] : j === b ? lines[a] : l)).join("\n");
    expect(compareUnits(want, units(swapped))).toHaveLength(2);
  });

  it("표 행 하나 빠짐(4.3 M19 행)", () => {
    const i = at((l) => l.startsWith("| M19 | Log Loss | 0.053"));
    const diff = compareUnits(want, units(lines.filter((_, j) => j !== i).join("\n")));
    expect(diff[0]).toBe("단위 수가 다르다: 예시본 266, 그린 글 265");
    expect(diff.length).toBeGreaterThan(1);
  });

  it("절 하나 통째로 빠짐(4.8 제목·문단)", () => {
    const i = at((l) => l === "4.8 응답시간");
    const diff = compareUnits(want, units(lines.filter((_, j) => j !== i && j !== i + 1).join("\n")));
    expect(diff[0]).toBe("단위 수가 다르다: 예시본 266, 그린 글 264");
  });

  it("줄 하나 더 낌(사이에 다른 줄 — expectExampleBlock 은 통과시키는 경우)", () => {
    const i = at((l) => l === "4.8 응답시간");
    const extra = [...lines.slice(0, i), "끼어든 줄", ...lines.slice(i)].join("\n");
    expect(compareUnits(want, units(extra))[0]).toBe("단위 수가 다르다: 예시본 266, 그린 글 267");
  });

  it("예시본 쪽이 바뀌어도 잡는다(가림 밖 한 글자)", () => {
    const changed = maskedExampleUnits(EXAMPLE.replace("| M1 | Accuracy | 0.982 |", "| M1 | Accuracy | 0.983 |")).units;
    expect(compareUnits(changed, units(rendered))).toHaveLength(1);
  });
});
