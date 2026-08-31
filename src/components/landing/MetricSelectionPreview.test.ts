import { describe, it, expect } from "vitest";
import { PREVIEW_METRICS } from "./MetricSelectionPreview";
import { METRICS, getRequiredColumnsForMetric } from "../../data/evaluationData";

/**
 * 랜딩 미리보기가 실제 지표 정의와 어긋나지 않는지 지킨다.
 *
 * 이 미리보기는 디자인이 표시 항목을 정하는 정적 화면이라 지표 표에서 파생하지 않는다.
 * 그 대가로 드리프트가 생기는데, 실제로 M6 가 "score 필요"라는 옛 정보를 계속 보여준 적이 있다.
 * 컴포넌트를 데이터 모듈에 결합시키는 대신 여기서 대조만 한다.
 */
describe("랜딩 지표 미리보기 ↔ 실제 지표 정의", () => {
  // 컬럼이 아닌 UI 입력값(미리보기는 이것도 칩으로 함께 보여준다)
  const NON_COLUMN_CHIPS = new Set(["beta", "positiveClass"]);

  it("지표 ID·이름·부제가 실제 정의와 일치한다", () => {
    const mismatches = PREVIEW_METRICS.map(([id, name, subtitle]) => {
      const actual = METRICS.find((m) => m.id === id);
      return { id, expected: { name, subtitle }, actual: actual && { name: actual.name, subtitle: actual.subtitle } };
    }).filter((r) => r.actual?.name !== r.expected.name || r.actual?.subtitle !== r.expected.subtitle);

    expect(mismatches).toEqual([]);
  });

  it("표시되는 요구 컬럼이 binary 기준 실제 요구사항과 일치한다", () => {
    const mismatches = PREVIEW_METRICS.map(([id, , , chips]) => ({
      id,
      preview: chips.filter((c) => !NON_COLUMN_CHIPS.has(c)),
      actual: getRequiredColumnsForMetric("binary", id).map((c) => c.code),
    })).filter((r) => r.preview.join() !== r.actual.join());

    expect(mismatches).toEqual([]);
  });

  it("미리보기에 실린 지표는 모두 binary 를 지원한다", () => {
    const unsupported = PREVIEW_METRICS.map(([id]) => id).filter(
      (id) => !METRICS.find((m) => m.id === id)?.supportedTaskTypes.includes("binary"),
    );

    expect(unsupported).toEqual([]);
  });
});
