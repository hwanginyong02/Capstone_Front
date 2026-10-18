/** 설명 팝업 내용(docs/MATERIAL_PICKER.md §12.3) — 레지스트리에서 읽은 의미·형식·예시·표준 근거. */
import { describe, expect, it } from "vitest";

import { catalogCards } from "../../data/reportComposer";
import type { FlowLeaf } from "../../types/reportComposer.types";
import { leafDetail, splitExample, splitFormat, standardBasisText } from "./leafDetail";
import { flowLeaves } from "./materialPicks";

function leaf(cardId: FlowLeaf["cardId"], leafId: string): FlowLeaf {
  const found = flowLeaves(cardId, "binary").find((item) => item.leafId === leafId);
  if (!found) throw new Error(`없는 항목 ${cardId}/${leafId}`);
  return found;
}

describe("splitFormat · splitExample", () => {
  it("선택지가 붙은 형식을 형식 이름과 선택지로 나눈다", () => {
    expect(splitFormat("하나 선택: A / B")).toEqual({ kind: "하나 선택", choices: "A / B" });
    expect(splitFormat("텍스트")).toEqual({ kind: "텍스트" });
  });

  it("설명 끝의 '예: …'를 떼어 낸다", () => {
    expect(splitExample("모은 기간입니다. 예: 2025-01 ~ 2025-03")).toEqual({
      text: "모은 기간입니다.",
      example: "2025-01 ~ 2025-03",
    });
    expect(splitExample("예시 없음")).toEqual({ text: "예시 없음" });
  });
});

describe("standardBasisText", () => {
  it("조항 번호와 2층 항목 이름을 잇는다. 항목 번호가 없으면 조항만", () => {
    expect(standardBasisText({ standard: "ISO/IEC TS 4213", clause: "8절", reportingItem: 2 })).toBe(
      "ISO/IEC TS 4213 8절 — 평가 데이터 출처",
    );
    expect(standardBasisText({ standard: "ISO/IEC 17025", clause: "7.8.2.1 e)" })).toBe("ISO/IEC 17025 7.8.2.1 e)");
  });

  it("원문과 대조한 요구 문장이 있으면 그것을 쓴다", () => {
    expect(
      standardBasisText({ standard: "ISO/IEC TS 4213", clause: "6.2.6", requirement: "오류 방향을 밝혀요" }),
    ).toBe("ISO/IEC TS 4213 6.2.6 — 오류 방향을 밝혀요");
  });
});

describe("leafDetail", () => {
  it("테스트 데이터 › 수집 기간: 의미·형식·예시가 있고, 표준 근거가 없어 그 줄이 없다", () => {
    const detail = leafDetail(leaf("testData", "testPeriod"));
    expect(detail).toMatchObject({
      label: "수집 기간",
      blockName: "테스트 데이터",
      meaning: "테스트 데이터를 모은 기간입니다.",
      format: { kind: "시작 월과 끝 월" },
      example: "2025-01 ~ 2025-03",
      file: false,
    });
    expect(detail.basis).toBeUndefined();
  });

  it("테스트 데이터 › 데이터 출처: TS 4213 8절 근거와 '모름'을 고를 수 있다는 안내", () => {
    const detail = leafDetail(leaf("testData", "testDataSource"));
    expect(detail.basis).toBe("ISO/IEC TS 4213 8절 — 평가 데이터 출처");
    expect(detail.allowsUnknown).toBe(true);
  });

  it("회사 정보: 17025 근거와 다섯 칸 목록", () => {
    const detail = leafDetail(leaf("clientInfo", "companyInfo"));
    expect(detail.basis).toBe("ISO/IEC 17025 7.8.2.1 e)");
    expect(detail.parts?.map((part) => part.label)).toEqual(["회사명", "대표자", "사업자등록번호", "전화번호", "주소"]);
  });

  it("칸 항목(홈페이지)은 묶음 필드의 이름과 설명, 칸의 예시를 보인다", () => {
    const detail = leafDetail(leaf("clientInfo", "contactExtra:website"));
    expect(detail.group).toEqual({ label: "홈페이지·팩스", description: "회사 홈페이지와 팩스 번호입니다." });
    expect(detail.meaning).toBe("회사 웹사이트 주소입니다.");
    expect(detail.example).toBe("https://example.com");
    expect(detail.parts).toBeUndefined();
  });

  it("결과 파일은 파일 표시가 붙는다", () => {
    expect(leafDetail(leaf("evalData", "resultFile")).file).toBe(true);
  });

  it("함께 들어감(과제 정보): 조건을 정하는 항목 이름과 조건 문구", () => {
    const detail = leafDetail(leaf("clientInfo", "projectInfo"));
    expect(detail.companion).toEqual({
      triggerLabels: ["성적서 용도"],
      condition: "성적서 용도에서 과제 산출물 선택 시",
    });
    expect(leafDetail(leaf("clientInfo", "companyInfo")).companion).toBeUndefined();
  });

  it("모든 유형의 모든 항목에 대해 팝업 내용을 만들 수 있다", () => {
    const all = (["binary", "multiclass", "multilabel"] as const).flatMap((taskType) =>
      catalogCards(taskType).flatMap((card) => flowLeaves(card.id, taskType)),
    );
    expect(all.length).toBeGreaterThan(0);
    for (const item of all) {
      const detail = leafDetail(item);
      expect(detail.label).toBe(item.label);
      // 근거 줄은 레지스트리에 근거가 있을 때만 생긴다.
      expect(detail.basis === undefined).toBe(
        (catalogCards("").find((card) => card.id === item.cardId)?.fields.find((f) => f.id === item.fieldId)
          ?.standardBasis ?? undefined) === undefined,
      );
    }
  });
});
