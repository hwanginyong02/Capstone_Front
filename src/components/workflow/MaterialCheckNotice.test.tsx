/** 생성 전 안내 — 점검 결과를 읽기만 하고, 빠진 재료마다 고칠 곳으로 보낸다(재료 선택 점검 6절). */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  MaterialCheckNotice,
  groupByTarget,
  inputTargetOf,
  targetName,
  targetOfItem,
  targetOfLine,
} from "./MaterialCheckNotice";
import { materialCheckFixture } from "../../test/materialCheckFixture";

describe("고칠 곳", () => {
  it("2층 항목은 그 값을 받는 카드·단계로", () => {
    expect([1, 3, 9].map(targetOfItem)).toEqual(Array(3).fill({ kind: "card", cardId: "trainingData" }));
    expect(targetOfItem(2)).toEqual({ kind: "card", cardId: "testData" });
    expect([4, 5].map(targetOfItem)).toEqual(Array(2).fill({ kind: "card", cardId: "groundTruth" }));
    expect([7, 10, 11].map(targetOfItem)).toEqual(Array(3).fill({ kind: "card", cardId: "modelEnv" }));
    // 8번(지연시간)은 컬럼 매핑이 아니라 평가 데이터 › 지연시간 컬럼 — 놓지 않았으면 매핑에 역할이 없다.
    expect(targetOfItem(8)).toEqual({ kind: "card", cardId: "evalData", leafIds: ["latencyColumn"] });
    expect(targetOfItem(12)).toEqual({ kind: "step", stepId: "metrics" });
  });

  it("고칠 곳이 같은 항목은 한 묶음이다 — 묶음 순서는 첫 항목 순서", () => {
    const item = (n: number) => ({ item: n, name: "항목 " + n, provided: false, missing: [], impact: "" });
    const groups = groupByTarget([1, 7, 3, 8, 10, 9].map(item));
    expect(groups.map((group) => group.key)).toEqual([
      "card:trainingData",
      "card:modelEnv",
      "card:evalData:latencyColumn",
    ]);
    expect(groups[0].items.map((entry) => entry.item)).toEqual([1, 3, 9]);
    expect(groups[1].items.map((entry) => entry.item)).toEqual([7, 10]);
  });

  it("3층 줄은 지연시간만 2층 8번과 같은 곳, 나머지는 지표 화면", () => {
    expect(targetOfLine("latency")).toEqual({ kind: "card", cardId: "evalData", leafIds: ["latencyColumn"] });
    for (const id of ["riskDirection", "averaging", "curveImbalance"] as const) {
      expect(targetOfLine(id)).toEqual({ kind: "step", stepId: "metrics" });
    }
  });
});

describe("목적지 이름과 입력 화면 갈래", () => {
  it("지연시간은 '평가 데이터 › 지연시간 컬럼', 블록만 가리키면 블록 이름", () => {
    expect(targetName(targetOfItem(8))).toBe("평가 데이터 › 지연시간 컬럼");
    expect(targetName(targetOfItem(4))).toBe("정답 라벨");
  });

  it("입력 화면 갈래는 항목을 받는 화면 — 지연시간이면 컬럼 매핑", () => {
    expect(inputTargetOf({ kind: "card", cardId: "evalData", leafIds: ["latencyColumn"] })).toEqual({
      kind: "cardInput",
      cardId: "evalData",
      stepId: "mapping",
    });
    expect(inputTargetOf({ kind: "card", cardId: "groundTruth" })).toEqual({ kind: "cardInput", cardId: "groundTruth" });
  });
});

describe("MaterialCheckNotice", () => {
  it("경고가 없으면 그리지 않는다", () => {
    const { container } = render(<MaterialCheckNotice check={materialCheckFixture()} onFix={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("빠진 항목과 맞지 않는 줄을 보여 주고, 버튼은 고칠 곳을 넘긴다", () => {
    const onFix = vi.fn();
    render(
      <MaterialCheckNotice check={materialCheckFixture({ missingLatencyAndLabel: true, realTime: true })} onFix={onFix} />,
    );
    expect(screen.getByText("성적서에 부족하게 표시될 항목이 있습니다.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/재료/);
    expect(screen.getByText(/보고 항목 11개 중 2개가/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "맞지 않는 목적별 점검" })).toHaveTextContent("사용 방식 → 지연시간");
    // 넣지 않은 블록·항목: 평가 흐름 만들기만(입력 화면에는 칸이 없다).
    expect(screen.queryByRole("button", { name: "입력 화면에서 고치기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "컬럼 매핑에서 고치기" })).not.toBeInTheDocument();
    const missing = screen.getByRole("list", { name: "빠진 보고 항목" });
    const groups = within(missing).getAllByRole("listitem").filter((item) => item.parentElement === missing);
    expect(groups.length).toBe(2);
    within(groups[0]).getByRole("button", { name: "평가 흐름 만들기에서 넣기" }).click();
    expect(onFix).toHaveBeenLastCalledWith({ kind: "card", cardId: "groundTruth" });
    // 지연시간(8번)은 평가 데이터 › 지연시간 컬럼으로.
    expect(groups[1]).toHaveTextContent("평가 데이터 › 지연시간 컬럼");
    within(groups[1]).getByRole("button", { name: "평가 흐름 만들기에서 넣기" }).click();
    expect(onFix).toHaveBeenLastCalledWith({ kind: "card", cardId: "evalData", leafIds: ["latencyColumn"] });
    // 3층 지연시간 줄도 같은 곳으로.
    const unmet = screen.getByRole("list", { name: "맞지 않는 목적별 점검" });
    within(unmet).getByRole("button", { name: "평가 흐름 만들기에서 넣기" }).click();
    expect(onFix).toHaveBeenLastCalledWith({ kind: "card", cardId: "evalData", leafIds: ["latencyColumn"] });
    expect(screen.queryByRole("button", { name: "컬럼 매핑으로" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "넣으러 가기" })).not.toBeInTheDocument();
  });
});

describe("입력 화면에서 고치기", () => {
  it("넣은 블록은 평가 흐름 만들기와 입력 화면 두 갈래를 모두 준다", () => {
    const onFix = vi.fn();
    render(
      <MaterialCheckNotice
        check={materialCheckFixture({ missingLatencyAndLabel: true })}
        onFix={onFix}
        canFixInInput={(target) => target.cardId === "groundTruth"}
      />,
    );
    screen.getByRole("button", { name: "입력 화면에서 고치기" }).click();
    expect(onFix).toHaveBeenCalledWith({ kind: "cardInput", cardId: "groundTruth" });
    // 지연시간은 놓이지 않았다 — 컬럼 매핑으로 보내지 않는다.
    expect(screen.queryByRole("button", { name: "컬럼 매핑에서 고치기" })).not.toBeInTheDocument();
  });

  it("지연시간이 놓여 있으면 '컬럼 매핑에서 고치기'가 보이고 매핑 화면으로 간다 — 2층·3층 모두", () => {
    const onFix = vi.fn();
    const asked: unknown[] = [];
    render(
      <MaterialCheckNotice
        check={materialCheckFixture({ missingLatencyAndLabel: true, realTime: true })}
        onFix={onFix}
        canFixInInput={(target) => {
          asked.push(target);
          return target.cardId === "evalData";
        }}
      />,
    );
    expect(asked).toContainEqual({ kind: "card", cardId: "evalData", leafIds: ["latencyColumn"] });
    const buttons = screen.getAllByRole("button", { name: "컬럼 매핑에서 고치기" });
    expect(buttons.length).toBe(2);
    buttons[0].click();
    expect(onFix).toHaveBeenLastCalledWith({ kind: "cardInput", cardId: "evalData", stepId: "mapping" });
    expect(screen.queryByRole("button", { name: "입력 화면에서 고치기" })).not.toBeInTheDocument();
  });
});
