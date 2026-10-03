/**
 * 성적서 구성 화면의 타입 정의 — 재료 레지스트리의 스키마.
 *
 * `docs/COMPOSER_COMPONENTS.md` 의 카드 9개와 그 안의 필드를 코드가 읽는 형태로 옮긴 것이다.
 * 구성 화면의 카드·상세 영역·하단 요약, 단계 목록 계산, 필수 입력 점검이 모두 이 스키마를
 * 통해 `data/reportComposer.ts` 하나만 읽는다.
 *
 * 레지스트리 **본체**는 `src/data/reportComposer.ts`, 값을 담는 스토어 필드는
 * `src/utils/stores/useWorkflowStore.ts` 의 `composer*` 들이다.
 */
import type { TaskType } from "../data/evaluationData";
import type { StepId } from "./workflow.types";

/** 카드 9개. 앞 5개가 필수(잠김), 뒤 4개가 선택이다. */
export type ComposerCardId =
  | "evalData" // ① 평가 데이터
  | "metrics" // ② 지표와 합격 기준
  | "clientInfo" // ③ 의뢰자 정보
  | "model" // ④ 평가 대상 모델
  | "perspective" // ⑤ 평가 관점
  | "trainingData" // ⑥ 학습 데이터
  | "testData" // ⑦ 테스트 데이터
  | "groundTruth" // ⑧ 정답 라벨
  | "modelEnv"; // ⑨ 모델 설정과 실행 환경

/** 켜고 끌 수 있는 카드. 단계 목록과 필수 입력 점검이 이 네 개만 본다. */
export type OptionalCardId = "trainingData" | "testData" | "groundTruth" | "modelEnv";

/**
 * 필드 구분.
 *
 * `docs/COMPOSER_COMPONENTS.md` 는 "필수 (표준 보고)"를 네 번째 구분으로 적지만, 카드별 상세
 * 표에는 한 번도 나오지 않고 `docs/COMPOSER_DESIGN.md` 의 배지도 세 가지뿐이다. 그래서 값은
 * 세 가지로 두고, 표준 보고 여부는 **선택 카드 안의 `required` 필드**로 유도한다
 * (`isStandardReportingField`). 같은 뜻을 두 벌로 적지 않는다.
 */
export type FieldKind = "required" | "optional" | "conditional";

/** 입력 방식. 4단계의 입력 화면이 어떤 컨트롤을 그릴지 결정한다. */
export type FieldInput =
  | "file" // 파일 업로드
  | "text" // 한 줄 텍스트
  | "textarea" // 여러 줄 텍스트
  | "number" // 숫자
  | "single" // 선택지 하나
  | "multi" // 선택지 여럿
  | "date" // 날짜 / 기간
  | "entries" // 키-값 줄 추가 (클래스별 수량, 하이퍼파라미터)
  | "metricSelect"; // 지표 선택 (기존 지표 선택 화면이 담당)

export interface ComposerField {
  /** 레지스트리 전역에서 유일하다. 스토어 값 맵의 키가 된다. */
  id: string;
  /** 필드 이름. 명사로 쓴다. */
  label: string;
  /** 상세 영역 "입력 예시" 열에 그대로 그린다. 문서 문구를 옮긴 것이다. */
  inputExample: string;
  kind: FieldKind;
  /** `kind: "conditional"` 전용 — 상세 영역에 배지 없이 글자로 그린다("Fβ 선택 시"). */
  conditionLabel?: string;
  /**
   * 조건부 필드가 **실제로 필수가 되는 조건**. `conditionLabel` 이 사람에게 보여주는 문구라면
   * 이쪽은 입력 점검이 읽는 값이다 — 같은 카드의 다른 필드가 이 값일 때 필수가 된다.
   *
   * 조건이 카드 밖에 있는 필드(② 의 β 는 지표 선택에 달려 있다)에는 두지 않는다. 그런 필드는
   * 그 조건을 아는 화면이 따로 검사한다.
   */
  requiredWhen?: { field: string; equals: string };
  /** 이 필드를 보여줄 분류 유형. 없으면 전 유형. */
  taskTypes?: TaskType[];
  input: FieldInput;
  /** `single` · `multi` 의 선택지. */
  choices?: string[];
  /**
   * 다른 선택지와 함께 고를 수 없는 선택지(⑥ 수집 환경 차이의 "알려진 것 없음").
   * 이 값은 "모름"과 달리 **제공된 것으로 센다** — 원문이 요구하는 답이기 때문이다.
   */
  exclusiveChoice?: string;
  /** `entries` 의 고정 행 키(⑥ 데이터 양의 학습·검증, ⑨ GPU 사용 여부의 학습·추론). */
  entryKeys?: string[];
  /**
   * `entries` 의 행을 다른 곳에서 만든다 — 사용자가 줄을 추가하지 않는다.
   * `"classes"`: 업로드한 클래스 목록(⑥ 클래스별 데이터 양)
   * `"metrics"`: 선택한 지표 목록(② 합격 기준)
   */
  entryKeysFrom?: "classes" | "metrics";
  /** 한 카드가 두 단계로 나뉘는 경우 그 필드의 단계(①, ④). 없으면 카드의 `steps` 를 따른다. */
  step?: StepId;
  /** 더보기로 접는다. 기본값이 있거나 있으면 좋은 정도의 항목. */
  advanced?: boolean;
  /** 예시를 고정폭 글꼴 + `tabular-nums` 로 그린다(파일명·숫자). */
  mono?: boolean;
  /** "모름"을 고를 수 있다. 고르면 필수 점검을 통과하고 성적서에는 "제공되지 않음"이 된다. */
  allowsUnknown?: boolean;
  /** 입력 화면에 붙이는 한 줄 도움말. */
  help?: string;
  /** 성적서의 어느 절에 들어가는지 — 개발자용. 카드에 보이지 않는다. */
  reportSection?: string;
  /** AI 서술에 넘기는 값인지 — 개발자용. 카드에 보이지 않는다. */
  sentToAi?: boolean;
  /** 근거 조항(KS X ISO/IEC TS 4213). ⑤ 평가 관점의 지표 점검이 쓸 값. */
  standardClause?: string;
}

export interface ComposerCard {
  id: ComposerCardId;
  /** 카드 이름 앞에 붙는 번호. 화면에도 그대로 보인다. */
  number: string;
  /** 번호를 뺀 카드 이름. */
  name: string;
  /** 이 카드가 무엇인지 한 문장. */
  description: string;
  /** 필수 카드는 잠겨 있어 뺄 수 없다. */
  locked: boolean;
  fields: ComposerField[];
  /** 이 카드를 보여줄 분류 유형. 없으면 전 유형. */
  taskTypes?: TaskType[];
  /** 상세 영역 하단 도움말. */
  help?: string;
  /** 상세 영역의 보기 버튼. */
  viewer?: "csvExample" | "metricList";
  /** 이 카드를 받는 단계. 한 카드가 두 단계로 나뉘기도 한다(①, ④). */
  steps: StepId[];
}

/** 선택 카드의 켜짐/꺼짐. 스토어에 저장된다. */
export type ComposerSelection = Record<OptionalCardId, boolean>;

/** 프리셋 — 최소 구성(필수 5개만) / 전체(선택 4개까지). */
export type ComposerPreset = "minimal" | "full";

/**
 * 처음에는 **필수 카드만** 들어간다(프리셋 "최소 구성").
 *
 * 기본을 "전체"로 두면 사용자가 보지도 않은 선택 카드 4개의 필수 입력을 떠안은 채 시작한다 —
 * 덜어내려면 먼저 그런 카드가 있다는 것을 알아야 하는데, 그 사실이 막힌 뒤에야 드러난다.
 * 비어 있는 데서 더하는 쪽이 고르는 행위와 맞다.
 */
export const DEFAULT_COMPOSER_SELECTION: ComposerSelection = {
  trainingData: false,
  testData: false,
  groundTruth: false,
  modelEnv: false,
};

/**
 * 필드 하나의 값. 전부 선택적이고 전부 직렬화 가능하다 — 이 상태는 localStorage 를
 * 왕복하므로 직렬화 가능한 형태가 참 타입이다(기존 `BasicInfoFormData` 와 같은 이유).
 */
export interface ComposerFieldValue {
  /** `text` · `textarea` · `number` · `single` · `date` 의 값. */
  text?: string;
  /** `multi` 의 값. */
  choices?: string[];
  /** `entries` 의 값 — 클래스별 수량, 하이퍼파라미터 줄. */
  entries?: Array<{ key: string; value: string }>;
  /** "모름"을 골랐다. */
  unknown?: boolean;
}

/** 카드 하나의 값 모음. 키는 `ComposerField.id` 다. */
export type ComposerValueMap = Record<string, ComposerFieldValue>;
