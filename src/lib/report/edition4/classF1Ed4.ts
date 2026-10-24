/**
 * 클래스별 표의 F1 한 칸(판 4) — 공통 규칙(계약 decided 'D3 클래스별 표의 다른 클래스', 대조 표 distinct 의 class_table 줄,
 * 명세 `function_names.class_f1`). S4 렌더러의 M22 클래스별 표와 4.4 최약 클래스 표가 이 함수 하나로 찍는다.
 *
 * - 최약 클래스: 사실 시트 `facts.weakest_class.f1_text`(같은 성적서의 4.4·5절·사실 시트와 같은 글자). 없으면 같은 규칙으로
 *   다시 낸다(판정 대상 지표 value_text(D2) → `ed4Distinct(최약 F1, 다른 클래스 F1)`).
 * - 그 밖 클래스: 같은 원값의 판정 대상 지표가 있으면 그 value_text(D2)가 먼저, 아니면 `ed4Distinct(그 값, [최약 F1])` — 셋째
 *   자리로 최약 클래스와 같아 보이면 서로 달라질 때까지 늘린다. 다른 클래스끼리 같아 보이는 것은 그대로(최약 클래스와 부딪치는
 *   클래스만 늘린다 — 오케스트레이터 결정, 후속 U2).
 * - 최약 클래스가 없으면(정답 클래스 둘 미만) D2 → plain.
 *
 * 백엔드 `wording_ed4.class_f1_text_ed4(fs, label, value)`(사실 보기 클래스별 표·평균 차이의 기준 클래스, 규칙 문장
 * `Ctx.class_f1`)와 같은 결과다 — 같은 대조 표로 시험한다.
 */
import type { KpiResult } from "../../../types/finalReport.types";
import type { WeakestClassFact } from "../narrativeFacts";
import { ed4Distinct } from "./edition4Number";
import { judgedValueTextEd4, sameValueTextEd4 } from "./sameValueEd4";

export interface ClassF1ContextEd4 {
  /** 사실 시트 `facts.weakest_class`(판 4 — f1_text 가 실려 있다). 정답 클래스가 둘 미만이면 null. */
  weakest: Pick<WeakestClassFact, "label" | "f1" | "f1_text"> | null;
  /** 판 4 run 의 지표 결과 — D2(같은 원값의 판정 대상 지표 value_text). */
  kpiResults: KpiResult[];
  /** 클래스별 표의 클래스 줄 — 최약 클래스에 f1_text 가 없을 때만 쓴다(다른 클래스 F1). */
  classRows?: ReadonlyArray<{ label: string; f1: number | null }>;
}

/** 클래스별 표의 F1 한 칸. 값이 없으면 null(그리는 쪽이 "—"). */
export function classF1TextEd4(label: string, value: number | null | undefined, ctx: ClassF1ContextEd4): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const { weakest, kpiResults } = ctx;
  if (weakest === null) return sameValueTextEd4(kpiResults, value);
  if (label === weakest.label) {
    if (weakest.f1_text !== undefined) return weakest.f1_text;
    const others = (ctx.classRows ?? []).filter((r) => r.label !== weakest.label && r.f1 !== null).map((r) => r.f1!);
    return judgedValueTextEd4(kpiResults, weakest.f1) ?? ed4Distinct(weakest.f1, others);
  }
  return judgedValueTextEd4(kpiResults, value) ?? ed4Distinct(value, [weakest.f1]);
}
