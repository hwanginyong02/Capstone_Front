/**
 * 재료 레지스트리의 스키마 — 재료 고르기 화면과 입력 화면이 함께 쓴다.
 *
 * `docs/COMPOSER_COMPONENTS.md` 의 카드 9개와 그 안의 필드를 코드가 읽는 형태로 옮긴 것이다.
 * 재료 고르기의 대분류·카드·필드, 단계 목록 계산, 필수 입력 점검이 모두 이 스키마를
 * 통해 `data/reportComposer.ts` 하나만 읽는다.
 *
 * 레지스트리 **본체**는 `src/data/reportComposer.ts`, 값을 담는 스토어 필드는
 * `src/utils/stores/useWorkflowStore.ts` 의 `composer*` 들이다.
 */
import type { RequiredColumnCode, TaskType } from "../data/evaluationData";
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
 * 값은 세 가지다. 재료 고르기 화면의 네 번째 구분인 **권장**은 유도한다 — TS 4213 이 성적서에
 * 적으라고 요구하는 표준 보고 항목이다(docs/MATERIAL_PICKER.md §6). 출처는 필드마다 정확히 하나다.
 * - 선택 카드 안의 `required` 필드: 카드에서 유도한다(`pickKind`).
 * - 잠긴 카드 안의 `optional` 필드: `standardBasis.reportingItem` 이 있으면 권장이다(`leafKind` —
 *   ① 지연시간 컬럼). 선택 카드에는 이 방식을 쓰지 않는다(테스트가 막는다).
 */
export type FieldKind = "required" | "optional" | "conditional";

/**
 * 재료 고르기 화면의 필드 구분(docs/MATERIAL_PICKER.md §4·§6).
 *
 * - `required` 필수 카드의 필수 필드. 체크박스 없이 보인다.
 * - `recommended` 선택 카드의 필수 필드(표준 보고 항목). 필드 한 줄 단위로 체크하고 기본은 꺼짐.
 * - `optional` 선택 필드. 하나씩 체크한다(쪼갠 항목이 있으면 항목마다).
 * - `conditional` 조건이 맞을 때만 받는 필드. 조건 문구와 함께 보인다.
 */
export type PickKind = "required" | "recommended" | "optional" | "conditional";

/**
 * 한 필드를 재료 고르기 화면에서 여러 줄로 쪼개 보일 때의 한 줄(docs/MATERIAL_PICKER.md §8).
 * 예: ③ 회사 정보 → 회사명·대표자·사업자등록번호·전화번호·주소.
 *
 * 입력 화면과 저장값은 바꾸지 않는다 — 화면에 보이는 단위만 쪼갠다. 선택 필드의 항목은
 * 항목마다 체크하고, 체크 id 는 `필드id:key` 다.
 */
export interface FieldPart {
  key: string;
  label: string;
  /** 이름 오른쪽에 회색으로 보이는 형식(텍스트, 하나 선택 등). */
  format?: string;
  /** 이 항목만의 짧은 설명. */
  description?: string;
}

/** 입력 방식. 입력 단계의 화면이 어떤 컨트롤을 그릴지 결정한다. */
export type FieldInput =
  | "file" // 파일 업로드
  | "text" // 한 줄 텍스트
  | "textarea" // 여러 줄 텍스트
  | "number" // 숫자
  | "single" // 선택지 하나
  | "multi" // 선택지 여럿
  | "date" // 날짜 하나 (③ 의뢰일)
  | "monthRange" // 시작 월 ~ 끝 월 (⑥ ⑦ 수집 기간). 값은 entries 의 From·To 로 둔다
  | "entries" // 키-값 줄 추가 (클래스별 수량, 하이퍼파라미터)
  | "metricSelect" // 지표 선택 (기존 지표 선택 화면이 담당)
  | "column"; // 컬럼 매핑 화면에서 컬럼에 역할을 준다 (① 정답·예측·지연시간 컬럼)

/** `monthRange` 의 두 칸. 저장소에 들어가는 키라 화면 문구와 따로 둔다. */
export const MONTH_RANGE_KEYS = { from: "From", to: "To" } as const;

/** `monthRange` 두 칸의 화면 이름. 키는 위 `MONTH_RANGE_KEYS` 의 값이다. */
export const MONTH_RANGE_LABELS: Record<string, string> = { From: "시작 월", To: "끝 월" };

/**
 * 조건부 필드의 조건 하나 — 같은 카드의 다른 필드가 이 값일 때 성립한다.
 * `equals` 는 값 하나, `in` 은 여러 값 중 하나.
 */
export interface FieldCondition {
  field: string;
  equals?: string;
  in?: string[];
}

/** 숫자 칸의 허용 범위. `max` 가 없으면 위로 열려 있다. */
export interface NumberRange {
  min: number;
  max?: number;
  integer?: boolean;
}

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
   * 조건을 값으로 읽을 수 없는 필드(② 의 β 는 고른 지표 목록에, ① 결정 임계값은 매핑 결과에
   * 달려 있다)에는 두지 않고 `conditionField` 를 단다. 그런 필드는 그 조건을 아는 화면이 따로 검사한다.
   *
   * 배열이면 **모두** 성립해야 한다. ⑧ 라벨 일치도 값은 "복수 검수"이면서 "측정한 종류"일 때만
   * 받는다 — 앞의 조건이 풀리면(검수 방식을 바꾸면) 뒤의 값도 함께 사라져야 한다.
   */
  requiredWhen?: FieldCondition | FieldCondition[];
  /**
   * 조건부 필드의 **조건을 정하는 필드**(같은 카드) — 조건을 값으로 읽을 수 없어 `requiredWhen` 을
   * 둘 수 없을 때만 적는다(② β ← 지표, ① 결정 임계값 ← 예측 컬럼). 평가 흐름 만들기에서 그 필드를
   * 넣으면 이 필드가 함께 들어간다. 조건을 정하는 필드는 `conditionTriggerIds` 한 곳에서 읽는다.
   */
  conditionField?: string;
  /**
   * 레지스트리 폼(`ComposerCardForm`)이 아니라 **전용 화면이 받는다**(업로드·컬럼 매핑·지표·③④ 폼).
   * 레지스트리 폼은 그리지 않고 필드 점검(`getFieldIssue`)도 건너뛴다 — 전용 화면이 따로 검사한다.
   * 평가 흐름 만들기의 트리·설명 팝업·개수에는 똑같이 나타난다.
   */
  dedicatedScreen?: true;
  /** `input: "column"` 전용 — 이 항목이 받는 컬럼 매핑 역할. 유형마다 역할 하나는 정확히 한 항목에 든다. */
  columnRoles?: RequiredColumnCode[];
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
  /**
   * 고르면 내용을 직접 적어야 하는 선택지("Other (free text)").
   *
   * 선택지만 있고 쓸 칸이 없으면 "기타"를 고른 사용자가 무엇인지 말할 길이 없다. 고르는
   * 순간 칸이 나타나고(`ComposerFieldValue.otherText`), 비어 있으면 미입력으로 센다.
   */
  otherChoice?: string;
  /**
   * 숫자 칸의 허용 범위(⑧ 라벨러 수·라벨 일치도). **값이 있을 때만** 검사한다 — 비어
   * 있는지는 필수 점검이 따로 본다.
   */
  numberRange?: NumberRange;
  /**
   * 허용 범위가 같은 카드의 다른 답에 따라 달라지는 숫자 칸(⑧ 라벨 일치도 값 — 단순 일치율은
   * 0~100 %, 카파·알파는 −1~1). 그 답에 해당하는 범위가 `null` 이면 검사하지 않는다("기타").
   */
  numberRangeBy?: { field: string; ranges: Record<string, NumberRange | null> };
  /**
   * 고를 수 있는 조건이 다른 칸의 숫자에 달린 선택지(⑧ Cohen의 카파는 라벨러 2명, Fleiss의
   * 카파는 3명 이상). 조건 칸이 비어 있으면 검사하지 않는다.
   */
  choiceRequires?: Record<string, { field: string; min?: number; max?: number; message: string }>;
  /**
   * 선택지와 함께 **덧붙이는 글**을 받는다(서술 설계 D26: 모든 선택지 필드는 추가 서술을 함께
   * 받는다). 맞는 선택지가 없으면 글만 써도 답한 것으로 센다. 성적서에는 "의뢰자 제공"으로 싣는다.
   */
  allowsNote?: boolean;
  /**
   * 화면에 보이는 선택지 이름. 키는 `choices` 의 값이다.
   *
   * `choices` 는 **저장값**이라 영어로 둔다 — 화면 문구를 바꿀 때마다 저장값이 바뀌면 이미
   * 저장된 답이 어느 선택지와도 맞지 않게 된다(docs/MATERIAL_PICKER.md §8). 화면은 이 이름을,
   * 성적서는 `reportLabels` 를 쓴다. 없는 키는 저장값을 그대로 보인다(`choiceLabel`).
   */
  choiceLabels?: Record<string, string>;
  /** 선택지 이름 아래 회색으로 보이는 한 줄 설명(③ 성적서 용도의 카드). 키는 `choices` 의 값이다. */
  choiceDescriptions?: Record<string, string>;
  /**
   * 성적서에 찍을 선택지 이름. 재료 목록이 정한 이름이 있어 화면 이름과 다를 수 있다
   * (예: "Missed (FN)" → 화면 "놓침(FN)", 성적서 "FN이 더 위험"). 키는 `choices` 의 값이다.
   */
  reportLabels?: Record<string, string>;
  /** `entries` 의 고정 행 키(⑥ 데이터 양의 학습·검증, ⑨ GPU 사용 여부의 학습·추론). 저장값이다. */
  entryKeys?: string[];
  /** `entryKeys` 행의 화면 이름. 키는 `entryKeys` 의 값이다(`entryLabel`). */
  entryLabels?: Record<string, string>;
  /**
   * `entries` 의 행을 다른 곳에서 만든다 — 사용자가 줄을 추가하지 않는다.
   * `"classes"`: 업로드한 클래스 목록(⑥ 클래스별 데이터 양)
   * `"metrics"`: 선택한 지표 목록(② 합격 기준)
   */
  entryKeysFrom?: "classes" | "metrics";
  /** 한 카드가 두 단계로 나뉘는 경우 그 필드의 단계(①, ④). 없으면 카드의 `steps` 를 따른다. */
  step?: StepId;
  /** 예시를 고정폭 글꼴 + `tabular-nums` 로 그린다(파일명·숫자). */
  mono?: boolean;
  /**
   * 숫자만 받는 칸. 입력 화면이 숫자 키패드를 띄우고 자릿수를 고정폭으로 맞춘다.
   *
   * `entries` 라고 다 숫자인 것은 아니다 — ⑥ 데이터 양은 건수지만 ⑨ 실행 환경은 OS 이름 같은
   * 글이다. 둘을 같은 칸으로 그리면 글자를 숫자 키패드로 치게 된다.
   */
  numeric?: boolean;
  /**
   * 글 칸의 글자 수 상한(`text`·`textarea` 의 값, 클래스마다 받는 글이면 칸마다). 입력 칸이 이 수를
   * 넘겨 받지 않고 남은 글자를 보인다. AI 에 넘기는 고객 입력 전체에도 상한이 있어(백엔드 2만 자),
   * 칸 하나가 그 몫을 다 쓰지 못하게 한다(B7). 덧붙이는 글·기타 칸은 `NOTE_MAX_LENGTH`·
   * `OTHER_TEXT_MAX_LENGTH` 를 쓴다.
   */
  maxLength?: number;
  /**
   * "모름"을 고를 수 있다. 고르면 필수 점검을 통과하고 성적서에는 "제공되지 않음"이 된다(2층 보고 항목).
   *
   * 칸이 정해진 글·숫자 묶음(⑥ 데이터 양, ⑨ 실행 환경)은 **칸마다** 모름을 고른다(`unknownPerEntry`,
   * 값은 `ComposerFieldValue.unknownKeys`) — 일부만 알 때 아는 칸까지 버리지 않게(W3).
   */
  allowsUnknown?: boolean;
  /**
   * 선택지 가운데 "모름"에 해당하는 저장값(⑨ GPU 사용 여부의 "Unknown"). 칸마다 고르는 선택지에 모름이 이미
   * 있는 필드는 필드 모름 체크(`allowsUnknown`)를 두지 않는다 — 같은 화면에 "모름"이 두 번 나오던 것(W3).
   * 성적서·AI 에는 "제공되지 않음"으로 적는다.
   */
  unknownChoice?: string;
  /** 입력 화면에 붙이는 한 줄 도움말. */
  help?: string;
  /**
   * 재료 고르기 화면에서 이름 아래 회색으로 보이는 이 필드만의 짧은 설명.
   * 문구는 초안이다 — 프로토타입 `data()` 의 desc 를 옮겼다(docs/MATERIAL_PICKER.md §8).
   */
  description?: string;
  /**
   * 이름 오른쪽에 회색으로 보이는 형식. 없으면 `input`·`choices` 에서 만든다(`fieldFormat`).
   * 유도한 문장이 어색한 필드(파일, 지표 목록)에만 적는다.
   */
  format?: string;
  /** 재료 고르기 화면에서 여러 줄로 쪼개 보일 항목. `entryKeys` 가 있는 필드는 거기서 만든다. */
  parts?: FieldPart[];
  /** 성적서의 어느 절에 찍히는지 — 개발자용. 카드에 보이지 않는다. 테스트가 리터럴 표로 고정한다. */
  reportSection?: string;
  /**
   * AI 서술에 넘기는 고객 입력(`buildClientInputs` 의 client_inputs)에 이 값이 실리는지 — 개발자용.
   * 카드에 보이지 않는다. ⑥⑦⑨ 글 칸은 테스트가 실제로 실리는지와 대조한다.
   */
  sentToAi?: boolean;
  /** 표준 근거. 평가 흐름 만들기의 설명 팝업이 "표준 근거" 줄로 보인다. 없으면 그 줄을 그리지 않는다. */
  standardBasis?: StandardBasis;
  /**
   * 같은 내용을 받던 **기존 저장소 필드**. 카드에 입력하면 여기에도 함께 쓴다.
   *
   * 카드가 생기기 전부터 `basicInfo` 의 몇몇 필드가 같은 것을 받고 있었고, 성적서를 그리는
   * 코드는 그쪽을 읽는다. 둘을 한 화면에 나란히 두면 사용자가 같은 값을 두 번 적게 되므로
   * **입력란은 카드 하나로 합치되, 값은 기존 저장소에도 흘려보내** 성적서 출력을 그대로 둔다.
   *
   * ⑥ 학습 데이터는 이 방식을 쓰지 않는다. 기존 저장소(`datasetInfo`)를 아예 없애고 성적서가
   * 카드 값을 직접 읽는다(persist v10) — 저장소가 둘이면 어느 쪽이 참인지 다시 갈린다.
   *
   * `field` — 값 하나를 그 필드에 쓴다.
   * `byKey` — `entries` 의 칸마다 다른 필드에 쓴다(⑨ 실행 환경의 OS·CPU·… 처럼).
   */
  legacy?:
    | { target: LegacyTarget; field: string }
    | { target: LegacyTarget; byKey: Record<string, string> };
}

/**
 * 필드의 표준 근거. 성적서가 실제로 점검하는 것(1층 식별 항목, 2층 보고 항목, 3층 선언)에만 단다.
 *
 * 화면에는 조항 번호와 2층 항목 이름만 보인다. `requirement`(짧은 요구 문장)는 표준 원문과 대조를
 * 마친 것만 적는다 — 풀어 쓴 초안을 근거처럼 보이면 거짓 표시가 된다.
 */
export interface StandardBasis {
  standard: "ISO/IEC TS 4213" | "ISO/IEC 17025";
  /** 조항. 화면에 그대로 보인다("6.2.6", "8절", "7.8.2.1 e)"). */
  clause: string;
  requirement?: string;
  /**
   * 재료 선택 점검 2층 번호(`lib/report/materialCheck.ts` 의 REPORTING_ITEMS, #1~#12). 성적서가 이
   * 번호로 "제공되지 않음"을 센다(`reportMaterials.ts` 의 줄 번호와 같다).
   */
  reportingItem?: number;
}

/** 카드 값을 함께 흘려보낼 기존 저장소. */
export type LegacyTarget = "basicInfo";

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
  /** 입력 화면 하단 도움말. */
  help?: string;
  /** 이 카드를 받는 단계. 한 카드가 두 단계로 나뉘기도 한다(①, ④). */
  steps: StepId[];
}

/**
 * 선택 카드가 성적서에 들어가는지. 스토어에 저장된다.
 *
 * 재료 고르기 화면에서는 직접 켜고 끄지 않는다 — 선택 카드에 **항목이 하나라도 들어가면** 켜진다
 * (`setMaterialPick`). 단계 목록과 필수 점검은 이 값을 그대로 읽는다.
 */
export type ComposerSelection = Record<OptionalCardId, boolean>;

/** 재료 고르기 화면의 대분류 4개(docs/MATERIAL_PICKER.md §2). */
export type MaterialCategoryId = "info" | "model" | "data" | "criteria";

export interface MaterialCategory {
  id: MaterialCategoryId;
  name: string;
  /** 대분류 안의 카드. 배열 순서가 카탈로그 순서다. */
  cardIds: ComposerCardId[];
}

/**
 * 카드마다 받기로 고른 권장·선택 항목(docs/MATERIAL_PICKER.md §11). 넣고 빼는 즉시 바뀐다. 키가
 * 없으면 재료 고르기를 지나기 전의 상태라 그 카드의 필드를 모두 받는다(`isFieldPicked`). 빈 배열이면
 * 고른 항목이 없는 것이다. 값은 고른 필드 id, 쪼갠 항목이면 `필드id:key` 다.
 */
export type MaterialPicks = Partial<Record<ComposerCardId, string[]>>;

/**
 * 평가 흐름 만들기 트리의 항목 하나(docs/MATERIAL_PICKER.md §12.2). 필수·권장은 필드 하나, 칸이 나뉜
 * 선택 필드는 칸 하나다. 조건부 항목도 트리에 보이지만 저장하지 않는다 — 조건을 정하는 항목을
 * 넣으면 함께 들어간다.
 */
export interface FlowLeaf {
  cardId: ComposerCardId;
  /** `materialPicks` 에 들어가는 id. 조건부는 필드 id 이지만 저장하지 않는다. */
  leafId: string;
  fieldId: string;
  partKey?: string;
  label: string;
  /** `leafKind` — 잠긴 카드의 2층 보고 항목(① 지연시간)은 권장이다. */
  kind: PickKind;
  conditionLabel?: string;
  /** 조건부만 — 함께 들여오는 같은 카드의 항목 id(`conditionTriggerIds`). */
  triggerIds?: string[];
}

/** 다른 화면에서 평가 흐름 만들기로 들어올 때 넘기는 `location.state`. */
export interface FlowEntryState {
  cardId: ComposerCardId;
  /** 강조할 항목. 없으면 그 블록의 넣지 않은 필수·권장 항목이다(`focusLeafIds`). */
  leafIds?: string[];
  /** "다음"이 돌아갈 입력 화면(`composerNextStep`). */
  returnStep?: StepId;
}

/**
 * 처음에는 **필수 카드만** 들어간다.
 *
 * 선택 카드는 사용자가 재료 고르기에서 항목을 골라 저장해야 들어간다 — 보지도 않은 카드의 입력을
 * 떠안은 채 시작하지 않는다. 비어 있는 데서 더하는 쪽이 고르는 행위와 맞다.
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
  /** `otherChoice` 를 골랐을 때 직접 적은 내용. */
  otherText?: string;
  /** `allowsNote` 필드에 덧붙인 글. */
  note?: string;
  /** `entries` 의 값 — 클래스별 수량, 하이퍼파라미터 줄. */
  entries?: Array<{ key: string; value: string }>;
  /** "모름"을 골랐다(필드 전체). */
  unknown?: boolean;
  /**
   * 칸별 "모름"(⑥ 데이터 양, ⑨ 실행 환경 — `unknownPerEntry`). 여기 든 칸은 값이 남아 있어도 빈 것으로
   * 보고, 필수 점검은 통과하며 성적서·AI 에는 "제공되지 않음"이다(W3). 옛 필드 모름은 persist v15 가 옮겼다.
   */
  unknownKeys?: string[];
}

/** 카드 하나의 값 모음. 키는 `ComposerField.id` 다. */
export type ComposerValueMap = Record<string, ComposerFieldValue>;
