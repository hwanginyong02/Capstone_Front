/**
 * 워크플로우 전역 상태 관리 (Zustand + persist)
 *
 * 이 스토어는 전체 평가 워크플로우의 상태(각 스텝의 입력 데이터, 현재 단계, 완료 여부 등)를
 * 관리하며, 최종 평가 리포트 데이터를 생성하는 로직을 포함합니다.
 *
 * ISSUES.md E-01 — 종전에는 persist 가 없어 **새로고침 한 번으로 검증 앞 단계 입력이 전부
 * 사라졌다.** 수십 분간 입력한 기업정보·모델정보·지표·매핑이 날아가고, 그것을 알리는
 * 신호는 검증 단계의 "업로드된 파일이 없습니다" 문구뿐이었다.
 *
 * `rawFile` 은 File 객체라 JSON 직렬화가 원리적으로 불가능하므로 persist 대상에서 뺀다.
 * 대신 `uploadedFile`(파일 메타)은 저장해, 재수화 후 **"파일이 있었는데 지금은 없다"** 를
 * 감지해 재업로드를 유도할 수 있게 한다.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getAvailableMetrics, type TaskType } from "../../data/evaluationData";
import type { ColumnNote, MappingWarning } from "../../lib/report/backendNotices";
import type { MappingRow } from "../../types/mapping.types";
import type { ValidateDataResponseData } from "../../types/validation.types";
import type { MaterialCheckAck } from "../../types/finalReport.types";
import {
  DEFAULT_BASIC_INFO,
  type BasicInfoFormData,
  type MetricDetailStateMap,
  type StepId,
  type UploadedFileInfo,
} from "../../types/workflow.types";
import {
  DEFAULT_COMPOSER_SELECTION,
  type ComposerCardId,
  type ComposerFieldValue,
  type ComposerSelection,
  type ComposerValueMap,
  type MaterialPicks,
  type OptionalCardId,
} from "../../types/reportComposer.types";
import {
  COMPOSER_CARDS,
  OPTIONAL_CARD_IDS,
  pickKind,
  pickableIds,
} from "../../data/reportComposer";

/**
 * 단계 번호·경로 상수는 이 파일을 떠났다.
 *
 * 단계 목록이 재료 고르기에서 고른 카드에서 **계산되므로**, 고정 번호(`STEP`)와 고정
 * 경로 배열(`STEP_PATHS`)이 성립하지 않는다. 카탈로그는 `data/workflowSteps.ts`, 목록 계산과
 * 이동은 `utils/domain/workflowSteps.ts` 에 있다.
 *
 * 이 스토어가 드는 것은 **지금 어디에 있고 무엇을 마쳤는지**(`currentStepId`
 * ·`completedStepIds`)뿐이다.
 */

/** persist 스키마 버전. 저장된 상태의 의미가 바뀔 때만 올린다. */
export const WORKFLOW_PERSIST_VERSION = 13;

/**
 * 구 번호 체계(v4 까지)의 1~6 이 가리켰던 단계.
 *
 * v4→v5 마이그레이션 **전용**이다. 새 코드에서 번호로 단계를 가리키는 곳은 없다.
 *
 * `StepId` 가 아니라 문자열인 이유: 구 5번(`"summary"`)은 v8 에서 폐지돼 지금의 `StepId` 에
 * 없다. 여기서는 그 시절 이름을 그대로 만들고, v7 → v8 단계가 정리한다.
 */
const LEGACY_STEP_IDS: readonly string[] = [
  "upload", // 1
  "metrics", // 2
  "mapping", // 3
  "validation", // 4
  "summary", // 5
  "report", // 6
];

/**
 * 성적서 구성 상태의 기본값. 마이그레이션과 초기 상태가 함께 쓴다.
 *
 * `composerMetrics` 는 v9 에서 생겼다(② 지표 선택 이유·핵심 지표). 그 전에는 ② 카드 값을
 * 담을 그룹이 없어 레지스트리에 정의만 있고 받을 곳이 없었다.
 */
const INITIAL_COMPOSER_STATE = {
  composerCards: DEFAULT_COMPOSER_SELECTION,
  materialPicks: {} as MaterialPicks,
  composerMetrics: {} as ComposerValueMap,
  composerPerspective: {} as ComposerValueMap,
  composerTrainingData: {} as ComposerValueMap,
  composerTestData: {} as ComposerValueMap,
  composerGroundTruth: {} as ComposerValueMap,
  composerModelEnv: {} as ComposerValueMap,
};

/** 분류 유형이 바뀌면 비우는 입력 그룹(카드 선택은 남긴다 — 아래 `setTaskType` 참고). */
const EMPTY_COMPOSER_INPUTS = {
  composerMetrics: {} as ComposerValueMap,
  composerPerspective: {} as ComposerValueMap,
  composerTrainingData: {} as ComposerValueMap,
  composerTestData: {} as ComposerValueMap,
  composerGroundTruth: {} as ComposerValueMap,
  composerModelEnv: {} as ComposerValueMap,
};

/**
 * v8 → v9 — 입력 형태가 바뀐 필드의 옛 값을 새 형태로 옮긴다.
 *
 * v6 → v7 은 선택지가 통째로 바뀌어 비웠지만, 여기는 **같은 답을 다른 그릇에 담는 것**이라
 * 옮길 수 있다. 옮기지 못하는 값(형식이 다른 자유 텍스트)만 버린다 — 틀리게 옮긴 숫자가
 * 성적서에 찍히는 것보다 빈 칸으로 다시 묻는 편이 안전하다.
 */
function migrateComposerShapesV9(next: any): any {
  const training: ComposerValueMap = { ...(next.composerTrainingData ?? {}) };
  const test: ComposerValueMap = { ...(next.composerTestData ?? {}) };
  const groundTruth: ComposerValueMap = { ...(next.composerGroundTruth ?? {}) };

  // ⑥ 편향 감소 노력: 하나 고르기 → 여럿 고르기.
  const imbalance = training.imbalanceHandling;
  if (imbalance?.text) {
    const { text, ...rest } = imbalance;
    training.imbalanceHandling = { ...rest, choices: [text] };
  }

  // ⑥ ⑦ 수집 기간: "YYYY-MM ~ YYYY-MM" 한 줄 → 시작 월·끝 월.
  const toMonthRange = (map: ComposerValueMap, fieldId: string) => {
    const old = map[fieldId];
    if (!old || old.entries || old.text === undefined) return;
    const match = old.text.match(/(\d{4}-\d{2})\s*[~–—-]\s*(\d{4}-\d{2})/);
    if (match) {
      map[fieldId] = {
        entries: [
          { key: "From", value: match[1] },
          { key: "To", value: match[2] },
        ],
      };
    } else {
      delete map[fieldId];
    }
  };
  toMonthRange(training, "trainingPeriod");
  toMonthRange(test, "testPeriod");

  // ⑧ "3명 · 82%" 한 칸 → 라벨러 수·일치도 두 칸. 일치도는 % 앞 숫자, 라벨러 수는 나머지
  // 정수 하나다. 둘 중 하나라도 못 찾으면 그 칸만 비운다.
  const agreement = groundTruth.labelAgreement;
  if (agreement) {
    delete groundTruth.labelAgreement;
    const text = agreement.text ?? "";
    const rate = text.match(/(\d+(?:\.\d+)?)\s*%/);
    const withoutRate = rate ? text.replace(rate[0], "") : text;
    const count = withoutRate.match(/\d+/);
    if (count) groundTruth.labelReviewerCount = { text: count[0] };
    if (rate) groundTruth.labelAgreementRate = { text: rate[1] };
  }

  // Details "Report notes" → ⑥ 학습 데이터 설명. 그 메모가 이미 "학습 데이터 설명"으로
  // 인쇄되고 있었으므로 사용자가 본 성적서와 같은 자리로 옮긴다.
  let datasetInfo = next.datasetInfo;
  if (datasetInfo && "trainingDataDescription" in datasetInfo) {
    const { trainingDataDescription, ...restInfo } = datasetInfo;
    datasetInfo = restInfo;
    const memo = typeof trainingDataDescription === "string" ? trainingDataDescription.trim() : "";
    if (memo && !training.trainingDescription?.text) {
      training.trainingDescription = { text: trainingDataDescription };
    }
  }

  return {
    ...next,
    ...(datasetInfo ? { datasetInfo } : {}),
    composerMetrics: next.composerMetrics ?? {},
    composerTrainingData: training,
    composerTestData: test,
    composerGroundTruth: groundTruth,
  };
}

/**
 * v9 → v10 — Details 의 학습 데이터 폼(`datasetInfo`)을 ⑥ 카드로 합쳤다.
 *
 * 같은 값을 두 화면에서 받던 것을 하나로 줄였다(docs/WORKFLOW_REDESIGN.md §10.6). 폼에 적은
 * 값을 ⑥ 의 같은 칸으로 옮기고 `datasetInfo` 는 지운다. ⑥ 에 이미 값이 있으면 덮지 않는다 —
 * 카드 값이 나중에 생긴 쪽이다.
 *
 * 클래스 분포는 옮기지 않는다. 폼은 한 줄 자유 텍스트였고 ⑥ 은 클래스마다 칸이 따로 있어,
 * 글을 쪼개 칸에 넣으면 틀릴 수 있다. 카드를 켜는 것도 사용자의 결정이라 건드리지 않는다.
 */
function migrateTrainingDataV10(next: any): any {
  const { datasetInfo, ...rest } = next;
  if (!datasetInfo || typeof datasetInfo !== "object") return rest;

  const training: ComposerValueMap = { ...(rest.composerTrainingData ?? {}) };
  const textOf = (key: string) =>
    typeof datasetInfo[key] === "string" ? datasetInfo[key].trim() : "";
  const isEmpty = (fieldId: string) => {
    const value = training[fieldId];
    return !value || (!value.unknown && !value.text && !(value.entries?.length));
  };

  const name = textOf("trainingDatasetName");
  if (name && isEmpty("trainingDatasetName")) training.trainingDatasetName = { text: name };

  const format = textOf("trainingDataFormat");
  if (format && isEmpty("trainingDataFormat")) training.trainingDataFormat = { text: format };

  const trainingCount = textOf("trainingSampleCount");
  const validationCount = textOf("validationSampleCount");
  if ((trainingCount || validationCount) && isEmpty("trainingVolume")) {
    training.trainingVolume = {
      entries: [
        { key: "Training", value: trainingCount },
        { key: "Validation", value: validationCount },
      ],
    };
  }

  return { ...rest, composerTrainingData: training };
}

/** 옛 ⑦ 전처리 선택지 → 새 "학습과 같은 전처리인가" 선택지. "None"(전처리 없음)은 짝이 없다. */
const LEGACY_PREPROCESSING_CHOICE: Record<string, string> = {
  "Same as training": "Same",
  "Different from training": "Different",
};

/**
 * v10 → v11 — 문서에서 정할 것으로 남았던 항목을 정했다(2026-10-14, 서술 설계 D41~D44).
 *
 * - 전처리 자유서술 세 칸(⑥ 전처리, ⑦ 전처리·전처리 내용)을 ⑦ "학습과 같은 전처리인가" 한 칸으로
 *   합쳤다. 고른 답은 짝이 있으면 옮기고, 적어 둔 글은 버리지 않고 덧붙이는 글로 옮긴다.
 * - ⑧ 라벨 일치도는 종류를 먼저 받는다. 옛 값은 % 로 받던 칸이라 "단순 일치율"로 옮긴다.
 * - 성적서 용도에 덧붙이는 글(`basicInfo.reportPurposeNote`)이 생겼다. 얕은 merge 라 옛 저장분의
 *   `basicInfo` 에는 이 키가 없으므로 채운다.
 */
function migrateDecisionsV11(next: any): any {
  const training: ComposerValueMap = { ...(next.composerTrainingData ?? {}) };
  const test: ComposerValueMap = { ...(next.composerTestData ?? {}) };
  const groundTruth: ComposerValueMap = { ...(next.composerGroundTruth ?? {}) };

  const oldChoice = test.testPreprocessing;
  const notes = [
    training.preprocessing?.text?.trim() ? "Training: " + training.preprocessing.text.trim() : "",
    oldChoice?.text === "None" ? "Test: no preprocessing" : "",
    test.testPreprocessingDetail?.text?.trim()
      ? "Test: " + test.testPreprocessingDetail.text.trim()
      : "",
  ].filter(Boolean);
  const choice = oldChoice?.unknown
    ? "Unknown"
    : LEGACY_PREPROCESSING_CHOICE[oldChoice?.text ?? ""];
  if ((choice || notes.length > 0) && !test.preprocessingMatch) {
    test.preprocessingMatch = {
      ...(choice ? { text: choice } : {}),
      ...(notes.length > 0 ? { note: notes.join(" / ") } : {}),
    };
  }
  delete training.preprocessing;
  delete test.testPreprocessing;
  delete test.testPreprocessingDetail;

  const oldRate = groundTruth.labelAgreementRate;
  if (oldRate) {
    delete groundTruth.labelAgreementRate;
    if (oldRate.text?.trim()) {
      groundTruth.labelAgreementKind = { text: "Percent agreement" };
      groundTruth.labelAgreementValue = { text: oldRate.text.trim() };
    }
  }

  const basicInfo =
    next.basicInfo && typeof next.basicInfo === "object"
      ? { reportPurposeNote: "", ...next.basicInfo }
      : next.basicInfo;

  return {
    ...next,
    ...(basicInfo ? { basicInfo } : {}),
    composerTrainingData: training,
    composerTestData: test,
    composerGroundTruth: groundTruth,
  };
}

/** 값이 하나라도 들어 있는지. 마이그레이션이 "이미 적은 선택 항목"을 체크해 둘 때 쓴다. */
function hasAnyValue(value: ComposerFieldValue | undefined): boolean {
  if (!value) return false;
  return Boolean(
    value.unknown ||
      value.text?.trim() ||
      value.note?.trim() ||
      value.otherText?.trim() ||
      value.choices?.length ||
      value.entries?.some((entry) => entry.value?.trim()),
  );
}

/**
 * v11 → v12 — 재료 고르기(docs/MATERIAL_PICKER.md §7). 카드마다 무엇을 받을지 저장한 체크
 * (`materialPicks`)가 생겼다.
 *
 * 이미 진행 중인 사용자를 재료 고르기에서 다시 막지 않도록 **지금 상태를 저장된 것으로 옮긴다.**
 * - 필수 카드는 모두 저장된 것으로 본다. 이미 값을 적은 선택 항목을 체크한다.
 * - 켜져 있던 선택 카드는 저장된 것으로 보고 권장 항목을 모두 체크한다 — 종전 규칙("카드를 켜면
 *   표준 보고 항목은 모두 입력")과 같은 뜻이다. 이미 값을 적은 선택 항목도 체크한다.
 * - 꺼져 있던 선택 카드는 저장하지 않은 것으로 둔다.
 */
function migrateMaterialPicksV12(next: any): any {
  const cards: ComposerSelection = { ...DEFAULT_COMPOSER_SELECTION, ...(next.composerCards ?? {}) };
  const groups: Partial<Record<ComposerCardId, ComposerValueMap | undefined>> = {
    metrics: next.composerMetrics,
    perspective: next.composerPerspective,
    trainingData: next.composerTrainingData,
    testData: next.composerTestData,
    groundTruth: next.composerGroundTruth,
    modelEnv: next.composerModelEnv,
  };
  // ③ 의 선택 항목은 아직 카드 그룹이 아니라 기존 폼(`basicInfo`)에 적힌다.
  const basicInfo = next.basicInfo ?? {};
  const filledInBasicInfo: Record<string, boolean> = {
    "contactExtra:website": Boolean(basicInfo.website?.trim?.()),
    "contactExtra:fax": Boolean(basicInfo.fax?.trim?.()),
    projectNumber: Boolean(basicInfo.projectNumber?.trim?.()),
  };

  const picks: MaterialPicks = {};
  for (const card of COMPOSER_CARDS) {
    if (!card.locked && !cards[card.id as OptionalCardId]) continue;
    const values = groups[card.id] ?? {};
    picks[card.id] = pickableIds(card.id, next.taskType ?? "").filter((id) => {
      const field = card.fields.find((item) => item.id === id.split(":")[0]);
      if (!field) return false;
      if (pickKind(card, field) === "recommended") return true;
      return filledInBasicInfo[id] ?? hasAnyValue(values[field.id]);
    });
  }
  return { ...next, materialPicks: picks };
}

/**
 * v12 → v13 — 학습·평가 전처리 일치(`preprocessingMatch`)가 ⑦ 테스트 데이터에서 ⑥ 학습 데이터 카드로
 * 옮겨 갔다. 적어 둔 값과 재료 고르기의 체크를 함께 옮긴다. ⑥ 에 이미 값이 있으면 그것을 둔다.
 * ⑦ 에 그 체크만 있었다면 ⑦ 은 고른 항목이 없어져 빠진다(선택 카드는 항목이 있어야 들어간다).
 *
 * ⑦ 에서 이 항목을 썼다는 신호가 있으면 ⑥ 에 체크하고 ⑥ 카드를 켠다 — 카드를 옮긴 것은 우리이고
 * 사용자는 이 항목을 고른 것이므로, 옮긴 뒤에도 입력이 보여야 한다(DESIGN_GAPS R2).
 * - v12 저장분: ⑦ 의 체크(`materialPicks.testData`)가 신호다. ⑥ 을 저장하지 않았거나 "넣지 않음"(`[]`)
 *   으로 저장했어도 따른다.
 * - v11 이하 저장분: v12 단계가 **지금** 레지스트리로 체크를 만들어 ⑦ 에는 이 항목이 없고, ⑥ 은 값이
 *   아직 ⑦ 에 있어 체크되지 않는다. 그래서 "⑦ 카드가 켜져 있었고 값이 있었는지"가 신호다(v12 시절
 *   선택 항목은 값이 있으면 체크된다는 규칙과 같다).
 */
function migratePreprocessingV13(next: any, fromVersion: number): any {
  const test: ComposerValueMap = { ...(next.composerTestData ?? {}) };
  const training: ComposerValueMap = { ...(next.composerTrainingData ?? {}) };
  const moved = test.preprocessingMatch;
  if (moved !== undefined) {
    if (training.preprocessingMatch === undefined) training.preprocessingMatch = moved;
    delete test.preprocessingMatch;
  }

  const picks: MaterialPicks = { ...(next.materialPicks ?? {}) };
  const cards: ComposerSelection = { ...DEFAULT_COMPOSER_SELECTION, ...(next.composerCards ?? {}) };
  const pickedIn7 = picks.testData?.includes("preprocessingMatch") ?? false;
  const usedIn7 = fromVersion < 12 && cards.testData && hasAnyValue(moved);
  let changed = false;
  if (pickedIn7) {
    picks.testData = (picks.testData ?? []).filter((id) => id !== "preprocessingMatch");
    cards.testData = picks.testData.length > 0;
    changed = true;
  }
  if (pickedIn7 || usedIn7) {
    const trainingPicks = picks.trainingData ?? [];
    if (!trainingPicks.includes("preprocessingMatch")) {
      picks.trainingData = [...trainingPicks, "preprocessingMatch"];
    }
    cards.trainingData = true;
    changed = true;
  }

  return {
    ...next,
    composerTestData: test,
    composerTrainingData: training,
    ...(next.materialPicks || changed ? { materialPicks: picks } : {}),
    ...(next.composerCards || changed ? { composerCards: cards } : {}),
  };
}

/**
 * 저장된 워크플로우 상태를 현재 규칙으로 옮긴다(순수 함수 — 테스트가 직접 호출한다).
 *
 * **v1 → v2**: multilabel 에서 M1·M11·M12·M13 이 제거됐다(ISSUES.md A-04, 결정 2).
 * 저장된 `selectedMetricIds` 에서 현재 task_type 이 노출하지 않는 지표를 걸러낸다.
 * 지표 ID 를 하드코딩하지 않고 METRICS 에서 유도하므로 노출 목록이 또 바뀌어도 그대로 둔다.
 *
 * **v2 → v3**: 단계 순서가 통째로 바뀌었다.
 *   구: 기본정보 → 지표 → 지표상세 → 업로드 → 매핑 → 검증 → 성적서
 *   신: 업로드 → 매핑 → 지표 → 검증 → 평가결과  (기관정보·목표값은 성적서 구간으로)
 *
 * 저장된 `completedSteps`·`currentStep` 은 **구 번호 체계의 숫자**다. 새 번호로 1:1
 * 대응시킬 방법이 없다 — 구 1(기본정보)·3(지표상세)은 평가 구간에서 사라졌고, 남은 것도
 * 순서가 뒤집혀 대응표가 구멍 난 집합(예: `[1, 3]`)을 만든다. 그 상태로 진입 가드
 * (`canEnterStep`)를 통과시키면 빈 화면에 갇힌다.
 *
 * 그래서 **진행 표시만 초기화하고 입력 데이터는 전부 보존한다.** 어차피 원본 파일은
 * persist 대상이 아니라 재수화 후 재업로드가 필요하므로(`onRehydrateStorage`),
 * 1단계부터 다시 밟는 것이 실제 상태와도 맞다.
 *
 * **v3 → v4**: 성적서 구성 화면이 생겼다(docs/COMPOSER_COMPONENTS.md). 선택 카드의
 * 켜짐/꺼짐(`composerCards`)과 새 입력 그룹 다섯 개가 상태에 추가됐다. 여기서는 **버릴 것이
 * 없다** — 기존 키의 뜻이 하나도 바뀌지 않았고 새 키만 생겼으므로, 기본값으로 채우기만 한다.
 * 채우지 않으면 얕은 merge 때문에 `undefined` 로 남는다(아래 주석 참고).
 *
 * **v4 → v5**: 단계 목록이 카드 선택에서 계산되기 시작했다. 진행 표시를 번호
 * (`completedSteps`·`currentStep`)에서 이름(`completedStepIds`·`currentStepId`)으로 옮긴다.
 * v2 → v3 과 달리 **1:1 대응이 성립해 진행을 버리지 않는다** — 구 1~6 이 가리켰던 단계가
 * 새 체계에 그대로 있고 순서도 같다(`LEGACY_STEP_IDS`).
 *
 * **v5 → v6**: 평가 관점이 단계에서 빠져 지표 선택 화면 안으로 들어갔다. 저장된 진행
 * 표시에 남은 `"perspective"` 는 이제 아무 단계도 가리키지 않는다 — 그대로 두면 진입
 * 가드가 목록에 없는 id 를 만나고, 현재 위치라면 갈 곳이 없다. 완료 목록에서는 지우고,
 * 현재 위치면 흡수한 단계(`metrics`)로 옮긴다. 입력값(`composerPerspective`)은 그대로
 * 살아 있다 — 받는 질문이 같고 화면만 바뀌었기 때문이다.
 *
 * **v6 → v7**: ⑥ ⑦ ⑧ ⑨ 의 선택지와 칸 이름이 영어가 됐다. 이 둘은 레지스트리가 그릴 때
 * 쓰는 라벨이면서 **저장되는 값 자체**다("알려진 것 없음" 이 값으로 들어 있다). 그대로 두면
 * 저장된 값이 어느 선택지와도 맞지 않아 라디오가 전부 빈 채로 열리고, 필수 점검은 통과하는
 * 모순이 생긴다. 네 입력 그룹을 비운다 — ⑤ 는 선택지가 이미 영어였으므로 남긴다.
 *
 * **v7 → v8**: 평가 결과(`"summary"`) 단계가 폐지되고 Details 가 선택 카드 단계 앞으로
 * 왔다(docs/WORKFLOW_REDESIGN.md §11). 완료 목록에서 `"summary"` 를 지우고, 현재 위치면
 * 검증 다음 단계인 Details(`clientInfo`)로 옮긴다. 순서가 바뀐 나머지 단계는 이름이 그대로라
 * 손대지 않는다 — 진입 가드가 처음 미완료 단계로 보낸다.
 *
 * **v8 → v9**: 입력 화면을 재료 목록에 맞췄다. ② 카드 값 그룹(`composerMetrics`)이 생겼고,
 * 형태가 바뀐 필드(⑥ 편향 감소 노력·수집 기간, ⑦ 수집 기간, ⑧ 라벨러 수·일치도)의 옛 값을
 * 새 형태로 옮긴다. Details 의 "Report notes" 칸이 없어져, 거기 적힌 메모는 ⑥ 학습 데이터
 * 설명으로 간다(`migrateComposerShapesV9`).
 *
 * **v9 → v10**: Details 의 학습 데이터 폼을 없애고 ⑥ 카드 하나로 받는다. 폼에 적은 이름·건수·
 * 형식을 ⑥ 으로 옮기고 `datasetInfo` 를 지운다(`migrateTrainingDataV10`).
 *
 * **v10 → v11**: 전처리 세 칸을 ⑦ 한 칸으로, ⑧ 라벨 일치도를 종류 + 값으로 바꾸고, 성적서 용도에
 * 덧붙이는 글을 더했다(`migrateDecisionsV11`).
 *
 * **v11 → v12**: 성적서 구성 화면이 재료 고르기가 됐다. 카드마다 저장한 체크(`materialPicks`)를
 * 지금 상태에서 만든다(`migrateMaterialPicksV12`).
 */
export function migrateWorkflowState(persisted: any, version: number): any {
  if (!persisted || version >= WORKFLOW_PERSIST_VERSION) return persisted;

  let next = persisted;

  // v1 → v2
  if (version < 2) {
    const taskType = next.taskType;
    const selected = next.selectedMetricIds;
    if (taskType && Array.isArray(selected)) {
      const exposed = new Set(getAvailableMetrics(taskType).map((m) => m.id));
      next = { ...next, selectedMetricIds: selected.filter((id: string) => exposed.has(id)) };
    }
  }

  // v2 → v3 — 단계 번호 체계 교체. 진행 표시만 버리고 입력은 남긴다.
  // 숫자 1 은 **구 번호 체계의 업로드**다. 아래 v4 → v5 가 이것을 id 로 옮긴다.
  if (version < 3) {
    next = { ...next, completedSteps: [], currentStep: 1 };
  }

  // v3 → v4 — 성적서 구성 화면이 생겼다. 카드 선택과 새 입력 그룹 여섯 키를 채운다.
  //
  // 기본값을 **여기서** 넣는 이유: zustand 의 merge 는 얕아서, 옛 저장분에 없는 키는
  // 초기 상태의 값으로 채워지지 않고 `undefined` 로 남는다. 그 상태로 화면이 열리면
  // 체크박스가 `undefined` 를 읽어 선택 카드가 하나도 안 켜진 것처럼 보인다.
  // v1 → v2 와 같은 방식으로 저장분을 직접 패치한다.
  if (version < 4) {
    next = { ...next, ...INITIAL_COMPOSER_STATE };
  }

  // v4 → v5 — 진행 표시를 번호에서 이름으로 옮긴다.
  //
  // v2 → v3 과 달리 **1:1 대응이 성립한다.** 구 1~6 이 가리켰던 단계가 새 체계에도 그대로
  // 있고 순서도 같다(사이에 평가 관점이 끼어들었을 뿐이다). 그래서 진행을 버리지 않고
  // 옮긴다 — 다 걸어온 사용자를 다시 1단계로 돌려보낼 이유가 없다.
  //
  // 새로 생긴 단계(평가 관점·데이터 정보·모델과 환경·의뢰자 정보)는 미완료로 남는다.
  // 가드가 사용자를 처음 미완료 단계로 보내는데, 그 입력을 실제로 받아야 하므로 **옳은
  // 동작**이다.
  if (version < 5) {
    const legacyCompleted: unknown = next.completedSteps;
    const completedStepIds = (Array.isArray(legacyCompleted) ? legacyCompleted : [])
      .map((step: unknown) => LEGACY_STEP_IDS[Number(step) - 1])
      .filter((id): id is string => Boolean(id));

    const currentStepId = LEGACY_STEP_IDS[Number(next.currentStep) - 1] ?? "upload";

    const { completedSteps, currentStep, ...rest } = next;
    void completedSteps;
    void currentStep;
    next = { ...rest, completedStepIds, currentStepId };
  }

  // v5 → v6 — 평가 관점이 단계에서 빠지고 지표 선택 화면 안으로 들어갔다.
  if (version < 6) {
    const completed: unknown = next.completedStepIds;
    next = {
      ...next,
      completedStepIds: (Array.isArray(completed) ? completed : []).filter(
        (id: unknown) => id !== "perspective",
      ),
      currentStepId: next.currentStepId === "perspective" ? "metrics" : next.currentStepId,
    };
  }

  // v6 → v7 — ⑥ ⑦ ⑧ ⑨ 의 선택지·칸 이름이 영어로 바뀌었다. 옛 한국어 값은 새 선택지와
  // 짝지을 수 없으므로(한 글자씩 대응표를 만들면 선택지를 고칠 때마다 또 틀린다) 비운다.
  if (version < 7) {
    next = {
      ...next,
      composerTrainingData: {},
      composerTestData: {},
      composerGroundTruth: {},
      composerModelEnv: {},
    };
  }

  // v7 → v8 — 평가 결과 단계가 폐지됐다.
  if (version < 8) {
    const completed: unknown = next.completedStepIds;
    next = {
      ...next,
      completedStepIds: (Array.isArray(completed) ? completed : []).filter(
        (id: unknown) => id !== "summary",
      ),
      currentStepId: next.currentStepId === "summary" ? "clientInfo" : next.currentStepId,
    };
  }

  // v8 → v9 — 입력 형태 변경. 옛 값을 새 그릇으로 옮긴다.
  if (version < 9) {
    next = migrateComposerShapesV9(next);
  }

  // v9 → v10 — Details 의 학습 데이터 폼을 ⑥ 카드로 합쳤다.
  if (version < 10) {
    next = migrateTrainingDataV10(next);
  }

  // v10 → v11 — 전처리 한 칸, 라벨 일치도 종류, 성적서 용도 덧붙이는 글.
  if (version < 11) {
    next = migrateDecisionsV11(next);
  }

  // v11 → v12 — 재료 고르기. 지금 상태를 저장된 체크로 옮긴다.
  if (version < 12) {
    next = migrateMaterialPicksV12(next);
  }

  // v12 → v13 — 전처리 일치를 ⑦ 에서 ⑥ 으로.
  if (version < 13) {
    next = migratePreprocessingV13(next, version);
  }

  return next;
}

interface WorkflowState {
  /**
   * 지금 있는 단계와 마친 단계. **번호가 아니라 이름이다.**
   *
   * 걸을 단계 목록은 `composerCards` 에서 계산되므로 번호의 뜻이 선택에 따라 달라진다.
   * 저장소를 왕복하는 값이 그런 번호면 카드를 토글할 때마다 진행 표시가 조용히 어긋난다
   * (docs/WORKFLOW_REDESIGN.md §3.3 이 경고한 상황). 화면에 보일 번호는 목록 위치에서
   * 그때그때 만든다(`stepNumberOf`).
   */
  currentStepId: StepId;
  completedStepIds: StepId[];

  // Step 1 — Basic info
  basicInfo: BasicInfoFormData;
  taskType: TaskType | "";

  // Step 2 — Metric selection
  selectedMetricIds: string[];

  // Step 3 — Metric details
  metricDetails: MetricDetailStateMap;

  // Step 4 — Evaluation file
  uploadedFile: UploadedFileInfo | null;
  rawFile: File | null;
  metadata: any | null;
  /** ⑥ 학습 데이터의 예시 파일. ⑥ 을 넣었을 때 데이터 정보 단계에서 받는다. */
  trainingExampleFiles: UploadedFileInfo[];
  trainingUnsuitableExampleFiles: UploadedFileInfo[];

  /**
   * 결정 임계값 — 하드 예측이 없을 때 확률에서 예측을 파생하는 기준(ISSUES.md A-01).
   *
   * **성적서 합격 목표값(`metricDetails[id].targetValue`)과 다른 개념이다.**
   * 백엔드 계약 필드명도 `decision_threshold` 로 분리돼 있다.
   * 스칼라면 전 확률 컬럼 공통, 객체면 컬럼명별 값(multilabel 레이블별 임계값).
   * null 이면 백엔드가 SPEC §6 의 기본값 0.5 를 쓴다.
   */
  decisionThreshold: number | Record<string, number> | null;

  /**
   * 백엔드가 '사용자 안내용'으로 내려보낸 값들(ISSUES.md B-03·B-04·D-16·A-12).
   * 각각 평가 데이터·매핑 단계에서 도착하지만 **검증 단계 상단에 합쳐서** 보여준다 —
   * 매핑 단계는 안내가 도착하는 순간 이미 다음 화면으로 넘어가 있다.
   */
  columnNotes: ColumnNote[];
  mappingWarnings: MappingWarning[];
  /**
   * confirm-mapping 이 계산 가능하다고 답한 지표 ID(A-12). 지표 화면이 계산할 수 없는 지표를
   * 비활성으로 둘 때 정본으로 쓴다(docs/MATERIAL_PICKER.md §3, `metricAvailability`). 매핑을
   * 바꾸면 비운다 — 그 뒤의 답이 아니기 때문이다.
   */
  availableMetricIds: string[] | null;

  // Step 5 — Column mapping
  columnMapping: MappingRow[];
  // Step 5 — Class label descriptions (class value -> description)
  classLabelDescriptions: Record<string, string>;

  // Step 6 — Data validation result (백엔드 /api/validate-data 응답, 리포트에서 재사용)
  validationResult: ValidateDataResponseData | null;

  /**
   * 저장소에서 재수화해, 입력은 있는데 원본 파일이 없는 상태.
   * 파일은 어떤 경우에도 복원할 수 없으므로 재업로드를 유도해야 한다(ISSUES.md E-01).
   */
  needsFileReupload: boolean;

  /** 가장 최근에 만든 평가 run 의 id. 성적서로 되돌아가는 경로에 쓴다(ISSUES.md E-16). */
  lastRunId: string | null;

  /**
   * 재료 선택 점검의 생성 전 안내를 보고도 진행한 기록(재료 선택 점검 6절). 검증 화면의 "다음"이
   * 남기고, 성적서 6.0 이 "확인 후 진행"으로 찍는다(`checkMaterialSelection` 이 인정 여부를 정함).
   *
   * 최상위 새 키라 persist 판(13)을 올리지 않는다 — 옛 저장분에는 없고, 얕은 병합으로 초기값
   * null 이 남는다. 작업 유형을 바꾸면 비운다.
   */
  materialCheckAck: MaterialCheckAck | null;

  /**
   * 선택 카드(⑥~⑨)가 성적서에 들어가는지.
   *
   * 필수 카드(①~⑤)는 늘 들어가 상태로 들지 않는다. 이 값이 **걸을 단계 목록을 정한다**
   * (`utils/domain/workflowSteps.ts` 의 `buildStepList`). 재료 고르기에서 선택 카드를 저장할 때
   * 함께 맞춘다(`saveMaterialPick`) — 항목을 하나 이상 골라 저장하면 켜진다.
   */
  composerCards: ComposerSelection;

  /**
   * 재료 고르기에서 카드마다 저장한 체크(docs/MATERIAL_PICKER.md §7). 키가 없으면 그 카드를
   * 저장하지 않은 것이다. 저장하지 않은 체크는 화면에만 있고 여기 들지 않는다.
   */
  materialPicks: MaterialPicks;

  /**
   * 카드별 입력값. 키는 재료 레지스트리의 `field.id` 다(`data/reportComposer.ts`).
   *
   * **대부분 저장까지만 한다** — 백엔드로 보내거나 성적서에 인쇄하지 않는다.
   * ⑨ 실행 환경은 기존 `basicInfo.env*` 와 내용이 겹치는데, 그쪽은 지금도 성적서를 그리는 데
   * 쓰이므로 건드리지 않았다. 중복 정리는 별도 작업이다.
   *
   * 예외 둘: ② 핵심 지표는 판정에 쓰이고(`resolveCoreMetricIds`), ⑥ 학습 데이터는 성적서
   * 학습 데이터 절이 직접 읽는다(`buildTrainingDatasetInfo`). ⑥ 은 Details 의 학습 데이터 폼을
   * 흡수해 유일한 입력처다(persist v10).
   */
  composerMetrics: ComposerValueMap;
  composerPerspective: ComposerValueMap;
  composerTrainingData: ComposerValueMap;
  composerTestData: ComposerValueMap;
  composerGroundTruth: ComposerValueMap;
  composerModelEnv: ComposerValueMap;

  // Actions — Navigation
  setCurrentStepId: (id: StepId) => void;
  markStepIdCompleted: (id: StepId) => void;

  // Actions — Step 1
  setBasicInfo: (
    value: BasicInfoFormData | ((prev: BasicInfoFormData) => BasicInfoFormData),
  ) => void;
  setTaskType: (type: TaskType | "") => void;

  // Actions — Step 2
  setSelectedMetricIds: (ids: string[]) => void;

  // Actions — Step 3
  setMetricDetails: (
    value: MetricDetailStateMap | ((prev: MetricDetailStateMap) => MetricDetailStateMap),
  ) => void;

  // Actions — Step 4
  setUploadedFile: (file: UploadedFileInfo | null, rawFile?: File) => void;
  setRawFile: (file: File | null) => void;
  setMetadata: (metadata: any | null) => void;
  setDecisionThreshold: (value: number | Record<string, number> | null) => void;
  setColumnNotes: (notes: ColumnNote[]) => void;
  setMappingFeedback: (input: { warnings: MappingWarning[]; availableMetricIds: string[] | null }) => void;
  setTrainingExampleFiles: (
    value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[]),
  ) => void;
  setTrainingUnsuitableExampleFiles: (
    value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[]),
  ) => void;

  // Actions — Step 5
  setColumnMapping: (
    value: MappingRow[] | ((prev: MappingRow[]) => MappingRow[]),
  ) => void;
  setClassLabelDescriptions: (
    value:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;

  // Actions — Step 6
  setValidationResult: (result: ValidateDataResponseData | null) => void;
  setLastRunId: (runId: string | null) => void;
  setMaterialCheckAck: (ack: MaterialCheckAck | null) => void;

  // Actions — 재료 고르기
  /**
   * 카드 하나의 체크를 저장한다. 선택 카드면 항목이 하나 이상일 때 켜고, 비어 있으면 끈다 —
   * 아무것도 고르지 않고 저장한 선택 카드는 "넣지 않기로 확정"이다(§7).
   */
  saveMaterialPick: (cardId: ComposerCardId, ids: string[]) => void;
  setComposerMetrics: (
    value: ComposerValueMap | ((prev: ComposerValueMap) => ComposerValueMap),
  ) => void;
  setComposerPerspective: (
    value: ComposerValueMap | ((prev: ComposerValueMap) => ComposerValueMap),
  ) => void;
  setComposerTrainingData: (
    value: ComposerValueMap | ((prev: ComposerValueMap) => ComposerValueMap),
  ) => void;
  setComposerTestData: (
    value: ComposerValueMap | ((prev: ComposerValueMap) => ComposerValueMap),
  ) => void;
  setComposerGroundTruth: (
    value: ComposerValueMap | ((prev: ComposerValueMap) => ComposerValueMap),
  ) => void;
  setComposerModelEnv: (
    value: ComposerValueMap | ((prev: ComposerValueMap) => ComposerValueMap),
  ) => void;

  // Reset
  resetWorkflow: () => void;
}

const INITIAL_STATE = {
  currentStepId: "clientInfo" as StepId,
  completedStepIds: [] as StepId[],
  basicInfo: DEFAULT_BASIC_INFO,
  taskType: "" as TaskType | "",
  selectedMetricIds: [] as string[],
  metricDetails: {} as MetricDetailStateMap,
  uploadedFile: null as UploadedFileInfo | null,
  rawFile: null as File | null,
  metadata: null as any | null,
  trainingExampleFiles: [] as UploadedFileInfo[],
  trainingUnsuitableExampleFiles: [] as UploadedFileInfo[],
  columnNotes: [] as ColumnNote[],
  mappingWarnings: [] as MappingWarning[],
  availableMetricIds: null as string[] | null,
  decisionThreshold: null as number | Record<string, number> | null,
  columnMapping: [] as MappingRow[],
  classLabelDescriptions: {} as Record<string, string>,
  validationResult: null as ValidateDataResponseData | null,
  needsFileReupload: false,
  lastRunId: null as string | null,
  materialCheckAck: null as MaterialCheckAck | null,
  ...INITIAL_COMPOSER_STATE,
};

/** persist 저장소 키. 테스트와 운영이 같은 값을 보도록 export 한다. */
export const WORKFLOW_STORAGE_KEY = "ml-evaluation-workflow";

/**
 * 시연 모드(?showcase=1) 여부.
 *
 * showcase 는 `seedShowcaseData` 로 **실제 store 에 가짜 기업정보·사업자등록번호를 주입**하고,
 * WorkflowShell 이 라우팅마다 그것을 다시 실행한다(ISSUES.md E-05). persist 를 그대로 붙이면
 * 그 가짜 데이터가 사용자의 실제 작업 위에 영속된다.
 * 그래서 시연 중에는 저장소를 **읽지도 쓰지도 않는다** — 시연이 실제 작업을 덮지 않고,
 * 실제 작업이 시연 화면에 새어 나오지도 않는다.
 */
function isShowcaseMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("showcase") === "1";
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      // Navigation
      setCurrentStepId: (id) => set({ currentStepId: id }),

      markStepIdCompleted: (id) =>
        set((state) => ({
          completedStepIds: [...new Set([...state.completedStepIds, id])],
        })),

      // Step 1
      setBasicInfo: (value) =>
        set((state) => ({
          basicInfo:
            typeof value === "function" ? value(state.basicInfo) : value,
        })),

      setTaskType: (type) =>
        set({
          taskType: type,
          selectedMetricIds: [],
          metricDetails: {},
          uploadedFile: null,
          rawFile: null,
          metadata: null,
          trainingExampleFiles: [],
          trainingUnsuitableExampleFiles: [],
          decisionThreshold: null,
          columnNotes: [],
          mappingWarnings: [],
          availableMetricIds: null,
          columnMapping: [],
          classLabelDescriptions: {},
          validationResult: null,
          // 작업 유형이 바뀌면 뒤 단계의 근거가 전부 사라진다. 완료 표시와 데이터셋 정보를
          // 남겨두면 (a) 빈 상태로 뒤 단계에 점프할 수 있고 (b) 이전 평가의 표본 수가 새
          // 성적서에 인쇄된다(ISSUES.md E-08). persist 도입 전에는 새로고침이 사실상
          // 초기화 역할을 해서 세션 안에 갇혀 있던 오염이다. 학습 데이터 정보는 이제 ⑥ 카드
          // 값이라 아래 `EMPTY_COMPOSER_INPUTS` 가 함께 비운다.
          completedStepIds: [],
          needsFileReupload: false,
          // 진행 기록은 그때의 경고에 대한 것이다. 유형이 바뀌면 점검 줄 자체가 달라진다.
          materialCheckAck: null,
          // basicInfo 는 유지한다 — 작업 유형만 바꿨는데 1단계 입력까지 날아가면 안 된다.
          /**
           * 성적서 구성의 **입력값은 비우고 카드 선택은 남긴다.**
           *
           * 입력값을 비우는 이유: ⑤ 평가 관점은 유형마다 묻는 질문이 다르고(이진은 중요 오류
           * 유형, 그 외는 클래스 중요도), ⑥ 클래스별 데이터 양은 업로드한 클래스 목록에
           * 매여 있다. ② 핵심 지표는 고른 지표 중에서 고르는데 지표 선택이 위에서 비워지고,
           * 지표 선택 이유는 멀티레이블에서만 묻는다. 유형이 바뀌면 모두 근거가 사라진다.
           *
           * 카드 선택을 남기는 이유: "어떤 정보를 성적서에 넣을지"는 분류 유형과 무관한
           * 결정이고, 9개 카드 모두 전 유형에 적용된다. 어차피 유형을 바꾸면 재료 고르기를
           * 다시 지나가므로 거기서 고칠 수 있다.
           */
          ...EMPTY_COMPOSER_INPUTS,
        }),

      // Step 2
      setSelectedMetricIds: (ids) => set({ selectedMetricIds: ids }),

      // Step 3
      setMetricDetails: (value) =>
        set((state) => ({
          metricDetails:
            typeof value === "function" ? value(state.metricDetails) : value,
        })),

      // Step 4
      setUploadedFile: (file, rawFile) =>
        // 원본 파일이 함께 들어오면 '재업로드 필요' 상태가 해소된다.
        set({ uploadedFile: file, rawFile: rawFile || null, needsFileReupload: false }),
      setRawFile: (file) => set({ rawFile: file }),
      setMetadata: (metadata) => set({ metadata: metadata }),
      setDecisionThreshold: (value) => set({ decisionThreshold: value }),
      setColumnNotes: (notes) => set({ columnNotes: notes }),
      setMappingFeedback: ({ warnings, availableMetricIds }) =>
        set({ mappingWarnings: warnings, availableMetricIds }),

      setTrainingExampleFiles: (value) =>
        set((state) => ({
          trainingExampleFiles:
            typeof value === "function" ? value(state.trainingExampleFiles) : value,
        })),

      setTrainingUnsuitableExampleFiles: (value) =>
        set((state) => ({
          trainingUnsuitableExampleFiles:
            typeof value === "function" ? value(state.trainingUnsuitableExampleFiles) : value,
        })),

      // Step 5
      setColumnMapping: (value) =>
        set((state) => {
          const next = typeof value === "function" ? value(state.columnMapping) : value;
          // 매핑이 바뀌면 확정 응답의 가용 지표는 이 매핑의 답이 아니다. 지표 화면이 낡은 답으로
          // 지표를 막거나 열지 않도록 비운다 — 그때는 지금 매핑으로 다시 계산한다.
          return next === state.columnMapping ? {} : { columnMapping: next, availableMetricIds: null };
        }),

      setClassLabelDescriptions: (value) =>
        set((state) => ({
          classLabelDescriptions:
            typeof value === "function"
              ? value(state.classLabelDescriptions)
              : value,
        })),

      // Step 6
      setValidationResult: (result) => set({ validationResult: result }),

      setLastRunId: (runId) => set({ lastRunId: runId }),
      setMaterialCheckAck: (ack) => set({ materialCheckAck: ack }),

      // 재료 고르기
      saveMaterialPick: (cardId, ids) =>
        set((state) => ({
          materialPicks: { ...state.materialPicks, [cardId]: ids },
          ...((OPTIONAL_CARD_IDS as string[]).includes(cardId)
            ? { composerCards: { ...state.composerCards, [cardId]: ids.length > 0 } }
            : {}),
        })),

      setComposerMetrics: (value) =>
        set((state) => ({
          composerMetrics:
            typeof value === "function" ? value(state.composerMetrics) : value,
        })),

      setComposerPerspective: (value) =>
        set((state) => ({
          composerPerspective:
            typeof value === "function" ? value(state.composerPerspective) : value,
        })),

      setComposerTrainingData: (value) =>
        set((state) => ({
          composerTrainingData:
            typeof value === "function" ? value(state.composerTrainingData) : value,
        })),

      setComposerTestData: (value) =>
        set((state) => ({
          composerTestData:
            typeof value === "function" ? value(state.composerTestData) : value,
        })),

      setComposerGroundTruth: (value) =>
        set((state) => ({
          composerGroundTruth:
            typeof value === "function" ? value(state.composerGroundTruth) : value,
        })),

      setComposerModelEnv: (value) =>
        set((state) => ({
          composerModelEnv:
            typeof value === "function" ? value(state.composerModelEnv) : value,
        })),

      // Reset
      resetWorkflow: () => set(INITIAL_STATE),
    }),
    {
      name: WORKFLOW_STORAGE_KEY,
      version: WORKFLOW_PERSIST_VERSION,
      /**
       * 저장된 상태를 현재 규칙으로 옮긴다.
       *
       * v1 → v2: multilabel 에서 M1·M11·M12·M13 이 제거됐다(ISSUES.md A-04, 결정 2).
       * 걸러내지 않으면 기존 브라우저에 남은 선택 목록이 그대로 평가로 전송되고,
       * 백엔드가 `failed_metrics` 로 돌려준 것을 성적서 6절이 '측정 불가'로 인쇄한다.
       * (결정 4 '앞으로 것만 정정'은 **발급된 성적서**에 대한 결정이지 브라우저에
       *  남은 작성 중 상태에 대한 결정이 아니다 — 여기서는 정리하는 쪽이 옳다.)
       */
      migrate: (persisted, version) => migrateWorkflowState(persisted as any, version),
      // 시연 모드에서는 저장소를 읽지도 쓰지도 않는다(위 isShowcaseMode 주석 참조).
      storage: createJSONStorage(() => ({
        getItem: (name) => (isShowcaseMode() ? null : window.localStorage.getItem(name)),
        setItem: (name, value) => {
          if (isShowcaseMode()) return;
          try {
            window.localStorage.setItem(name, value);
          } catch {
            // 용량 초과 등으로 저장에 실패해도 진행 중인 입력을 잃게 하지 않는다.
            // (저장소가 가득 찬 상황의 안내는 검증 단계의 저장 경로가 담당한다 — ISSUES.md E-11)
          }
        },
        removeItem: (name) => window.localStorage.removeItem(name),
      })),
      /**
       * 저장 대상 선별.
       * - `rawFile` 제외: File 객체는 JSON 직렬화가 원리적으로 불가능하다. 대신
       *   `uploadedFile`(메타)은 저장해 "파일이 있었는데 지금은 없다"를 감지한다.
       * - `validationResult` 제외: 응답 전문이라 용량 기여가 크고 검증 단계 재진입 시
       *   다시 받으면 된다(ISSUES.md E-11).
       * - `metadata` 포함: 매핑 단계의 양성 클래스·감지 클래스·컬럼 고유값이 여기 있어,
       *   빼면 새로고침 후 매핑 화면이 무너져 persist 의 효용이 절반이 된다.
       *   백엔드가 컬럼당 고유값을 200개로 상한하므로 용량은 감당 가능하다.
       */
      partialize: (state) => {
        const { rawFile, validationResult, ...persisted } = state;
        void rawFile;
        void validationResult;
        return persisted;
      },
      /** 재수화 시점에 파일이 없으면 재업로드가 필요한 상태다. */
      onRehydrateStorage: () => (state) => {
        if (state && state.uploadedFile && !state.rawFile) {
          state.needsFileReupload = true;
        }
      },
    },
  ),
);