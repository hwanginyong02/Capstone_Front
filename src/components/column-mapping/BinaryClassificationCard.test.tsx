/**
 * 양성 클래스 자동 판단 경고(M5).
 *
 * 백엔드는 양성 클래스 기본값을 한 함수(`default_positive_class`)로 정한다 — 숫자는 큰 값, 알려진 쌍은
 * 정해진 값, 그 밖의 두 문자열은 정렬에서 뒤쪽이고 `positive_class_ambiguous` 를 켠다. 화면은 그 값을
 * 그대로 보이고, 애매하면 "정렬 순서상 뒤 값을 임시로 골랐다"고 알린다. 프론트에 양성을 고르는 정렬은 없다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BinaryClassificationCard, POSITIVE_CLASS_AMBIGUOUS_MESSAGE, POSITIVE_CLASS_GUIDE } from "./BinaryClassificationCard";
import type { MappingRow } from "../../types/mapping.types";

const yTrue = {
  originalName: "label",
  confirmedRole: "y_true",
  suggestedRole: "y_true",
  sampleValues: [],
  confidence: 1,
  modified: false,
  warnings: [],
} as unknown as MappingRow;

const card = (ambiguous: boolean) =>
  render(
    <BinaryClassificationCard
      resolvedTaskType="binary"
      positiveClass="dog"
      setPositiveClass={() => {}}
      yTrueRow={yTrue}
      yTrueValues={["cat", "dog"]}
      positiveClassAmbiguous={ambiguous}
    />,
  );

describe("양성 클래스 자동 판단 경고(M5)", () => {
  it("애매하면 정렬 순서상 뒤 값을 임시로 골랐다고 알린다", () => {
    card(true);
    expect(screen.getByText(POSITIVE_CLASS_AMBIGUOUS_MESSAGE)).toBeInTheDocument();
    expect(POSITIVE_CLASS_AMBIGUOUS_MESSAGE).toContain("정렬 순서상 뒤 값을 임시로 골랐습니다");
  });

  it("자동으로 정했으면 경고하지 않는다", () => {
    card(false);
    expect(screen.queryByText(/임시로 골랐습니다/)).toBeNull();
  });
});

/** 점검 나-15 — 양성 클래스 칸 옆에 "찾아내야 하는 쪽" 안내(서술 라운드 B, 꼭 남길 줄). */
describe("양성 클래스 안내 — 모델이 찾아내야 하는 쪽", () => {
  it("양성 클래스 질문 문단에 안내 문장이 붙는다(애매하든 아니든)", () => {
    expect(POSITIVE_CLASS_GUIDE).toBe("모델이 찾아내야 하는 쪽(예: 불량, 이탈)을 고르세요.");
    for (const ambiguous of [false, true]) {
      const { unmount } = card(ambiguous);
      expect(screen.getByText(/어느 값이 양성 클래스인가요\?/).textContent).toContain(POSITIVE_CLASS_GUIDE);
      unmount();
    }
  });
});
