/** 생성 전 안내 — 점검 결과를 읽기만 하고, 빠진 재료마다 고칠 곳으로 보낸다(재료 선택 점검 6절). */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MaterialCheckNotice, targetOfItem, targetOfLine } from "./MaterialCheckNotice";
import { materialCheckFixture } from "../../test/materialCheckFixture";

describe("고칠 곳", () => {
  it("2층 항목은 그 값을 받는 카드·단계로", () => {
    expect([1, 3, 9].map(targetOfItem)).toEqual(Array(3).fill({ kind: "card", cardId: "trainingData" }));
    expect(targetOfItem(2)).toEqual({ kind: "card", cardId: "testData" });
    expect([4, 5].map(targetOfItem)).toEqual(Array(2).fill({ kind: "card", cardId: "groundTruth" }));
    expect([7, 10, 11].map(targetOfItem)).toEqual(Array(3).fill({ kind: "card", cardId: "modelEnv" }));
    expect(targetOfItem(8)).toEqual({ kind: "step", stepId: "mapping" });
    expect(targetOfItem(12)).toEqual({ kind: "step", stepId: "metrics" });
  });

  it("3층 줄은 지연시간만 컬럼 매핑, 나머지는 지표 화면", () => {
    expect(targetOfLine("latency")).toEqual({ kind: "step", stepId: "mapping" });
    for (const id of ["riskDirection", "averaging", "curveImbalance"] as const) {
      expect(targetOfLine(id)).toEqual({ kind: "step", stepId: "metrics" });
    }
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
    expect(screen.getByText(/보고 항목 11개 중 2개가/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "맞지 않는 목적별 점검" })).toHaveTextContent("사용 방식 → 지연시간");
    // 넣지 않은 카드: 재료 고르기만(입력 화면에는 칸이 없다).
    expect(screen.queryByRole("button", { name: "입력 화면에서 고치기" })).not.toBeInTheDocument();
    screen.getByRole("button", { name: "재료 고르기에서 넣기" }).click();
    expect(onFix).toHaveBeenCalledWith({ kind: "card", cardId: "groundTruth" });
    // 지연시간(8번)은 컬럼 매핑 단계로.
    screen.getByRole("button", { name: "넣으러 가기" }).click();
    expect(onFix).toHaveBeenLastCalledWith({ kind: "step", stepId: "mapping" });
    screen.getByRole("button", { name: "컬럼 매핑으로" }).click();
    expect(onFix).toHaveBeenLastCalledWith({ kind: "step", stepId: "mapping" });
  });
});

describe("넣은 카드의 항목", () => {
  it("재료 고르기와 입력 화면 두 갈래를 모두 준다", () => {
    const onFix = vi.fn();
    render(
      <MaterialCheckNotice
        check={materialCheckFixture({ missingLatencyAndLabel: true })}
        onFix={onFix}
        includedCards={new Set(["groundTruth"])}
      />,
    );
    screen.getByRole("button", { name: "입력 화면에서 고치기" }).click();
    expect(onFix).toHaveBeenCalledWith({ kind: "cardInput", cardId: "groundTruth" });
  });
});
