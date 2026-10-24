/**
 * 렌더 시험 도구 자체 시험 — 예시본 블록 뽑기와 "순서대로 있다" 단정이 이빨이 있는가(한 글자 바뀜·칸 하나 빠짐·순서 바뀜을 잡는다).
 * 그린 글은 판 4 공용 부품으로 예시본 4.2 블록을 실제로 그려 만든다(blockText 규칙이 표 칸을 " | " 로 잇는 것까지 같이 본다).
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Ed4SubsectionTitle } from "../../../components/report/edition4/shared/Ed4Headings";
import { Ed4Paragraph } from "../../../components/report/edition4/shared/Ed4Paragraph";
import { Ed4Table } from "../../../components/report/edition4/shared/Ed4Table";
import { blockText, exampleBlock, exampleLines, expectExampleBlock } from "./renderEd4";

const BASIS = "핵심 지표 Recall(M3)과 그 밖의 판정 대상 지표가 모두 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.";

function drawn42(rows: string[][] = [["최종 합격", "5개 중 5개"]], basis = BASIS): string {
  const view = render(
    <div>
      <Ed4SubsectionTitle number="4.2" />
      <Ed4Table columns={["종합 판정", "판정 대상 지표 중 충족"]} rows={rows} />
      <Ed4Paragraph>{basis}</Ed4Paragraph>
    </div>,
  );
  const text = blockText([view.container]);
  view.unmount();
  return text;
}

describe("exampleBlock·exampleLines", () => {
  it("### 4.2 블록 = 제목부터 다음 ### 앞까지, 줄 단위(표 구분 줄 뺌)", () => {
    const block = exampleBlock("### 4.2 종합 판정");
    expect(block.split("\n")[0]).toBe("### 4.2 종합 판정");
    expect(block).not.toContain("4.3");
    expect(exampleLines(block)).toEqual([
      { kind: "text", text: "4.2 종합 판정" },
      { kind: "row", cells: ["종합 판정", "판정 대상 지표 중 충족"] },
      { kind: "row", cells: ["최종 합격", "5개 중 5개"] },
      { kind: "text", text: BASIS },
    ]);
  });

  it("## 절 블록은 그 아래 ### 소절을 포함하고 다음 ## 앞에서 끝난다", () => {
    const block = exampleBlock("## 6. 개선 권고");
    expect(block).toContain("### 6.1 데이터");
    expect(block).toContain("### 6.2 모델과 운영");
    expect(block).not.toContain("부록 1");
  });

  it("글머리 '- '·앞 빈칸은 떼고 번호 목록 번호는 그대로", () => {
    const lines = exampleLines(exampleBlock("### 1.3 제약사항"));
    expect(lines.some((l) => l.kind === "text" && l.text.startsWith("5. 통계적 유의성 검정: "))).toBe(true);
    expect(lines.some((l) => l.kind === "text" && l.text === "추론 효율성(지연시간): 응답 속도가 용도에 맞는지 판단할 수 없다.")).toBe(true);
    const curves = exampleLines(exampleBlock("### 4.7 곡선"));
    expect(curves[1]).toEqual({ kind: "text", text: "ROC Curve (Y: true positive rate / X: false positive rate) — AUROC: 0.999 (그림)" });
  });

  it("없는 제목·두 번 나오는 제목은 던진다", () => {
    expect(() => exampleBlock("### 9.9 없음")).toThrow();
    expect(() => exampleBlock("의뢰자")).toThrow();
  });
});

describe("expectExampleBlock", () => {
  const block = exampleBlock("### 4.2 종합 판정");

  it("같은 모양으로 그린 글은 통과(사이에 다른 줄이 있어도)", () => {
    expect(() => expectExampleBlock(drawn42(), block)).not.toThrow();
    expect(() => expectExampleBlock(`머리 줄\n${drawn42()}꼬리 줄\n`, block)).not.toThrow();
  });

  it("문단 한 글자 바뀜 → 실패", () => {
    expect(() => expectExampleBlock(drawn42(undefined, BASIS.replace("합격으로", "합격으루")), block)).toThrow(/예시본 줄/);
  });

  it("예시본 블록 쪽 한 글자 바뀜 → 실패", () => {
    expect(() => expectExampleBlock(drawn42(), block.replace("5개 중 5개", "5개 중 4개"))).toThrow(/5개 중 4개/);
  });

  it("표 칸 하나 빠짐·하나 더함 → 실패(칸 수까지 본다)", () => {
    expect(() => expectExampleBlock(drawn42([["최종 합격"]] as string[][]), block)).toThrow();
    expect(() => expectExampleBlock(drawn42([["최종 합격", "5개 중 5개", "x"]]), block)).toThrow();
  });

  it("순서 바뀜 → 실패", () => {
    const lines = drawn42().trim().split("\n");
    const swapped = [lines[0], lines[3], lines[1], lines[2]].join("\n");
    expect(() => expectExampleBlock(swapped, block)).toThrow();
  });
});
