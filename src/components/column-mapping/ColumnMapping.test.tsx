/**
 * ColumnMapping — Step 5 진행 판정(isValid).
 *
 * ISSUES.md E-13 — 새로고침으로 워크플로우 상태가 전부 날아간 뒤 이 화면에 들어오면
 * **매핑 행이 0개인데 '유효'로 판정되어** 다음 단계가 열린다. 실제 차단은 전적으로
 * 백엔드(`/api/confirm-mapping`)가 하고, 사용자는 네트워크 왕복 후 raw alert 창을 받는다.
 *
 * 진짜 기전은 대장 서술("매핑 행 검사가 없다")보다 한 단계 깊다 —
 *   ① `getRequiredColumnsForSelection` 이 selectedIds 를 순회하므로 **지표가 비면 요구 역할이 0개**가 된다
 *      → missingRoles 가 [] → 그 조건으로는 막을 수 없다.
 *   ② `taskType` 이 "" 면 `resolvedTaskType` 이 "multiclass" 로 둔갑해 **binary 전용 검사(positiveClass)까지
 *      건너뛴다**.
 * 둘이 겹쳐야 isValid=true 가 되고, 그 상태는 정확히 E-01(비영속)이 만들어낸다.
 *
 * 지금은 매핑이 지표 선택보다 앞이고 지표에 기대지 않는다 — 요구 역할은 늘 정답과 예측(또는
 * 확률)이다(docs/MATERIAL_PICKER.md §3). ① 의 기전은 그래서 사라졌다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColumnMapping } from "./ColumnMapping";
import type { MappingRow } from "../../types/mapping.types";

function row(originalName: string, confirmedRole: MappingRow["confirmedRole"]): MappingRow {
  return { originalName, sampleValues: ["1", "0"], inferredRole: confirmedRole, confirmedRole, modified: false, warnings: [] };
}

/** 컴포넌트를 렌더하고 onValidationChange 로 보고된 마지막 판정을 돌려준다. */
function validityOf(props: Partial<React.ComponentProps<typeof ColumnMapping>>): boolean {
  const onValidationChange = vi.fn();
  render(
    <ColumnMapping
      rows={[]}
      onRowsChange={vi.fn()}
      onValidationChange={onValidationChange}
      {...props}
    />
  );
  const calls = onValidationChange.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0];
}

describe("Step 5 진행 판정", () => {
  it("[E-13] 상태가 전부 비었으면 유효하지 않다 — 새로고침 직후의 실제 상태", () => {
    expect(validityOf({ taskType: "", rows: [] })).toBe(false);
  });

  it("[E-13] 매핑 행이 0개면 유효하지 않다", () => {
    expect(validityOf({ taskType: "multiclass", rows: [] })).toBe(false);
  });

  it("[E-13] 어떤 행에도 역할이 배정되지 않았으면 유효하지 않다", () => {
    expect(
      validityOf({
        taskType: "multiclass",
        rows: [row("col_a", "ignore"), row("col_b", null)],
      })
    ).toBe(false);
  });

  it("정답과 예측이 있으면 유효하다 — 매핑은 지표에 기대지 않는다", () => {
    expect(
      validityOf({
        taskType: "multiclass",
        rows: [row("id", "id"), row("t", "y_true"), row("p", "y_pred")],
      })
    ).toBe(true);
  });

  it("정답·예측이 빠지면 유효하지 않다 — 요구 역할이 0개가 되지 않는다", () => {
    expect(
      validityOf({
        taskType: "multiclass",
        rows: [row("id", "id"), row("t", "y_true")],
      })
    ).toBe(false);
  });

  it("[E-13] taskType 이 비면 유효하지 않다 — 'multiclass' 로 둔갑시키지 않는다", () => {
    expect(
      validityOf({
        taskType: "",
        rows: [row("id", "id"), row("t", "y_true"), row("p", "y_pred")],
      })
    ).toBe(false);
  });

  it("[E-13] 정상 매핑은 유효하다(수정이 정상 경로를 막지 않는다)", () => {
    expect(
      validityOf({
        taskType: "multiclass",
        rows: [row("id", "id"), row("t", "y_true"), row("p", "y_pred")],
      })
    ).toBe(true);
  });

  it("[E-13] binary 는 positiveClass 가 있어야 유효하다(기존 동작 보존)", () => {
    const base = {
      taskType: "binary" as const,
      rows: [row("id", "id"), row("t", "y_true"), row("p", "y_pred")],
      detectedClasses: ["0", "1"],
    };
    expect(validityOf({ ...base, positiveClass: "" })).toBe(false);
    expect(validityOf({ ...base, positiveClass: "1" })).toBe(true);
  });
});

describe("지표 제외는 없다 (docs/MATERIAL_PICKER.md §3)", () => {
  it("필수 컬럼이 빠지면 업로드로 돌아가라고만 한다 — 지표를 빼서 풀 수 없다", () => {
    render(
      <ColumnMapping
        taskType="multiclass"
        rows={[row("id", "id"), row("t", "y_true")]}
        onRowsChange={vi.fn()}
      />,
    );

    expect(screen.getByText("필수 컬럼이 빠졌습니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /업로드로 돌아가기/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /지표/ })).not.toBeInTheDocument();
  });
});

describe("평가 흐름에 놓지 않은 항목 (docs/MATERIAL_PICKER.md §12.4)", () => {
  const base = { taskType: "multiclass" as const, rows: [row("t", "y_true"), row("p", "y_pred")], onRowsChange: vi.fn() };

  it("클래스 레이블 설명 카드는 넣었을 때만 — picks 가 없으면(평가 흐름 이전) 보인다", () => {
    const { unmount } = render(<ColumnMapping {...base} evalDataPicks={[]} />);
    expect(screen.queryByText("클래스 레이블 설명")).not.toBeInTheDocument();
    unmount();

    const second = render(<ColumnMapping {...base} evalDataPicks={["classLabelDescriptions"]} />);
    expect(screen.getByText("클래스 레이블 설명")).toBeInTheDocument();
    second.unmount();

    render(<ColumnMapping {...base} />);
    expect(screen.getByText("클래스 레이블 설명")).toBeInTheDocument();
  });

  it("맡아 둔 행은 '맡아 둠'과 돌아올 항목을 보이고, 넣기 버튼은 그 항목 id 를 넘긴다", () => {
    const onPlaceLeaf = vi.fn();
    const held: MappingRow = {
      ...row("latency_ms", "ignore"),
      inferredRole: "latency",
      heldRole: "latency",
    };
    render(<ColumnMapping {...base} rows={[...base.rows, held]} evalDataPicks={[]} onPlaceLeaf={onPlaceLeaf} />);
    expect(screen.getByText("맡아 둠")).toBeInTheDocument();
    expect(screen.getByText(/평가 흐름에 '지연시간 컬럼'을 넣으면 이 역할로 돌아옵니다/)).toBeInTheDocument();
    // 맡아 둔 행은 "자동 매핑:" 줄 대신 맡아 둔 안내를 보인다.
    expect(screen.queryByText(/자동 매핑:/)).not.toBeInTheDocument();
    screen.getByRole("button", { name: "평가 흐름 만들기에서 넣기" }).click();
    expect(onPlaceLeaf).toHaveBeenCalledWith("latencyColumn");
  });

  it("맡아 둔 행은 진행 판정에 영향이 없다 — 숨길 수 있는 역할은 매핑 필수가 아니다", () => {
    const held: MappingRow = { ...row("sid", "ignore"), inferredRole: "id", heldRole: "id" };
    expect(validityOf({ ...base, rows: [...base.rows, held], evalDataPicks: [] })).toBe(true);
  });
});

describe("확률 역할 (B12·B13)", () => {
  it("이진 score 두 컬럼은 화면도 막는다 — 백엔드가 거절하는 매핑을 통과시키지 않는다", () => {
    const base = { taskType: "binary" as const, detectedClasses: ["0", "1"], positiveClass: "1" };
    expect(validityOf({ ...base, rows: [row("t", "y_true"), row("s1", "score"), row("s2", "score")] })).toBe(false);
  });

  it("확률만 매핑해도 유효하고 y_pred 배지는 '확률로 대신'", () => {
    const valid = validityOf({
      taskType: "binary",
      detectedClasses: ["0", "1"],
      positiveClass: "1",
      rows: [row("t", "y_true"), row("s", "score")],
    });
    expect(valid).toBe(true);
    expect(screen.getByText("확률로 대신")).toBeInTheDocument();
    expect(screen.queryByText("없음")).not.toBeInTheDocument();
  });

  it("다중 클래스 확률 세 컬럼은 겹침이 아니다", () => {
    expect(
      validityOf({ taskType: "multiclass", rows: [row("t", "y_true"), row("a", "prob_class_*"), row("b", "prob_class_*"), row("c", "prob_class_*")] }),
    ).toBe(true);
  });
});

describe("결정 임계값 범위 (B4)", () => {
  const scoreOnly = {
    taskType: "binary" as const,
    detectedClasses: ["0", "1"],
    positiveClass: "1",
    rows: [row("t", "y_true"), row("s", "score")],
  };

  it("확률만 매핑했고 임계값이 1.5 면 매핑 확정이 막히고 이유가 보인다", () => {
    expect(validityOf({ ...scoreOnly, decisionThreshold: 1.5 })).toBe(false);
    expect(screen.getAllByText("결정 임계값은 0과 1 사이여야 합니다.").length).toBeGreaterThan(0);
  });

  it("0.7 이면 통과", () => {
    expect(validityOf({ ...scoreOnly, decisionThreshold: 0.7 })).toBe(true);
  });

  it("예측 레이블이 있어 임계값이 쓰이지 않으면 남은 값으로 막지 않는다", () => {
    expect(
      validityOf({ ...scoreOnly, rows: [...scoreOnly.rows, row("p", "y_pred")], decisionThreshold: 1.5 }),
    ).toBe(true);
  });
});
