/**
 * 재료 레지스트리가 `docs/COMPOSER_COMPONENTS.md` 와 어긋나지 않는지 고정한다.
 *
 * 이 레지스트리는 구성 화면·단계 목록·필수 입력 점검이 모두 읽는 단일 출처라, 여기가
 * 어긋나면 세 곳이 함께 어긋난다. 그래서 문서가 숫자로 못박은 것(카드 9개, 필수 5·선택 4,
 * ⑤의 질문 2개, ⑥의 더보기 3개, ⑦의 더보기 1개, 지표 15·13·11개)을 그대로 검사한다.
 *
 * 지표 개수는 SPEC.md §1~§3 과의 **교차 검증**이다 — 레지스트리가 목록을 따로 들지 않고
 * `getAvailableMetrics` 에 넘기는지 확인하는 것이기도 하다.
 */
import { describe, expect, it } from "vitest";

import {
  COMPOSER_CARDS,
  OPTIONAL_CARD_IDS,
  MATERIAL_CATEGORIES,
  REQUIRED_CARD_IDS,
  catalogCards,
  choiceLabel,
  entryLabel,
  fieldFormat,
  fieldParts,
  getCard,
  getCardFields,
  getSelectableMetrics,
  getVisibleCards,
  conditionTriggerIds,
  fieldOfLeaf,
  isFieldPicked,
  isFieldReceived,
  isStandardReportingField,
  leafKind,
  pickKind,
  pickableIds,
  placeableIds,
  stepOfLeaf,
} from "./reportComposer";
import { MAPPABLE_ROLES_BY_TASK, getColumnDisplay, type TaskType } from "./evaluationData";
import { REPORT_PURPOSE_LABEL } from "../lib/report/reportConstants";
import { REPORTING_ITEMS } from "../lib/report/materialCheck";

const TASK_TYPES: TaskType[] = ["binary", "multiclass", "multilabel"];

describe("카드 구성", () => {
  it("카드는 9개, 필수 5개와 선택 4개다", () => {
    expect(COMPOSER_CARDS).toHaveLength(9);
    expect(REQUIRED_CARD_IDS).toHaveLength(5);
    expect(OPTIONAL_CARD_IDS).toHaveLength(4);
  });

  it("필수 카드는 ①~⑤, 선택 카드는 ⑥~⑨ 순서다", () => {
    expect(COMPOSER_CARDS.map((card) => card.number)).toEqual([
      "①",
      "②",
      "③",
      "④",
      "⑤",
      "⑥",
      "⑦",
      "⑧",
      "⑨",
    ]);
    // 앞 5개가 잠겨 있고 뒤 4개가 열려 있다 — 줄이 둘로 나뉘는 근거다.
    expect(COMPOSER_CARDS.map((card) => card.locked)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it("선택 카드는 ⑥ 학습 데이터 · ⑦ 테스트 데이터 · ⑧ 정답 라벨 · ⑨ 모델 설정과 실행 환경이다", () => {
    expect(OPTIONAL_CARD_IDS).toEqual(["trainingData", "testData", "groundTruth", "modelEnv"]);
  });

  it("카드 id 와 번호는 유일하다", () => {
    expect(new Set(COMPOSER_CARDS.map((card) => card.id)).size).toBe(9);
    expect(new Set(COMPOSER_CARDS.map((card) => card.number)).size).toBe(9);
  });

  it("카드 9개 모두 전 유형에 적용된다", () => {
    for (const taskType of TASK_TYPES) {
      expect(getVisibleCards(taskType)).toHaveLength(9);
    }
  });

});

describe("필드 스키마", () => {
  const allFields = COMPOSER_CARDS.flatMap((card) => card.fields);

  it("필드 id 는 레지스트리 전역에서 유일하다", () => {
    // 스토어 값 맵의 키가 되므로 겹치면 다른 카드의 입력을 덮어쓴다.
    expect(new Set(allFields.map((field) => field.id)).size).toBe(allFields.length);
  });

  it("모든 필드가 이름과 입력 예시를 갖는다", () => {
    for (const field of allFields) {
      expect(field.label.trim(), field.id).not.toBe("");
      expect(field.inputExample.trim(), field.id).not.toBe("");
    }
  });

  it("조건부 필드는 조건 문구를 갖는다", () => {
    const conditional = allFields.filter((field) => field.kind === "conditional");
    expect(conditional.length).toBeGreaterThan(0);
    for (const field of conditional) {
      expect(field.conditionLabel?.trim(), field.id).toBeTruthy();
    }
  });

  it("조건 문구는 조건부 필드에만 있다", () => {
    for (const field of allFields) {
      if (field.kind !== "conditional") expect(field.conditionLabel, field.id).toBeUndefined();
    }
  });

  it("필드의 단계는 그 카드의 단계 중 하나다", () => {
    // 한 카드가 두 단계로 나뉘는 경우(①, ④)에만 쓰는 값이다.
    for (const card of COMPOSER_CARDS) {
      for (const field of card.fields) {
        if (field.step) expect(card.steps, `${card.id}.${field.id}`).toContain(field.step);
      }
    }
  });

  it("선택지는 single·multi·entries 필드만 갖는다", () => {
    for (const field of allFields) {
      if (!field.choices) continue;
      expect(["single", "multi", "entries"], field.id).toContain(field.input);
      expect(field.choices.length, field.id).toBeGreaterThan(1);
    }
  });
});

/**
 * 레지스트리 폼(`ComposerCardForm`)이 그릴 수 없는 필드는 전용 화면이 받는다. 표시가 빠지면
 * 레지스트리 폼이 파일 칸이나 컬럼 칸을 엉뚱하게 그리거나, 필드 점검이 전용 화면의 값을 못 찾아
 * 빈칸으로 막는다.
 */
describe("전용 화면이 받는 필드 (dedicatedScreen)", () => {
  const allFields = COMPOSER_CARDS.flatMap((card) => card.fields);

  it("파일·지표·컬럼 입력, 지표마다 받는 칸, 칸이 나뉜 필드는 모두 전용 화면이 받는다", () => {
    const needsScreen = allFields.filter(
      (field) =>
        field.input === "file" ||
        field.input === "metricSelect" ||
        field.input === "column" ||
        field.entryKeysFrom === "metrics" ||
        field.parts !== undefined,
    );
    expect(needsScreen.length).toBeGreaterThan(0);
    for (const field of needsScreen) expect(field.dedicatedScreen, field.id).toBe(true);
  });

  it("③ 의뢰자 정보·④ 평가 대상 모델은 손으로 쓴 폼이 받는다 — 모든 필드가 전용 화면이다", () => {
    for (const cardId of ["clientInfo", "model"] as const) {
      for (const field of getCard(cardId).fields) expect(field.dedicatedScreen, field.id).toBe(true);
    }
  });

  it("레지스트리 폼이 그리는 필드는 이것뿐이다", () => {
    // 전용 화면 표시가 빠지면 레지스트리 폼이 파일·컬럼 칸을 그리게 된다. 목록을 리터럴로 고정한다.
    const drawn = Object.fromEntries(
      COMPOSER_CARDS.map((card) => [
        card.id,
        card.fields.filter((field) => !field.dedicatedScreen).map((field) => field.id),
      ]),
    );
    expect(drawn).toEqual({
      evalData: [],
      metrics: ["metricRationale"],
      clientInfo: [],
      model: [],
      perspective: ["criticalErrorType", "classPriority", "usageMode"],
      trainingData: [
        "trainingDatasetName",
        "trainingDataSource",
        "trainingVolume",
        "trainingClassVolume",
        "channelEffects",
        "imbalanceHandling",
        "trainingPeriod",
        "trainingDescription",
        "trainingDataFormat",
        "trainingNotes",
        "preprocessingMatch",
      ],
      testData: ["testDataSource", "testSourceRelation", "testPeriod"],
      groundTruth: [
        "labelAuthor",
        "labelReview",
        "labelReviewerCount",
        "labelAgreementKind",
        "labelAgreementValue",
      ],
      modelEnv: ["algorithm", "hyperparameters", "runtimeEnv", "gpuUsage"],
    });
  });

  it("조건을 값으로 읽을 수 없는 β 는 조건을 정하는 필드(지표)를 따로 적는다", () => {
    const beta = getCard("metrics").fields.find((field) => field.id === "beta");
    expect(beta?.conditionField).toBe("selectedMetrics");
    expect(beta?.requiredWhen).toBeUndefined();
  });
});

/**
 * ① 컬럼 매핑 화면이 받던 재료를 레지스트리 항목으로 옮겼다(재료 목록의 y_true·y_pred·score·
 * prob_*·latency·id·클래스 레이블 설명·양성 클래스·결정 임계값). 입력은 매핑 화면이 그대로 받는다.
 */
describe("① 평가 데이터 — 컬럼 매핑 항목", () => {
  const evalFields = (taskType: TaskType) => getCardFields("evalData", taskType);

  it("결과 파일 뒤에 매핑 항목 일곱 개가 이 순서로 있다", () => {
    expect(getCard("evalData").fields.map((field) => field.id)).toEqual([
      "resultFile",
      "yTrueColumn",
      "predictionColumns",
      "positiveClass",
      "decisionThreshold",
      "latencyColumn",
      "sampleIdColumn",
      "classLabelDescriptions",
    ]);
    for (const field of getCard("evalData").fields.slice(1)) {
      expect(field.step, field.id).toBe("mapping");
    }
  });

  it("유형마다 매핑할 수 있는 역할은 빠짐없이, 정확히 한 항목이 맡는다", () => {
    for (const taskType of TASK_TYPES) {
      const roles = MAPPABLE_ROLES_BY_TASK[taskType];
      expect(roles.length).toBeGreaterThan(0);
      for (const role of roles) {
        const owners = evalFields(taskType).filter((field) => field.columnRoles?.includes(role));
        expect(owners.map((field) => field.id), `${taskType} ${role}`).toHaveLength(1);
      }
    }
  });

  it("컬럼 항목만 역할을 갖고, 컬럼 항목은 역할이 있다", () => {
    for (const field of COMPOSER_CARDS.flatMap((card) => card.fields)) {
      expect(Boolean(field.columnRoles?.length), field.id).toBe(field.input === "column");
    }
  });

  it("역할이 하나인 항목의 이름은 매핑 화면의 역할 이름과 같은 말이다", () => {
    // "정답 컬럼" ↔ "정답 레이블", "지연시간 컬럼" ↔ "지연시간(ms)". 종전 매핑 화면은 '추론 응답시간'이었다.
    const single = getCard("evalData").fields.filter((field) => field.columnRoles?.length === 1);
    expect(single.map((field) => field.id)).toEqual(["yTrueColumn", "latencyColumn", "sampleIdColumn"]);
    for (const field of single) {
      const stem = field.label.replace(/ 컬럼$/, "");
      expect(getColumnDisplay(field.columnRoles![0]).label, field.id).toContain(stem);
    }
  });

  it("필수·선택 구분: 정답·예측은 필수, 양성 클래스는 이진만, 결정 임계값은 예측 컬럼과 함께 들어간다", () => {
    const of = (id: string) => getCard("evalData").fields.find((field) => field.id === id)!;
    expect(of("yTrueColumn").kind).toBe("required");
    expect(of("predictionColumns").kind).toBe("required");
    expect(of("positiveClass")).toMatchObject({ kind: "required", taskTypes: ["binary"] });
    expect(of("decisionThreshold")).toMatchObject({
      kind: "conditional",
      conditionField: "predictionColumns",
      taskTypes: ["binary", "multilabel"],
    });
    for (const id of ["latencyColumn", "sampleIdColumn", "classLabelDescriptions"]) {
      expect(of(id).kind, id).toBe("optional");
    }
    expect(evalFields("multiclass").map((field) => field.id)).not.toContain("positiveClass");
    expect(evalFields("multiclass").map((field) => field.id)).not.toContain("decisionThreshold");
  });

  it("형식 문구: 컬럼 하나, 클래스마다 한 줄 글 — 학습 클래스 양은 그대로 숫자다", () => {
    const of = (id: string) => getCard("evalData").fields.find((field) => field.id === id)!;
    expect(fieldFormat(of("yTrueColumn"))).toBe("컬럼 하나");
    expect(fieldFormat({ ...of("predictionColumns"), format: undefined })).toBe("컬럼 하나 이상");
    expect(fieldFormat(of("classLabelDescriptions"))).toBe("클래스마다 한 줄 글");
    const classVolume = getCard("trainingData").fields.find((field) => field.id === "trainingClassVolume")!;
    expect(fieldFormat(classVolume)).toBe("클래스마다 숫자");
  });
});

describe("글자 수 상한 (B7)", () => {
  it("칸이 나뉘지 않은 글 칸은 모두 상한이 있다 — 클래스마다 받는 글도", () => {
    const textFields = COMPOSER_CARDS.flatMap((card) => card.fields).filter(
      (field) =>
        ((field.input === "text" || field.input === "textarea") && !field.parts) ||
        (field.entryKeysFrom === "classes" && !field.numeric),
    );
    expect(textFields.length).toBeGreaterThan(0);
    for (const field of textFields) expect(field.maxLength, field.id).toBeGreaterThan(0);
  });

  it("긴 설명 칸, 1절 문장 안의 한 줄, 그 밖의 한 줄", () => {
    const of = (id: string) => COMPOSER_CARDS.flatMap((card) => card.fields).find((field) => field.id === id);
    expect(of("trainingDescription")?.maxLength).toBe(2_000);
    expect(of("trainingNotes")?.maxLength).toBe(1_000);
    expect(of("modelPurpose")?.maxLength).toBe(100);
    expect(of("modelCategory")?.maxLength).toBe(100);
    expect(of("trainingDataSource")?.maxLength).toBe(200);
    expect(of("classLabelDescriptions")?.maxLength).toBe(200);
  });
});

describe("③ 의뢰자 정보·④ 평가 대상 모델", () => {
  const fieldOf = (cardId: "clientInfo" | "model", fieldId: string) => {
    const field = getCard(cardId).fields.find((item) => item.id === fieldId);
    if (!field) throw new Error(fieldId);
    return field;
  };

  it("평가 의뢰일은 필수다 — 1층 검사가 늘 요구한다", () => {
    expect(fieldOf("clientInfo", "requestDate").kind).toBe("required");
  });

  it("모델 분류는 필수 한 줄 글이고 AI 에 넘긴다", () => {
    const field = fieldOf("model", "modelCategory");
    expect(field.kind).toBe("required");
    expect(field.input).toBe("text");
    expect(field.sentToAi).toBe(true);
    expect(getCard("model").fields.map((item) => item.id)).toEqual([
      "modelNameVersion",
      "modelPurpose",
      "modelCategory",
    ]);
  });

  it("성적서 용도의 저장값은 성적서가 읽는 키와 같다", () => {
    const field = fieldOf("clientInfo", "reportPurpose");
    expect(field.choices).toEqual(Object.keys(REPORT_PURPOSE_LABEL));
    expect(field.allowsNote).toBe(true);
    for (const choice of field.choices ?? []) {
      expect(field.choiceDescriptions?.[choice], choice).toBeTruthy();
    }
  });

  it("조건부 필드가 기다리는 값은 조건을 정하는 필드의 선택지 안에 있다", () => {
    // 종전에는 과제 정보가 "Project submission" 을 기다렸는데, 성적서 용도는 "project" 를 저장해
    // 조건이 영영 성립하지 않았다.
    const conditions = COMPOSER_CARDS.flatMap((card) =>
      card.fields.flatMap((field) => {
        if (!field.requiredWhen) return [];
        const list = Array.isArray(field.requiredWhen) ? field.requiredWhen : [field.requiredWhen];
        return list.map((condition) => ({ card, field, condition }));
      }),
    );
    expect(conditions.length).toBeGreaterThan(0);
    for (const { card, field, condition } of conditions) {
      const trigger = card.fields.find((item) => item.id === condition.field);
      const expected = [condition.equals, ...(condition.in ?? [])].filter(
        (value): value is string => value !== undefined,
      );
      expect(expected.length, field.id).toBeGreaterThan(0);
      for (const value of expected) expect(trigger?.choices, `${field.id} ← ${value}`).toContain(value);
    }
  });
});

describe("⑤ 평가 관점 — 유형에 따라 다르지만 항상 두 개", () => {
  it.each(TASK_TYPES)("%s 는 질문 두 개를 받는다", (taskType) => {
    expect(getCardFields("perspective", taskType)).toHaveLength(2);
  });

  it("이진은 중요 오류 유형과 사용 방식을 묻는다", () => {
    expect(getCardFields("perspective", "binary").map((field) => field.id)).toEqual([
      "criticalErrorType",
      "usageMode",
    ]);
  });

  it("다중 클래스·멀티레이블은 클래스 중요도와 사용 방식을 묻는다", () => {
    for (const taskType of ["multiclass", "multilabel"] as TaskType[]) {
      expect(getCardFields("perspective", taskType).map((field) => field.id)).toEqual([
        "classPriority",
        "usageMode",
      ]);
    }
  });

  it("세 질문 모두 TS 4213 근거 조항을 갖는다", () => {
    // 근거 조항과 점검 대상이 없는 질문은 평가 관점이 아니라 일반 입력 필드다.
    expect(getCard("perspective").fields.map((field) => field.standardBasis)).toEqual([
      { standard: "ISO/IEC TS 4213", clause: "6.2.6" },
      { standard: "ISO/IEC TS 4213", clause: "6.4.3" },
      { standard: "ISO/IEC TS 4213", clause: "6.6.2" },
    ]);
  });
});

describe("② 지표와 합격 기준", () => {
  it("지표 선택 이유는 멀티레이블에서만 묻는다", () => {
    expect(getCardFields("metrics", "multilabel").map((field) => field.id)).toContain(
      "metricRationale",
    );
    for (const taskType of ["binary", "multiclass"] as TaskType[]) {
      expect(getCardFields("metrics", taskType).map((field) => field.id)).not.toContain(
        "metricRationale",
      );
    }
  });

  it("β 는 Fβ 를 고를 때만 받는 조건부 필드다", () => {
    const beta = getCard("metrics").fields.find((field) => field.id === "beta");
    expect(beta?.kind).toBe("conditional");
    expect(beta?.conditionLabel).toBe("지표에서 Fβ 선택 시");
  });

  it("고를 수 있는 지표 수가 SPEC 과 같다 (이진 15 · 다중 클래스 13 · 멀티레이블 11)", () => {
    expect(getSelectableMetrics("binary")).toHaveLength(15);
    expect(getSelectableMetrics("multiclass")).toHaveLength(13);
    expect(getSelectableMetrics("multilabel")).toHaveLength(11);
  });

  it("멀티레이블에서는 M1·M11·M12·M13 을 고를 수 없다", () => {
    // 값이 다른 지표와 완전히 같기 때문이다(SPEC.md §3 규칙 6).
    const ids = getSelectableMetrics("multilabel").map((metric) => metric.id);
    for (const id of ["M1", "M11", "M12", "M13"]) expect(ids).not.toContain(id);
  });
});

describe("⑥ 학습 데이터", () => {
  it("재료 고르기에서 권장 6개와 선택 7개로 나뉜다 (docs/MATERIAL_PICKER.md §6)", () => {
    const card = getCard("trainingData");
    const of = (kind: string) =>
      card.fields.filter((field) => pickKind(card, field) === kind).map((field) => field.id);
    expect(of("recommended")).toEqual([
      "trainingDatasetName",
      "trainingDataSource",
      "trainingVolume",
      "trainingClassVolume",
      "channelEffects",
      "imbalanceHandling",
    ]);
    expect(of("optional")).toEqual([
      "trainingPeriod",
      "trainingDescription",
      "trainingDataFormat",
      "trainingNotes",
      // 학습·평가 전처리 일치 — ⑦ 에서 옮겨 왔다(persist v13, 서술 설계 D44).
      "preprocessingMatch",
      // 예시 파일 두 칸 — 학습 데이터 화면의 예시 파일 칸이 받는다(전용 화면).
      "trainingExamples",
      "trainingUnsuitableExamples",
    ]);
  });

  it("Details 의 학습 데이터 폼을 흡수했다 — 이름·건수·클래스별 양·형식이 모두 여기 있다", () => {
    const ids = getCard("trainingData").fields.map((field) => field.id);
    for (const id of [
      "trainingDatasetName",
      "trainingVolume",
      "trainingClassVolume",
      "trainingDataFormat",
    ]) {
      expect(ids).toContain(id);
    }
    // 기존 저장소로 흘려보내지 않는다 — 성적서가 카드 값을 직접 읽는다.
    expect(getCard("trainingData").fields.some((field) => field.legacy)).toBe(false);
  });

  it("수집 환경 차이는 복수 선택이고 \"알려진 것 없음\"이 배타 선택지다", () => {
    const field = getCard("trainingData").fields.find((item) => item.id === "channelEffects");
    expect(field?.input).toBe("multi");
    expect(field?.exclusiveChoice).toBe("None known");
    expect(field?.choices).toContain("None known");
    expect(field?.choices).toContain("Other (free text)");
  });

  it("클래스별 데이터 양은 업로드한 클래스 목록으로 칸을 만든다", () => {
    const field = getCard("trainingData").fields.find(
      (item) => item.id === "trainingClassVolume",
    );
    expect(field?.input).toBe("entries");
    expect(field?.entryKeysFrom).toBe("classes");
  });
});

describe("⑦ 테스트 데이터", () => {
  it("선택 항목은 수집 기간이다 — 학습·평가 전처리 일치는 ⑥ 으로 옮겼다", () => {
    expect(pickableIds("testData", "binary")).toEqual(["testDataSource", "testSourceRelation", "testPeriod"]);
    const card = getCard("testData");
    const optional = card.fields.filter((field) => pickKind(card, field) === "optional");
    expect(optional.map((field) => field.id)).toEqual(["testPeriod"]);
    expect(getCard("trainingData").fields.map((field) => field.id)).toContain("preprocessingMatch");
  });

  /**
   * 전처리 자유서술 세 칸(⑥ 1개, ⑦ 2개)을 "학습과 같은 전처리인가" 한 칸으로 바꿨다(서술 설계
   * D44). TS 4213 5.3.3 은 전처리 보고를 요구하지 않아 2층 근거가 없다.
   */
  it("전처리는 같음 / 다름 / 모름 한 칸이고 글을 덧붙일 수 있다", () => {
    const field = getCard("trainingData").fields.find((item) => item.id === "preprocessingMatch");
    expect(field?.input).toBe("single");
    expect(field?.choices).toEqual(["Same", "Different", "Unknown"]);
    expect(field?.allowsNote).toBe(true);
    expect(field?.kind).toBe("optional");
  });

  it("옛 전처리 칸 세 개는 없다", () => {
    const ids = COMPOSER_CARDS.flatMap((card) => card.fields).map((field) => field.id);
    for (const id of ["preprocessing", "testPreprocessing", "testPreprocessingDetail"]) {
      expect(ids).not.toContain(id);
    }
  });
});

describe("필수 (표준 보고) 유도", () => {
  it("선택 카드의 필수 필드가 표준 보고 항목이다", () => {
    for (const id of OPTIONAL_CARD_IDS) {
      const card = getCard(id);
      const standard = card.fields.filter((field) => isStandardReportingField(card, field));
      expect(standard.length, id).toBeGreaterThan(0);
      expect(standard.every((field) => field.kind === "required")).toBe(true);
    }
  });

  it("필수 카드의 필드는 표준 보고 항목이 아니다", () => {
    // isStandardReportingField 는 pickKind 의 권장 유도 규칙이다. 잠긴 카드의 2층 보고 항목(① 지연시간
    // 컬럼)은 standardBasis.reportingItem 이 맡는다(아래 "표준 근거").
    for (const id of REQUIRED_CARD_IDS) {
      const card = getCard(id);
      expect(card.fields.some((field) => isStandardReportingField(card, field)), id).toBe(false);
    }
  });

  it("표준 보고 항목은 모를 때 빠져나갈 길이 있다", () => {
    /**
     * 켠 카드의 표준 보고 필드는 비운 채로 진행할 수 없다(열린 결정). 그래서 모를 때
     * 고를 것이 반드시 있어야 한다 — 보통은 "모름"이고, ⑥ 수집 환경 차이만
     * "알려진 것 없음"이다. 둘의 뜻은 다르다: "모름"은 성적서에 "제공되지 않음"으로
     * 찍히고, "알려진 것 없음"은 원문이 요구하는 답이라 **제공된 것으로 센다**.
     */
    for (const id of OPTIONAL_CARD_IDS) {
      const card = getCard(id);
      for (const field of card.fields) {
        if (!isStandardReportingField(card, field)) continue;
        const hasWayOut = Boolean(field.allowsUnknown || field.exclusiveChoice);
        expect(hasWayOut, `${card.id}.${field.id}`).toBe(true);
      }
    }
  });

  it("\"알려진 것 없음\"으로 답하는 필드는 \"모름\"을 두지 않는다", () => {
    // 같은 칸에 둘을 함께 두면 "제공됨"과 "제공되지 않음"을 사용자가 구별해 골라야 한다.
    const channelEffects = getCard("trainingData").fields.find(
      (field) => field.id === "channelEffects",
    );
    expect(channelEffects?.exclusiveChoice).toBe("None known");
    expect(channelEffects?.allowsUnknown).toBeUndefined();
    expect(channelEffects?.choices).not.toContain("모름");
  });
});

/**
 * 표준 근거 — 평가 흐름 만들기 설명 팝업의 "표준 근거" 줄. 성적서가 실제로 점검하는 항목에만 있다.
 * 2층 번호(reportingItem)는 성적서가 "제공되지 않음"을 세는 번호(reportMaterials.ts 의 required(n, …))와 같다.
 */
describe("표준 근거 (standardBasis)", () => {
  const allFields = COMPOSER_CARDS.flatMap((card) => card.fields);

  it("2층 번호는 필드마다 이렇다 — 6번(TP·FP 건수)은 계산값이라 필드가 없다", () => {
    const items = Object.fromEntries(
      allFields
        .filter((field) => field.standardBasis?.reportingItem !== undefined)
        .map((field) => [field.id, field.standardBasis!.reportingItem]),
    );
    expect(items).toEqual({
      metricRationale: 12,
      latencyColumn: 8,
      trainingDatasetName: 1,
      trainingDataSource: 1,
      trainingVolume: 1,
      trainingClassVolume: 1,
      channelEffects: 9,
      imbalanceHandling: 3,
      testDataSource: 2,
      testSourceRelation: 2,
      labelAuthor: 4,
      labelReview: 5,
      algorithm: 10,
      hyperparameters: 10,
      runtimeEnv: 7,
      gpuUsage: 11,
    });
    const covered = new Set(Object.values(items));
    expect([...REPORTING_ITEMS.map((row) => row.item)].filter((item) => !covered.has(item))).toEqual([6]);
  });

  it("선택 카드에서는 2층 번호가 있는 필드가 곧 권장 항목이다", () => {
    for (const id of OPTIONAL_CARD_IDS) {
      const card = getCard(id);
      expect(card.fields.length).toBeGreaterThan(0);
      for (const field of card.fields) {
        expect(field.standardBasis?.reportingItem !== undefined, field.id).toBe(
          pickKind(card, field) === "recommended",
        );
      }
    }
  });

  it("잠긴 카드에서 2층 번호가 있는 것은 지표 선택 이유와 지연시간 컬럼뿐이다", () => {
    const locked = REQUIRED_CARD_IDS.flatMap((id) =>
      getCard(id).fields.filter((field) => field.standardBasis?.reportingItem !== undefined),
    );
    expect(locked.map((field) => [field.id, field.kind])).toEqual([
      ["latencyColumn", "optional"],
      ["metricRationale", "required"],
    ]);
  });

  it("권장 항목과 평가 관점 질문은 모두 TS 4213 근거가 있다", () => {
    const shouldHave = COMPOSER_CARDS.flatMap((card) =>
      card.fields.filter((field) => pickKind(card, field) === "recommended" || card.id === "perspective"),
    );
    expect(shouldHave.length).toBeGreaterThan(0);
    for (const field of shouldHave) expect(field.standardBasis?.standard, field.id).toBe("ISO/IEC TS 4213");
  });

  it("1층 식별 항목(회사 정보, 모델)은 ISO/IEC 17025 7.8.2.1 이다", () => {
    const of = (cardId: "clientInfo" | "model", fieldId: string) =>
      getCard(cardId).fields.find((field) => field.id === fieldId)?.standardBasis;
    expect(of("clientInfo", "companyInfo")).toEqual({ standard: "ISO/IEC 17025", clause: "7.8.2.1 e)" });
    for (const id of ["modelNameVersion", "modelPurpose", "modelCategory"]) {
      expect(of("model", id), id).toEqual({ standard: "ISO/IEC 17025", clause: "7.8.2.1 g)" });
    }
  });

  it("근거가 없는 필드는 줄을 빼고, 요구 문장은 아직 하나도 없다(대조 전)", () => {
    // 의뢰자 정보의 용도·날짜·선택 칸, 결과 파일·매핑 컬럼, 지표 목록 등은 성적서가 점검하지 않는다.
    for (const id of ["reportPurpose", "requestDate", "resultFile", "yTrueColumn", "selectedMetrics", "trainingPeriod"]) {
      expect(allFields.find((field) => field.id === id)?.standardBasis, id).toBeUndefined();
    }
    expect(allFields.filter((field) => field.standardBasis?.requirement)).toEqual([]);
  });
});

/**
 * 평가 흐름 만들기의 항목(leaf). 화면(S3~)과 흐름 규칙(S2)이 이 함수들만 읽는다.
 */
describe("평가 흐름 만들기의 항목", () => {
  const allFields = COMPOSER_CARDS.flatMap((card) => card.fields);
  const cardOf = (fieldId: string) => COMPOSER_CARDS.find((card) => card.fields.some((f) => f.id === fieldId))!;

  it("항목 구분은 pickKind 와 같다 — 잠긴 카드의 2층 보고 항목(지연시간 컬럼)만 권장이다", () => {
    const differs = COMPOSER_CARDS.flatMap((card) =>
      card.fields.filter((field) => leafKind(card, field) !== pickKind(card, field)),
    );
    expect(differs.map((field) => field.id)).toEqual(["latencyColumn"]);
    expect(leafKind(getCard("evalData"), differs[0])).toBe("recommended");
  });

  it("넣을 수 있는 항목: 조건부는 빠지고, 고를 수 있는 칸만 칸 단위다", () => {
    expect(placeableIds("clientInfo", "binary")).toEqual([
      "companyInfo",
      "reportPurpose",
      "contactExtra:website",
      "contactExtra:fax",
      "projectNumber",
      "requestDate",
    ]);
    expect(placeableIds("evalData", "binary")).toEqual([
      "resultFile",
      "yTrueColumn",
      "predictionColumns",
      "positiveClass",
      "latencyColumn",
      "sampleIdColumn",
      "classLabelDescriptions",
    ]);
    expect(placeableIds("evalData", "multiclass")).toEqual([
      "resultFile",
      "yTrueColumn",
      "predictionColumns",
      "latencyColumn",
      "sampleIdColumn",
      "classLabelDescriptions",
    ]);
    // "" 면 모든 유형의 항목이다(persist v15 가 유형을 모르는 저장분에 쓴다).
    expect(placeableIds("perspective", "")).toEqual(["criticalErrorType", "classPriority", "usageMode"]);
  });

  /**
   * 하단 바·"다음" 막힘이 셀 수의 정본. 바뀌면 docs/MATERIAL_PICKER.md §12.1 의 표도 함께 고친다.
   * 필수 = ③3 + ④3 + ①4(이진만 양성 클래스) + ⑤2 + ②3(멀티는 지표 선택 이유 +1)
   * 권장 = ⑨4 + ⑥6 + ⑦2 + ⑧2 + ① 지연시간 1
   * 선택 = ③3(홈페이지·팩스·과제 번호) + ①2(샘플 ID·클래스 설명) + ⑥7 + ⑦1
   */
  it.each([
    ["binary", { required: 15, recommended: 15, optional: 13 }],
    ["multiclass", { required: 14, recommended: 15, optional: 13 }],
    ["multilabel", { required: 15, recommended: 15, optional: 13 }],
  ] as const)("%s 의 항목 수는 필수·권장·선택이 %o 이다", (taskType, expected) => {
    const counts = { required: 0, recommended: 0, optional: 0 };
    for (const card of COMPOSER_CARDS) {
      for (const leafId of placeableIds(card.id, taskType)) {
        const kind = leafKind(card, fieldOfLeaf(card.id, leafId)!);
        if (kind === "conditional") throw new Error(leafId);
        counts[kind] += 1;
      }
    }
    expect(counts).toEqual(expected);
  });

  it("조건부 항목과 조건을 정하는 항목 — 여섯 개, 모두 같은 카드 안이다", () => {
    const table = allFields
      .filter((field) => field.kind === "conditional")
      .map((field) => [cardOf(field.id).id, field.id, conditionTriggerIds(field)]);
    expect(table).toEqual([
      ["evalData", "decisionThreshold", ["predictionColumns"]],
      ["metrics", "beta", ["selectedMetrics"]],
      ["clientInfo", "projectInfo", ["reportPurpose"]],
      ["groundTruth", "labelReviewerCount", ["labelReview"]],
      ["groundTruth", "labelAgreementKind", ["labelReview"]],
      ["groundTruth", "labelAgreementValue", ["labelReview", "labelAgreementKind"]],
    ]);
    for (const [cardId, , triggers] of table) {
      for (const trigger of triggers as string[]) {
        expect(getCard(cardId as "metrics").fields.map((field) => field.id), trigger).toContain(trigger);
      }
    }
  });

  it("조건은 한 곳에만 적는다 — requiredWhen 과 conditionField 를 함께 두지 않고, 조건부가 아닌 필드는 둘 다 없다", () => {
    for (const field of allFields) {
      expect(Boolean(field.requiredWhen && field.conditionField), field.id).toBe(false);
      if (field.kind !== "conditional") {
        expect(field.requiredWhen ?? field.conditionField, field.id).toBeUndefined();
        expect(conditionTriggerIds(field), field.id).toEqual([]);
      }
    }
  });

  it("조건이 돌고 돌지 않고, 조건을 정하는 필드가 조건부면 그 조건도 이 필드의 조건에 적혀 있다", () => {
    const conditional = allFields.filter((field) => field.kind === "conditional");
    expect(conditional.length).toBeGreaterThan(0);
    for (const field of conditional) {
      const card = cardOf(field.id);
      // 지나온 경로에 다시 나오면 순환이다. 두 경로로 같은 필드에 닿는 것(마름모)은 괜찮다.
      const walk = (id: string, path: string[]) => {
        expect(path, `${field.id} 순환`).not.toContain(id);
        const current = card.fields.find((item) => item.id === id)!;
        for (const next of conditionTriggerIds(current)) walk(next, [...path, id]);
      };
      walk(field.id, []);

      const own = new Set(conditionTriggerIds(field));
      for (const triggerId of own) {
        const trigger = card.fields.find((item) => item.id === triggerId)!;
        for (const inherited of conditionTriggerIds(trigger)) {
          expect(own.has(inherited), `${field.id} ← ${triggerId} ← ${inherited}`).toBe(true);
        }
      }
    }
  });

  it("항목의 필드와 입력 단계", () => {
    expect(fieldOfLeaf("clientInfo", "contactExtra:fax")?.id).toBe("contactExtra");
    expect(fieldOfLeaf("clientInfo", "없는항목")).toBeUndefined();
    expect(stepOfLeaf("evalData", "resultFile")).toBe("upload");
    expect(stepOfLeaf("evalData", "latencyColumn")).toBe("mapping");
    expect(stepOfLeaf("clientInfo", "contactExtra:fax")).toBe("clientInfo");
  });
});

describe("입력 화면이 받는가 — isFieldReceived (B2)", () => {
  const gt = getCard("groundTruth");
  const field = (id: string) => gt.fields.find((item) => item.id === id)!;

  it("받기로 한 것이 없는 상태(picks 없음)는 모두 받는다", () => {
    for (const item of gt.fields) expect(isFieldReceived(gt, item, undefined), item.id).toBe(true);
  });

  it("검수 방식을 받지 않으면 라벨러 수·일치도도 받지 않는다 — isFieldPicked 는 그대로 참이다", () => {
    for (const id of ["labelReviewerCount", "labelAgreementKind", "labelAgreementValue"]) {
      expect(isFieldPicked(gt, field(id), ["labelAuthor"]), id).toBe(true);
      expect(isFieldReceived(gt, field(id), ["labelAuthor"]), id).toBe(false);
    }
  });

  it("검수 방식을 받으면 조건부 셋을 모두 받는다(일치도 값은 두 단계 위까지 따진다)", () => {
    for (const id of ["labelReviewerCount", "labelAgreementKind", "labelAgreementValue"]) {
      expect(isFieldReceived(gt, field(id), ["labelReview"]), id).toBe(true);
    }
  });

  it("조건부가 아닌 필드는 isFieldPicked 와 같다", () => {
    const picks = ["labelReview"];
    expect(isFieldReceived(gt, field("labelAuthor"), picks)).toBe(isFieldPicked(gt, field("labelAuthor"), picks));
    expect(isFieldReceived(gt, field("labelReview"), picks)).toBe(true);
  });
});

describe("재료 고르기 — 대분류와 필드 구분 (docs/MATERIAL_PICKER.md §2·§6)", () => {
  const fieldOf = (cardId: Parameters<typeof getCard>[0], fieldId: string) => {
    const field = getCard(cardId).fields.find((item) => item.id === fieldId);
    if (!field) throw new Error(fieldId);
    return field;
  };

  it("대분류 4개가 카드 9장을 빠짐없이 한 번씩 담는다", () => {
    const ids = MATERIAL_CATEGORIES.flatMap((category) => category.cardIds);
    expect(MATERIAL_CATEGORIES.map((category) => category.name)).toEqual([
      "의뢰 정보",
      "모델",
      "데이터",
      "평가 기준",
    ]);
    expect([...ids].sort()).toEqual(COMPOSER_CARDS.map((card) => card.id).sort());
  });

  it("카탈로그 순서가 입력 순서다 — 의뢰자 정보부터 지표와 합격 기준까지", () => {
    expect(catalogCards("binary").map((card) => card.id)).toEqual([
      "clientInfo",
      "model",
      "modelEnv",
      "evalData",
      "trainingData",
      "testData",
      "groundTruth",
      "perspective",
      "metrics",
    ]);
  });

  it("선택 카드의 필수 필드는 권장, 필수 카드의 필수 필드는 필수다", () => {
    expect(pickKind(getCard("trainingData"), fieldOf("trainingData", "trainingDatasetName"))).toBe(
      "recommended",
    );
    expect(pickKind(getCard("clientInfo"), fieldOf("clientInfo", "companyInfo"))).toBe("required");
    expect(pickKind(getCard("clientInfo"), fieldOf("clientInfo", "projectNumber"))).toBe("optional");
    expect(pickKind(getCard("groundTruth"), fieldOf("groundTruth", "labelReviewerCount"))).toBe(
      "conditional",
    );
  });

  it("권장은 필드 한 줄 단위, 선택은 쪼갠 항목마다 체크한다 — 필수·조건부는 체크하지 않는다", () => {
    expect(pickableIds("modelEnv", "binary")).toEqual([
      "algorithm",
      "hyperparameters",
      "runtimeEnv",
      "gpuUsage",
    ]);
    // 평가 의뢰일은 필수 항목이 되어 체크 대상에서 빠졌다.
    expect(pickableIds("clientInfo", "binary")).toEqual([
      "contactExtra:website",
      "contactExtra:fax",
      "projectNumber",
    ]);
    expect(pickableIds("perspective", "binary")).toEqual([]);
  });

  it("모든 필드에 재료 고르기용 설명과 형식이 있다", () => {
    for (const field of COMPOSER_CARDS.flatMap((card) => card.fields)) {
      expect(field.description, field.id).toBeTruthy();
      expect(fieldFormat(field), field.id).toBeTruthy();
    }
  });

  /**
   * 재료 고르기의 설명은 "이 칸이 무엇인가"를 말한다. 종전에는 "1절, 2절, 4절에 적힙니다"처럼
   * 성적서 위치만 적힌 칸이 있어, 무엇을 넣을지 알 수 없었다. 성적서 위치는 `reportSection` 이
   * 따로 든다.
   */
  it("화면에 보이는 설명은 성적서 위치가 아니라 무엇을 넣는지와 예시다", () => {
    const shown = COMPOSER_CARDS.flatMap((card) => card.fields).flatMap((field) =>
      field.parts
        ? field.parts.map((part) => ({ id: `${field.id}:${part.key}`, text: part.description ?? "" }))
        : [{ id: field.id, text: field.description }],
    );
    for (const { id, text } of shown) {
      expect(text, id).not.toMatch(/\d절|적힙니다/);
      expect(text, id).toContain("예:");
    }
  });

  it("조건부 필드의 조건은 어느 칸에서 무엇을 고를 때인지로 적는다", () => {
    const conditions = COMPOSER_CARDS.flatMap((card) => card.fields)
      .filter((field) => field.kind === "conditional")
      .map((field) => field.conditionLabel);
    expect(conditions).toContain("성적서 용도에서 과제 산출물 선택 시");
    for (const label of conditions) expect(label).toMatch(/에서 .+ 선택 시$/);
  });

  it("형식은 선택지의 화면 이름으로 만든다 — 저장값이 드러나지 않는다", () => {
    expect(fieldFormat(fieldOf("perspective", "usageMode"))).toBe("하나 선택: 실시간 응답 / 일괄 처리");
    expect(fieldFormat(fieldOf("trainingData", "preprocessingMatch"))).toBe(
      "하나 선택: 같음 / 다름 / 모름. 덧붙이는 글 가능",
    );
  });

  it("칸이 정해진 필드는 그 칸으로 쪼개 보인다", () => {
    expect(fieldParts(fieldOf("modelEnv", "runtimeEnv")).map((part) => part.label)).toEqual([
      "운영체제",
      "CPU",
      "GPU",
      "메모리",
      "소프트웨어",
    ]);
    expect(fieldParts(fieldOf("clientInfo", "companyInfo")).map((part) => part.label)).toEqual([
      "회사명",
      "대표자",
      "사업자등록번호",
      "전화번호",
      "주소",
    ]);
  });
});

/**
 * 재료 목록과 형태를 맞춘 필드(2026-10-06 입력 화면 점검).
 *
 * 화면이 없던 것 셋(핵심 지표·지표 선택 이유·학습 데이터 설명/비고)과 받는 형태가 문서와
 * 달랐던 것 다섯(편향 감소 노력·라벨 구축 방법·라벨러 수/일치도·채널 효과·수집 기간)이다.
 */
describe("재료 목록과 맞춘 형태", () => {
  const fieldOf = (cardId: Parameters<typeof getCard>[0], fieldId: string) =>
    getCard(cardId).fields.find((field) => field.id === fieldId);

  it("Other 선택지는 언제나 그 필드의 선택지 중 하나다", () => {
    for (const field of COMPOSER_CARDS.flatMap((card) => card.fields)) {
      if (field.otherChoice) expect(field.choices, field.id).toContain(field.otherChoice);
    }
  });

  it("② 지표 선택 이유에 직접 적는 Other 가 있고, 지표 화면에서 받는다", () => {
    const field = fieldOf("metrics", "metricRationale");
    expect(field?.otherChoice).toBe("Other (own words)");
    expect(field?.step).toBe("metrics");
  });

  it("② 핵심 지표는 지표와 합격 기준 화면에서 고르고, 최소 1개가 필수다 (재료 목록 7절)", () => {
    const field = fieldOf("metrics", "coreMetrics");
    expect(field?.kind).toBe("required");
    // ② 카드 전체가 한 단계다(docs/MATERIAL_PICKER.md §5). 필드 단위로 나눌 단계가 없다.
    expect(getCard("metrics").steps).toEqual(["metrics"]);
    expect(field?.step).toBeUndefined();
  });

  it("⑥ 편향 감소 노력은 여럿 고르고, 'Did nothing' 은 배타, Other 는 직접 적는다", () => {
    const field = fieldOf("trainingData", "imbalanceHandling");
    expect(field?.input).toBe("multi");
    expect(field?.exclusiveChoice).toBe("Did nothing");
    expect(field?.otherChoice).toBe("Other (free text)");
    expect(field?.allowsUnknown).toBe(true);
  });

  it("⑥ 채널 효과의 Other 는 직접 적는다", () => {
    expect(fieldOf("trainingData", "channelEffects")?.otherChoice).toBe("Other (free text)");
  });

  it("⑥ 학습 데이터 설명·비고가 있다", () => {
    expect(fieldOf("trainingData", "trainingDescription")?.input).toBe("textarea");
    expect(fieldOf("trainingData", "trainingNotes")?.input).toBe("textarea");
  });

  it("⑥ ⑦ 수집 기간은 시작 월·끝 월이다", () => {
    expect(fieldOf("trainingData", "trainingPeriod")?.input).toBe("monthRange");
    expect(fieldOf("testData", "testPeriod")?.input).toBe("monthRange");
  });

  it("⑧ 정답 라벨 신뢰성의 화면 이름은 성적서 이름과 같다 (W1)", () => {
    const field = fieldOf("groundTruth", "labelReview")!;
    expect(field.label).toBe("정답 라벨 신뢰성");
    for (const choice of field.choices ?? []) {
      expect(choiceLabel(field, choice), choice).toBe(field.reportLabels?.[choice]);
    }
  });

  it("⑧ 라벨 구축 방법은 Other 를 포함해 다섯 가지다", () => {
    const field = fieldOf("groundTruth", "labelAuthor");
    expect(field?.choices).toHaveLength(5);
    expect(field?.otherChoice).toBe("Other (free text)");
  });

  it("⑧ 라벨러 수는 2 이상의 정수다 — 복수 라벨러 합의일 때만 받는다 (W10)", () => {
    expect(fieldOf("groundTruth", "labelAgreement")).toBeUndefined();
    expect(fieldOf("groundTruth", "labelReviewerCount")?.numberRange).toEqual({
      min: 2,
      integer: true,
    });
    expect(fieldFormat(fieldOf("groundTruth", "labelReviewerCount")!)).toBe("숫자. 2 이상의 정수");
  });

  /** 서술 설계 D42 — 종류를 알아야 숫자를 읽을 수 있다(같은 0.8 이라도 일치율과 카파는 다르다). */
  it("⑧ 라벨 일치도는 종류를 먼저 고르고, 범위는 종류를 따른다", () => {
    expect(fieldOf("groundTruth", "labelAgreementRate")).toBeUndefined();

    const kind = fieldOf("groundTruth", "labelAgreementKind");
    expect(kind?.choices).toEqual([
      "Percent agreement",
      "Cohen's kappa",
      "Fleiss' kappa",
      "Krippendorff's alpha",
      "Other",
      "Not measured",
    ]);
    expect(kind?.otherChoice).toBe("Other");

    const value = fieldOf("groundTruth", "labelAgreementValue");
    expect(value?.numberRangeBy?.ranges).toEqual({
      "Percent agreement": { min: 0, max: 100 },
      "Cohen's kappa": { min: -1, max: 1 },
      "Fleiss' kappa": { min: -1, max: 1 },
      "Krippendorff's alpha": { min: -1, max: 1 },
      Other: null,
    });
    // "측정 안 함"이면 값 칸이 없다.
    const conditions = Array.isArray(value?.requiredWhen) ? value.requiredWhen : [];
    expect(conditions.some((c) => c.in?.includes("Not measured"))).toBe(false);
  });

  it("⑧ Cohen의 카파는 라벨러 2명, Fleiss의 카파는 3명 이상에만 고를 수 있다", () => {
    const rules = fieldOf("groundTruth", "labelAgreementKind")?.choiceRequires;
    expect(rules?.["Cohen's kappa"]).toMatchObject({ field: "labelReviewerCount", max: 2 });
    expect(rules?.["Fleiss' kappa"]).toMatchObject({ field: "labelReviewerCount", min: 3 });
  });

  it("성적서 이름(reportLabels)은 그 필드의 선택지를 빠짐없이 덮는다", () => {
    for (const field of COMPOSER_CARDS.flatMap((card) => card.fields)) {
      if (!field.reportLabels) continue;
      for (const choice of field.choices ?? []) {
        expect(field.reportLabels[choice], `${field.id}: ${choice}`).toBeTruthy();
      }
    }
  });

  /**
   * 저장값은 영어로 두고 화면 이름만 한국어다(docs/MATERIAL_PICKER.md §8). 이름표가 빠지면
   * 그 선택지만 영어 저장값이 화면에 그대로 드러난다.
   */
  it("화면 이름(choiceLabels·entryLabels)은 모든 선택지와 고정 칸을 덮는다", () => {
    for (const field of COMPOSER_CARDS.flatMap((card) => card.fields)) {
      for (const choice of field.choices ?? []) {
        expect(field.choiceLabels?.[choice], `${field.id}: ${choice}`).toBeTruthy();
      }
      for (const key of field.entryKeys ?? []) {
        expect(field.entryLabels?.[key], `${field.id}: ${key}`).toBeTruthy();
      }
    }
  });

  it("화면 이름은 저장값을 바꾸지 않는다 — 선택지는 영어 그대로다", () => {
    const usage = fieldOf("perspective", "usageMode");
    expect(usage?.choices).toEqual(["Real-time", "Batch"]);
    expect(choiceLabel(usage!, "Batch")).toBe("일괄 처리");
    expect(entryLabel(fieldOf("modelEnv", "runtimeEnv")!, "Operating system")).toBe("운영체제");
    // 이름표가 없는 칸(클래스 이름 등)은 키를 그대로 보인다.
    expect(entryLabel(fieldOf("trainingData", "trainingClassVolume")!, "cat")).toBe("cat");
  });
});
