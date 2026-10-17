import { describe, expect, it } from "vitest";

import {
  DIFFERENT_SOURCE_SENTENCE,
  SAME_SOURCE_SENTENCE,
  labelCautionSentence,
  sourceRelationSentence,
} from "./dataCautionPhrases";
import { buildProblemList } from "./problemList";
import type { ReportComposerInput } from "./reportMaterials";
import type { ComposerValueMap } from "../../types/reportComposer.types";

/**
 * 7.2 고정 문구 12(정답 라벨 주의)와 8.2 고정 문구 11a·11b(일반화) — 의뢰자 답으로 고르는 문장.
 *
 * 고정 문구 12 는 9절 문제 "정답 라벨 주의"와 같은 판정이어야 한다. 판정 함수를 일부러 틀리게 바꾸면
 * 이 파일과 problemList.test.ts 가 함께 실패한다.
 */

function composer(p: {
  cards?: Partial<ReportComposerInput["cards"]>;
  testData?: ComposerValueMap;
  groundTruth?: ComposerValueMap;
} = {}): ReportComposerInput {
  return {
    cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true, ...p.cards } as ReportComposerInput["cards"],
    metrics: {},
    perspective: {},
    trainingData: {},
    testData: p.testData ?? {},
    groundTruth: p.groundTruth ?? {},
    modelEnv: {},
  };
}

const gt = (labelAuthor?: string, labelReview?: string, unknown = false) =>
  composer({
    groundTruth: {
      ...(labelAuthor ? { labelAuthor: { text: labelAuthor, unknown } } : {}),
      ...(labelReview ? { labelReview: { text: labelReview, unknown } } : {}),
    },
  });

const TAIL = "정답 자체의 오류가 성능 수치에 반영되었을 수 있다. 수치 해석 시 이를 고려해야 한다.";

describe("고정 문구 12 — 정답 라벨 주의(7.2)", () => {
  it("구축 방법 '규칙·자동'·'운영 로그', 신뢰성 '검토 없음'이 각각 설계 문안으로 찍힌다", () => {
    expect(labelCautionSentence(gt("A program or rule"))).toBe(`정답 라벨의 구축 방법이 규칙·자동으로, ${TAIL}`);
    expect(labelCautionSentence(gt("Recorded outcomes"))).toBe(`정답 라벨의 구축 방법이 운영 로그로, ${TAIL}`);
    expect(labelCautionSentence(gt(undefined, "No review"))).toBe(`정답 라벨의 신뢰성이 검토 없음으로, ${TAIL}`);
  });

  it("둘 다 걸리면 한 문장에 '각각'으로 묶는다", () => {
    expect(labelCautionSentence(gt("A program or rule", "No review"))).toBe(
      `정답 라벨의 구축 방법과 신뢰성이 각각 규칙·자동, 검토 없음으로, ${TAIL}`,
    );
  });

  it("그 밖의 답·'모름'·카드 끔·재료 없음이면 문장이 없다", () => {
    expect(labelCautionSentence(gt("Domain experts", "One reviewer"))).toBeNull();
    expect(labelCautionSentence(gt("Outside workers", "Several reviewers"))).toBeNull();
    expect(labelCautionSentence(gt("A program or rule", "No review", true))).toBeNull();
    const off = gt("A program or rule");
    expect(labelCautionSentence({ ...off, cards: { ...off.cards, groundTruth: false } })).toBeNull();
    expect(labelCautionSentence(undefined)).toBeNull();
  });

  it("9절 문제 '정답 라벨 주의'와 같은 판정 — 문구가 있으면 문제가 있고, 없으면 없다", () => {
    const authors = [undefined, "Domain experts", "Outside workers", "A program or rule", "Recorded outcomes"];
    const reviews = [undefined, "Several reviewers", "One reviewer", "No review"];
    for (const author of authors) {
      for (const review of reviews) {
        for (const unknown of [false, true]) {
          const c = gt(author, review, unknown);
          const problem = buildProblemList({
            kpiResults: [],
            taskType: "binary",
            coreMetricIds: [],
            thresholdGain: null,
            imbalanceEffect: null,
            classReport: null,
            evaluationDistribution: {},
            composer: c,
          }).some((p) => p.kind === "label_caution");
          expect([author, review, unknown, labelCautionSentence(c) !== null]).toEqual([author, review, unknown, problem]);
        }
      }
    }
  });
});

describe("고정 문구 11a·11b — 학습 데이터와의 출처 관계(8.2)", () => {
  const relation = (text?: string, unknown = false) =>
    composer({ testData: text ? { testSourceRelation: { text, unknown } } : {} });

  it("같은 출처는 11a, 다른 출처는 11b", () => {
    expect(sourceRelationSentence(relation("Same source"))).toBe(
      "평가 데이터는 학습 데이터와 동일한 출처에서 수집되었다. 본 결과는 동일 분포 내 성능을 나타내며, 다른 운영 환경에서의 일반화 성능을 보증하지 않는다.",
    );
    expect(sourceRelationSentence(relation("Different source"))).toBe("평가 데이터는 학습 데이터와 다른 출처에서 수집되었다.");
    expect(SAME_SOURCE_SENTENCE).not.toBe(DIFFERENT_SOURCE_SENTENCE);
  });

  it("답 없음·'모름'·카드 끔·재료 없음이면 문장이 없다(재료 선택 점검이 다룬다)", () => {
    expect(sourceRelationSentence(relation())).toBeNull();
    expect(sourceRelationSentence(relation("Same source", true))).toBeNull();
    const off = relation("Different source");
    expect(sourceRelationSentence({ ...off, cards: { ...off.cards, testData: false } })).toBeNull();
    expect(sourceRelationSentence(undefined)).toBeNull();
  });
});
