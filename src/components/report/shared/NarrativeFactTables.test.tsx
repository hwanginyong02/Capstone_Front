/**
 * D6 표(서술 설계 D6) — 사실 시트에 보낸 값을 같은 표기로 찍는다(표시 문자열 `*_text` 가 있으면 그것, 없으면
 * `factText` 넷째 자리). 같은 숫자가 사실 시트와 다르게 보이면 표가 서술의 검산 근거가 되지 못한다.
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import type { NarrativeFacts } from "../../../lib/report/narrativeFacts";
import { factText } from "../../../lib/report/judgedNumber";
import { classDisplayName, NarrativeFactTables } from "./NarrativeFactTables";

const base = {
  weakest_class: {
    label: "cat",
    f1: 0.41234567,
    support: 12,
    share: 0.0499,
    share_text: "0.0499",
    macro_f1: 0.7,
    gap_from_macro: 0.28765433,
    gap_text: "0.2877",
    low_support: true,
    far_below_macro: true,
  },
  class_share_basis: "samples",
  top_confusion_pairs: [
    { actual: "cat", predicted: "dog", count: 7, share_of_errors: 0.35 },
    { actual: "dog", predicted: "bird", count: 3, share_of_errors: 0.15 },
  ],
  prediction_bias: {
    unit: "per_class",
    rows: [
      { label: "cat", predicted: 9, actual: 12, difference: -3 },
      { label: "dog", predicted: 15, actual: 12, difference: 3 },
      { label: "bird", predicted: 6, actual: 6, difference: 0 },
    ],
  },
} as unknown as NarrativeFacts;

const DESCRIPTIONS = [{ label: "cat", description: "고양이" }];

const rows = (name: string) =>
  within(screen.getByRole("table", { name }))
    .getAllByRole("row")
    .map((tr) => within(tr).getAllByRole(tr.querySelector("th") ? "columnheader" : "cell").map((c) => c.textContent));

describe("최약 클래스 표", () => {
  it("열·값 — 이름(설명), F1 은 넷째 자리, 비율·차이는 사실 시트의 표시 문자열, 작은 표본 표시", () => {
    render(<NarrativeFactTables facts={base} multiclass descriptions={DESCRIPTIONS} />);
    expect(rows("최약 클래스")).toEqual([
      ["클래스", "F1", "표본 수", "비율", "매크로 F1과의 차이", "작은 표본"],
      ["cat(고양이)", "0.4123", "12", "0.0499", "0.2877", "예"],
    ]);
    expect(factText(0.41234567)).toBe("0.4123");
  });

  it("매크로 F1 이 없으면 차이는 —, 작은 표본이 아니면 아니오, 멀티레이블은 '레이블'", () => {
    const facts = {
      ...base,
      class_share_basis: "label_occurrences",
      weakest_class: { ...base.weakest_class!, gap_text: null, gap_from_macro: null, macro_f1: null, low_support: false },
    } as NarrativeFacts;
    render(<NarrativeFactTables facts={facts} multiclass={false} />);
    expect(rows("최약 레이블")).toEqual([
      ["레이블", "F1", "표본 수", "비율", "매크로 F1과의 차이", "작은 표본"],
      ["cat", "0.4123", "12", "0.0499", "—", "아니오"],
    ]);
  });

  it("최약 클래스가 없으면(클래스 1종) 그 표는 없다", () => {
    render(<NarrativeFactTables facts={{ ...base, weakest_class: null }} multiclass />);
    expect(screen.queryByRole("table", { name: "최약 클래스" })).toBeNull();
  });
});

describe("최다 오분류 쌍 표(다중 클래스)", () => {
  it("실제 → 예측 · 건수 · 오분류 중 비율", () => {
    render(<NarrativeFactTables facts={base} multiclass descriptions={DESCRIPTIONS} />);
    expect(screen.getByText("최다 오분류 쌍(상위 2)")).toBeInTheDocument();
    expect(rows("최다 오분류 쌍")).toEqual([
      ["실제 → 예측", "건수", "오분류 중 비율"],
      ["cat(고양이) → dog", "7", "0.35"],
      ["dog → bird", "3", "0.15"],
    ]);
  });

  it("다중 클래스가 아니면 없다", () => {
    render(<NarrativeFactTables facts={base} multiclass={false} />);
    expect(screen.queryByRole("table", { name: "최다 오분류 쌍" })).toBeNull();
  });

  it("쌍이 없으면(오분류 0) 없다", () => {
    render(<NarrativeFactTables facts={{ ...base, top_confusion_pairs: [] }} multiclass />);
    expect(screen.queryByRole("table", { name: "최다 오분류 쌍" })).toBeNull();
  });
});

describe("예측 편향 표", () => {
  it("다중: 클래스별 예측·실제·부호 붙은 차이", () => {
    render(<NarrativeFactTables facts={base} multiclass />);
    expect(rows("예측 편향")).toEqual([
      ["클래스", "예측 수", "실제 수", "차이(예측 − 실제)"],
      ["cat", "9", "12", "−3"],
      ["dog", "15", "12", "+3"],
      ["bird", "6", "6", "0"],
    ]);
  });

  it("이진: 양성 클래스 한 줄, 멀티: 전체 레이블 한 줄", () => {
    const binary = { ...base, prediction_bias: { unit: "positive_class", rows: [{ label: "1", predicted: 108, actual: 95, difference: 13 }] } } as NarrativeFacts;
    const { unmount } = render(<NarrativeFactTables facts={binary} multiclass={false} />);
    expect(rows("예측 편향")[1]).toEqual(["1", "108", "95", "+13"]);
    expect(rows("예측 편향")[0][0]).toBe("양성 클래스");
    unmount();
    const multi = { ...base, prediction_bias: { unit: "label_total", rows: [{ label: null, predicted: 40, actual: 44, difference: -4 }] } } as NarrativeFacts;
    render(<NarrativeFactTables facts={multi} multiclass={false} />);
    expect(rows("예측 편향")[1]).toEqual(["전체 레이블", "40", "44", "−4"]);
  });

  it("편향 값이 없으면 없다", () => {
    render(<NarrativeFactTables facts={{ ...base, prediction_bias: null }} multiclass />);
    expect(screen.queryByRole("table", { name: "예측 편향" })).toBeNull();
  });
});

it("사실 값이 없으면 아무것도 그리지 않는다", () => {
  const { container } = render(<NarrativeFactTables facts={undefined} multiclass />);
  expect(container).toBeEmptyDOMElement();
});

it("클래스 이름 — 설명이 있으면 괄호, 빈 설명은 이름만", () => {
  expect(classDisplayName("cat", DESCRIPTIONS)).toBe("cat(고양이)");
  expect(classDisplayName("dog", DESCRIPTIONS)).toBe("dog");
  expect(classDisplayName("cat", [{ label: "cat", description: "  " }])).toBe("cat");
  expect(classDisplayName("cat", undefined)).toBe("cat");
});
