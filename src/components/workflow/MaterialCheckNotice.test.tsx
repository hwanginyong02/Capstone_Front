/** 생성 전 안내 — 점검 결과를 읽기만 하고, 빠진 재료마다 고칠 곳으로 보낸다(재료 선택 점검 6절). */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  MaterialCheckNotice,
  MaterialCheckOutdatedNotice,
  materialCheckOutdatedMessage,
  canFixInInputOf,
  groupByTarget,
  leavesOfReportingItem,
  inputTargetOf,
  targetName,
  targetOfItem,
  targetOfLine,
} from "./MaterialCheckNotice";
import { materialCheckFixture } from "../../test/materialCheckFixture";
import { COMPOSER_CARDS, getCard } from "../../data/reportComposer";
import { REPORTING_ITEMS } from "../../lib/report/materialCheck";

describe("고칠 곳", () => {
  it("2층 항목은 그 값을 받는 카드·단계로 — 그 항목을 받는 항목 id(leafIds)와 함께 (S10 마무리)", () => {
    const card = (cardId: string, leafIds: string[]) => ({ kind: "card", cardId, leafIds });
    expect(targetOfItem(1)).toEqual(
      card("trainingData", ["trainingDatasetName", "trainingDataSource", "trainingVolume", "trainingClassVolume"]),
    );
    expect(targetOfItem(3)).toEqual(card("trainingData", ["imbalanceHandling"]));
    expect(targetOfItem(9)).toEqual(card("trainingData", ["channelEffects"]));
    expect(targetOfItem(2)).toEqual(card("testData", ["testDataSource", "testSourceRelation"]));
    expect(targetOfItem(4)).toEqual(card("groundTruth", ["labelAuthor"]));
    expect(targetOfItem(5)).toEqual(card("groundTruth", ["labelReview"]));
    expect(targetOfItem(7)).toEqual(card("modelEnv", ["runtimeEnv"]));
    expect(targetOfItem(10)).toEqual(card("modelEnv", ["algorithm", "hyperparameters"]));
    expect(targetOfItem(11)).toEqual(card("modelEnv", ["gpuUsage"]));
    // 8번(지연시간)은 컬럼 매핑이 아니라 평가 데이터 › 지연시간 컬럼 — 놓지 않았으면 매핑에 역할이 없다.
    expect(targetOfItem(8)).toEqual({ kind: "card", cardId: "evalData", leafIds: ["latencyColumn"] });
    expect(targetOfItem(12)).toEqual({ kind: "step", stepId: "metrics" });
  });

  it("고칠 곳이 같은 항목은 한 묶음이다 — 묶음 순서는 첫 항목 순서", () => {
    const item = (n: number) => ({ item: n, name: "항목 " + n, provided: false, missing: [], impact: "" });
    const groups = groupByTarget([1, 7, 3, 8, 10, 9].map(item));
    expect(groups.map((group) => group.key)).toEqual(["card:trainingData", "card:modelEnv", "card:evalData"]);
    expect(groups[0].items.map((entry) => entry.item)).toEqual([1, 3, 9]);
    expect(groups[1].items.map((entry) => entry.item)).toEqual([7, 10]);
    // 묶음의 항목 id 는 묶인 항목들의 것을 모은다(첫 항목 순서).
    expect(groups[0].target).toEqual({
      kind: "card",
      cardId: "trainingData",
      leafIds: [
        "trainingDatasetName",
        "trainingDataSource",
        "trainingVolume",
        "trainingClassVolume",
        "imbalanceHandling",
        "channelEffects",
      ],
    });
    expect(groups[1].target).toEqual({
      kind: "card",
      cardId: "modelEnv",
      leafIds: ["runtimeEnv", "algorithm", "hyperparameters"],
    });
    expect(groups[2].target).toEqual({ kind: "card", cardId: "evalData", leafIds: ["latencyColumn"] });
  });

  it("3층 줄은 지연시간만 2층 8번과 같은 곳, 나머지는 지표 화면", () => {
    expect(targetOfLine("latency")).toEqual({ kind: "card", cardId: "evalData", leafIds: ["latencyColumn"] });
    for (const id of ["riskDirection", "averaging", "curveImbalance"] as const) {
      expect(targetOfLine(id)).toEqual({ kind: "step", stepId: "metrics" });
    }
  });
});

describe("목적지 이름과 입력 화면 갈래", () => {
  it("지연시간은 '평가 데이터 › 지연시간 컬럼', 선택 블록은 블록 이름", () => {
    expect(targetName(targetOfItem(8))).toBe("평가 데이터 › 지연시간 컬럼");
    expect(targetName(targetOfItem(4))).toBe("정답 라벨");
    expect(targetName(targetOfItem(11))).toBe(getCard("modelEnv").name);
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
    expect(onFix).toHaveBeenLastCalledWith({ kind: "card", cardId: "groundTruth", leafIds: ["labelAuthor"] });
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
    expect(onFix).toHaveBeenCalledWith({ kind: "cardInput", cardId: "groundTruth", stepId: "groundTruth" });
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

describe("2층 항목 → 항목 id (leavesOfReportingItem, S10 마무리)", () => {
  it("레지스트리의 reportingItem 이 있는 필드는 모두 한 블록에서 찾힌다", () => {
    const tagged = COMPOSER_CARDS.flatMap((card) =>
      card.fields.flatMap((field) =>
        field.standardBasis?.reportingItem !== undefined ? [{ cardId: card.id, item: field.standardBasis.reportingItem, id: field.id }] : [],
      ),
    );
    expect(tagged.length).toBeGreaterThan(10);
    for (const entry of tagged) {
      const leaves = leavesOfReportingItem(entry.item);
      expect(leaves?.cardId).toBe(entry.cardId); // 한 항목의 필드가 두 블록에 갈리지 않는다
      expect(leaves?.leafIds).toContain(entry.id);
    }
  });

  it("받는 항목이 없는 보고 항목(6번 — 시스템이 계산)은 null, 그때 targetOfItem 은 블록만", () => {
    expect(REPORTING_ITEMS.some((def) => def.item === 6)).toBe(true);
    expect(leavesOfReportingItem(6)).toBeNull();
    expect(targetOfItem(6)).toEqual({ kind: "card", cardId: "trainingData" });
  });
});

describe("입력 화면에서 고칠 수 있는가 (canFixInInputOf, S10 마무리)", () => {
  const off = { trainingData: false, testData: false, groundTruth: false, modelEnv: false };

  it("블록을 넣지 않았으면 못 고친다", () => {
    expect(canFixInInputOf({ kind: "card", cardId: "groundTruth", leafIds: ["labelReview"] }, off, {})).toBe(false);
    expect(canFixInInputOf({ kind: "card", cardId: "groundTruth" }, off, {})).toBe(false);
  });

  it("블록은 넣었어도 그 항목을 넣지 않았으면 못 고친다 — 정답 라벨 신뢰성을 뺀 경우(브라우저 확인)", () => {
    const cards = { ...off, groundTruth: true };
    const picks = { groundTruth: ["labelAuthor"] };
    expect(canFixInInputOf(targetOfItem(5) as never, cards, picks)).toBe(false);
    expect(canFixInInputOf(targetOfItem(4) as never, cards, picks)).toBe(true);
    // 항목을 넣었으면 고칠 수 있다.
    expect(canFixInInputOf(targetOfItem(5) as never, cards, { groundTruth: ["labelAuthor", "labelReview"] })).toBe(true);
  });

  it("묶음이 항목 여럿이면 받는 항목이 하나라도 있으면 고칠 수 있다", () => {
    const cards = { ...off, modelEnv: true };
    const target = { kind: "card" as const, cardId: "modelEnv" as const, leafIds: ["runtimeEnv", "gpuUsage"] };
    expect(canFixInInputOf(target, cards, { modelEnv: ["gpuUsage"] })).toBe(true);
    expect(canFixInInputOf(target, cards, { modelEnv: ["algorithm"] })).toBe(false);
  });

  it("항목을 정할 수 없으면 종전처럼 블록 기준", () => {
    expect(canFixInInputOf({ kind: "card", cardId: "trainingData" }, { ...off, trainingData: true }, { trainingData: [] })).toBe(true);
  });

  it("잠긴 블록(평가 데이터)은 늘 들어 있다 — 지연시간을 놓았는지만 본다", () => {
    const target = targetOfItem(8) as Extract<ReturnType<typeof targetOfItem>, { kind: "card" }>;
    expect(canFixInInputOf(target, off, { evalData: ["latencyColumn"] })).toBe(true);
    expect(canFixInInputOf(target, off, { evalData: ["yTrueColumn"] })).toBe(false);
  });
});

describe("놓지 않은 항목만 빠졌으면 '평가 흐름 만들기에서 넣기'만 (S10 브라우저 확인)", () => {
  it("정답 라벨 블록은 넣고 신뢰성은 뺐다 — 입력 화면 갈래가 없다", () => {
    // 신뢰성(5번)만 빠졌다 — 넣지 않아 성적서 값이 비었다.
    const base = materialCheckFixture();
    const check = {
      ...base,
      warningIds: ["reporting:5"],
      reporting: {
        ...base.reporting,
        items: base.reporting.items.map((item) =>
          item.item === 5 ? { ...item, provided: false, missing: ["정답 라벨 신뢰성"] } : item,
        ),
      },
    };
    const cards = { trainingData: true, testData: true, groundTruth: true, modelEnv: true };
    const picks = { groundTruth: ["labelAuthor"] };
    render(
      <MaterialCheckNotice
        check={check}
        onFix={vi.fn()}
        canFixInInput={(target) => canFixInInputOf(target, cards, picks)}
      />,
    );
    const missing = screen.getByRole("list", { name: "빠진 보고 항목" });
    const groups = within(missing).getAllByRole("listitem").filter((item) => item.parentElement === missing);
    const label = groups.find((group) => group.textContent?.includes("정답 라벨 신뢰성"));
    expect(label).toBeDefined();
    expect(within(label!).getByRole("button", { name: "평가 흐름 만들기에서 넣기" })).toBeInTheDocument();
    expect(within(label!).queryByRole("button", { name: "입력 화면에서 고치기" })).not.toBeInTheDocument();
  });
});

describe("점검 표 변경 안내 — 진행 중 run 의 다시 확인(점검 표 2.0)", () => {
  it("저장된 결과의 버전이 지금과 다르고 진행 중이면 안내한다", () => {
    render(<MaterialCheckOutdatedNotice check={{ version: "1.0" }} active />);
    const region = screen.getByRole("region", { name: "점검 표 변경 안내" });
    expect(region).toHaveTextContent(materialCheckOutdatedMessage("1.0"));
    expect(materialCheckOutdatedMessage("1.0")).toBe(
      "점검 표가 바뀌어(1.0 → 2.0) 다시 확인이 필요합니다. 이 평가의 재료 선택 점검(표지·1.4·6.0)은 옛 점검 표로 " +
        '만든 것입니다. 데이터 검증 화면에서 생성 전 안내를 다시 보고 "다음"을 누르면 새 점검 표로 성적서를 다시 만듭니다.',
    );
  });

  it("같은 버전이거나, 결과가 없거나, 발급된 성적서(active 거짓)면 그리지 않는다", () => {
    const { rerender } = render(<MaterialCheckOutdatedNotice check={materialCheckFixture()} active />);
    expect(screen.queryByRole("region", { name: "점검 표 변경 안내" })).toBeNull();
    rerender(<MaterialCheckOutdatedNotice check={undefined} active />);
    expect(screen.queryByRole("region", { name: "점검 표 변경 안내" })).toBeNull();
    rerender(<MaterialCheckOutdatedNotice check={{ version: "1.0" }} active={false} />);
    expect(screen.queryByRole("region", { name: "점검 표 변경 안내" })).toBeNull();
  });
});
