import { describe, it, expect } from "vitest";
import { METRICS, getAvailableMetrics, type TaskType } from "./evaluationData";

/**
 * ISSUES.md C-05 — 성적서 5절 '시험방법 및 산정식' 칸에 인쇄되는 공식이 실제 산출값을
 * 만들지 못했다.
 *
 * 구현은 SPEC 과 맞다. **인쇄 문자열만 어긋났다.** 그래서 독자가 표에 적힌 식으로
 * 재계산하면 성적서의 수치가 나오지 않는다 — 공식 성적서 안에서 '산출식'과 '산출 결과'가
 * 검산되지 않으므로 **성적서의 검증 가능성 자체가 훼손된다.**
 *
 * 재현 데이터 기준 실측(대장 근거):
 *   M12 `∑TP/∑(TP+FP+FN)` (micro-Jaccard) → 0.800 인쇄, 실제 0.889
 *   M4·M5 `2(P·R)/(P+R)` (이진 F1) → 0.7059 인쇄, 실제 macro-F1 0.700
 *   M2·M3 `TP/(TP+FP)` (단일 클래스 식) → 전역 0.889 vs 인쇄된 M2 값 0.750
 */
const formulaOf = (id: string) => METRICS.find((m) => m.id === id)?.formula ?? "";

describe("C-05 — 인쇄되는 산정식이 실제 산출 방식을 말한다", () => {
  it("M2·M3 는 평균 방식을 밝힌다(단일 클래스 식이 아니다)", () => {
    expect(formulaOf("M2")).toMatch(/macro|평균/i);
    expect(formulaOf("M3")).toMatch(/macro|평균/i);
  });

  it("M4·M5 는 클래스별 F 를 평균한다는 사실을 밝힌다", () => {
    // macro-F1 은 macro-P 와 macro-R 의 조화평균이 **아니다**. 이진 F1 식을 그대로
    // 인쇄하면 독자가 재계산했을 때 다른 수가 나온다.
    expect(formulaOf("M4")).toMatch(/macro|평균/i);
    expect(formulaOf("M5")).toMatch(/macro|평균/i);
  });

  it("M12 는 micro-Jaccard 식이 아니다", () => {
    expect(formulaOf("M12")).not.toContain("∑ TP / ∑ (TP+FP+FN)");
    expect(formulaOf("M12")).toMatch(/micro/i);
  });

  it("M11·M13 도 평균 방식을 밝힌다", () => {
    expect(formulaOf("M11")).toMatch(/macro|평균/i);
    expect(formulaOf("M13")).toMatch(/weighted|가중/i);
  });

  it("모든 노출 지표에 산정식이 있다(빈 칸을 인쇄하지 않는다)", () => {
    const taskTypes: TaskType[] = ["binary", "multiclass", "multilabel"];
    const missing = taskTypes.flatMap((t) =>
      getAvailableMetrics(t).filter((m) => !m.formula?.trim()).map((m) => `${t}:${m.id}`),
    );

    expect(missing).toEqual([]);
  });
});
