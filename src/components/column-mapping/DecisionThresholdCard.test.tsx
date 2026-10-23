import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DecisionThresholdCard,
  parseThresholdText,
  requestDecisionThreshold,
  thresholdApplies,
  withinUnitInterval,
} from "./DecisionThresholdCard";
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
    expect(screen.getByLabelText("결정 임계값")).toBeInTheDocument();
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
    expect(screen.getByLabelText("s_a 결정 임계값")).toBeInTheDocument();
    expect(screen.getByLabelText("s_b 결정 임계값")).toBeInTheDocument();
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
    expect((screen.getByLabelText("결정 임계값") as HTMLInputElement).value).toBe("0.5");
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
    fireEvent.change(screen.getByLabelText("결정 임계값"), { target: { value: "0.8" } });
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
    fireEvent.change(screen.getByLabelText("s_a 결정 임계값"), { target: { value: "0.8" } });
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
    expect(screen.getByText(/0과 1 사이/)).toBeInTheDocument();
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

describe("칸을 지우면 (B4)", () => {
  it("parseThresholdText: 빈 칸은 null(기본값), 숫자가 아니면 undefined(저장하지 않음)", () => {
    expect(parseThresholdText("")).toBeNull();
    expect(parseThresholdText("  ")).toBeNull();
    expect(parseThresholdText("0.7")).toBe(0.7);
    expect(parseThresholdText("0")).toBe(0);
    expect(parseThresholdText("abc")).toBeUndefined();
  });

  it("이진: 지워도 0 을 보내지 않고 null(비우면 0.5)을 보낸다 — 칸은 빈 채로 둔다", () => {
    const onChange = vi.fn();
    render(
      <DecisionThresholdCard
        resolvedTaskType="binary"
        rows={[row("y", "y_true"), row("s", "score")]}
        decisionThreshold={0.7}
        onDecisionThresholdChange={onChange}
      />,
    );
    const input = screen.getByLabelText("결정 임계값") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(onChange).not.toHaveBeenCalledWith(0);
    expect(input.value).toBe("");
    expect(screen.getByText(/비우면 0.5/)).toBeInTheDocument();
  });

  it("멀티레이블: 지운 칸은 그 키만 지운다 — 다른 칸은 그대로", () => {
    const onChange = vi.fn();
    render(
      <DecisionThresholdCard
        resolvedTaskType="multilabel"
        rows={[row("t", "y_true"), row("s_a", "prob_label_*"), row("s_b", "prob_label_*")]}
        decisionThreshold={{ s_a: 0.6, s_b: 0.8 }}
        onDecisionThresholdChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("s_a 결정 임계값"), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith({ s_b: 0.8 });
    fireEvent.change(screen.getByLabelText("s_b 결정 임계값"), { target: { value: "0.7" } });
    expect(onChange).toHaveBeenLastCalledWith({ s_a: 0.6, s_b: 0.7 });
  });
});

describe("thresholdApplies — 카드와 확정 검사가 같이 쓰는 판정", () => {
  it("확률만 있을 때만, 다중 클래스는 아님", () => {
    expect(thresholdApplies("binary", [row("y", "y_true"), row("s", "score")])).toBe(true);
    expect(thresholdApplies("binary", [row("y", "y_true"), row("p", "y_pred"), row("s", "score")])).toBe(false);
    expect(thresholdApplies("binary", [row("y", "y_true")])).toBe(false);
    expect(thresholdApplies("multiclass", [row("y", "y_true"), row("c", "prob_class_*")])).toBe(false);
    expect(thresholdApplies("multilabel", [row("y", "y_true"), row("c", "prob_label_*")])).toBe(true);
  });
});

describe("requestDecisionThreshold — 요청에 실을 값(S2 P1, 결정 임계값 잔여값)", () => {
  it("지금 매핑에서 쓰이지 않으면 null — 범위 밖 옛 값이 422 를 부르지 않게", () => {
    const withPred = [row("y", "y_true"), row("p", "y_pred"), row("s", "score")];
    expect(requestDecisionThreshold("binary", withPred, 1.7)).toBeNull();
    expect(requestDecisionThreshold("multiclass", [row("y", "y_true"), row("c", "prob_class_*")], 0.3)).toBeNull();
  });

  it("쓰일 때는 그대로 — 스칼라, 그리고 null 은 null(기본값 0.5)", () => {
    const scoreOnly = [row("y", "y_true"), row("s", "score")];
    expect(requestDecisionThreshold("binary", scoreOnly, 0.7)).toBe(0.7);
    expect(requestDecisionThreshold("binary", scoreOnly, null)).toBeNull();
  });

  it("레이블별 값은 지금 확률 컬럼의 키만 남긴다(낡은 키 정리), 남는 게 없으면 null", () => {
    const rows = [row("y", "y_true"), row("s_a", "prob_label_*"), row("s_b", "prob_label_*")];
    expect(requestDecisionThreshold("multilabel", rows, { s_a: 0.6, old_col: 2, s_b: 0.7 })).toEqual({ s_a: 0.6, s_b: 0.7 });
    expect(requestDecisionThreshold("multilabel", rows, { gone: 0.4 })).toBeNull();
  });
});

describe("검증·평가 요청이 requestDecisionThreshold 를 거친다(배선)", () => {
  // 검증 훅과 평가 요청 스냅샷(서술 라운드 S3b)은 요청 본문을 안에서 만든다 — 저장값을 그대로 싣는 줄로 되돌아가면 실패한다.
  it.each(["../../hooks/useDataValidation.ts", "../../lib/report/evaluationRequest.ts"])("%s", (rel) => {
    const source = readFileSync(resolve(__dirname, rel), "utf-8");
    expect(source).toMatch(/decision_threshold: requestDecisionThreshold\(/);
    expect(source).not.toMatch(/decision_threshold:\s*(store|workflowState)\.decisionThreshold/);
  });
});
