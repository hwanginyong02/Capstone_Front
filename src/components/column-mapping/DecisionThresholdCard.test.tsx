import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DecisionThresholdCard, withinUnitInterval } from "./DecisionThresholdCard";
import type { MappingRole, MappingRow } from "../../types/mapping.types";

/**
 * ISSUES.md A-01 — 결정 임계값 입력 UI(SPEC §6).
 *
 * 임계값은 **파생이 실제로 일어날 때만** 의미가 있다. 하드 예측이 매핑돼 있으면
 * 백엔드는 그것을 우선하므로(SPEC §1 규칙 1) 임계값은 쓰이지 않는다 — 쓰이지 않는
 * 입력을 보여주면 사용자는 자기가 정한 값이 반영됐다고 믿게 된다.
 */

function row(originalName: string, confirmedRole: MappingRole | null): MappingRow {
  return {
    originalName,
    confirmedRole,
    suggestedRole: confirmedRole,
    sampleValues: [],
    confidence: 1,
    modified: false,
    warnings: [],
  } as unknown as MappingRow;
}

const noop = () => {};

describe("DecisionThresholdCard — 언제 나타나는가", () => {
  it("binary: 점수만 매핑되면 나타난다", () => {
    render(
      <DecisionThresholdCard
        resolvedTaskType="binary"
        rows={[row("y", "y_true"), row("s", "score")]}
        decisionThreshold={null}
        onDecisionThresholdChange={noop}
      />,
    );
    expect(screen.getByLabelText("decision threshold")).toBeInTheDocument();
  });

  it("binary: 하드 예측이 있으면 나타나지 않는다(파생이 일어나지 않으므로)", () => {
    const { container } = render(
      <DecisionThresholdCard
        resolvedTaskType="binary"
        rows={[row("y", "y_true"), row("p", "y_pred"), row("s", "score")]}
        decisionThreshold={null}
        onDecisionThresholdChange={noop}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("확률 컬럼이 하나도 없으면 나타나지 않는다", () => {
    const { container } = render(
      <DecisionThresholdCard
        resolvedTaskType="binary"
        rows={[row("y", "y_true")]}
        decisionThreshold={null}
        onDecisionThresholdChange={noop}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("multiclass 는 argmax 라 임계값 개념이 없다 — 나타나지 않는다", () => {
    const { container } = render(
      <DecisionThresholdCard
        resolvedTaskType="multiclass"
        rows={[row("y", "y_true"), row("prob_cat", "prob_class_*")]}
        decisionThreshold={null}
        onDecisionThresholdChange={noop}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("multilabel 은 확률 컬럼마다 입력을 준다(레이블별 임계값)", () => {
    render(
      <DecisionThresholdCard
        resolvedTaskType="multilabel"
        rows={[row("t", "y_true"), row("s_a", "prob_label_*"), row("s_b", "prob_label_*")]}
        decisionThreshold={null}
        onDecisionThresholdChange={noop}
      />,
    );
    expect(screen.getByLabelText("s_a decision threshold")).toBeInTheDocument();
    expect(screen.getByLabelText("s_b decision threshold")).toBeInTheDocument();
  });
});

describe("DecisionThresholdCard — 값 편집", () => {
  it("기본값은 SPEC §6 의 0.5 다", () => {
    render(
      <DecisionThresholdCard
        resolvedTaskType="binary"
        rows={[row("y", "y_true"), row("s", "score")]}
        decisionThreshold={null}
        onDecisionThresholdChange={noop}
      />,
    );
    expect((screen.getByLabelText("decision threshold") as HTMLInputElement).value).toBe("0.5");
  });

  it("binary 는 스칼라를 올려보낸다", () => {
    const onChange = vi.fn();
    render(
      <DecisionThresholdCard
        resolvedTaskType="binary"
        rows={[row("y", "y_true"), row("s", "score")]}
        decisionThreshold={null}
        onDecisionThresholdChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("decision threshold"), { target: { value: "0.8" } });
    expect(onChange).toHaveBeenCalledWith(0.8);
  });

  it("multilabel 은 컬럼명을 키로 하는 객체를 올려보낸다", () => {
    const onChange = vi.fn();
    render(
      <DecisionThresholdCard
        resolvedTaskType="multilabel"
        rows={[row("t", "y_true"), row("s_a", "prob_label_*"), row("s_b", "prob_label_*")]}
        decisionThreshold={null}
        onDecisionThresholdChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("s_a decision threshold"), { target: { value: "0.8" } });
    expect(onChange).toHaveBeenCalledWith({ s_a: 0.8, s_b: 0.5 });
  });

  it("[0,1] 을 벗어나면 왕복 전에 화면이 알려준다(백엔드는 422)", () => {
    render(
      <DecisionThresholdCard
        resolvedTaskType="binary"
        rows={[row("y", "y_true"), row("s", "score")]}
        decisionThreshold={1.5}
        onDecisionThresholdChange={noop}
      />,
    );
    expect(screen.getByText(/0 과 1 사이/)).toBeInTheDocument();
  });
});

describe("withinUnitInterval", () => {
  it.each([
    [null, true],
    [0, true],
    [1, true],
    [0.5, true],
    [-0.1, false],
    [1.5, false],
    [{ a: 0.5, b: 0.9 }, true],
    [{ a: 0.5, b: 1.2 }, false],
  ] as Array<[number | Record<string, number> | null, boolean]>)("%o → %s", (value, expected) => {
    expect(withinUnitInterval(value)).toBe(expected);
  });
});
