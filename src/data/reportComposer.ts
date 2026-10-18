/**
 * 재료 레지스트리 — 재료 고르기 화면과 입력 화면의 단일 출처.
 *
 * `docs/COMPOSER_COMPONENTS.md` 의 카드 9개(필수 5개, 선택 4개)와 그 안의 필드를 코드가 읽는
 * 설정으로 옮긴 것이다. 재료 고르기 화면(docs/MATERIAL_PICKER.md §4)의 대분류·카드·필드, 단계
 * 목록 계산, 필수 입력 점검이 전부 이 파일 하나를 읽는다 — 같은 표를 여러 군데 베껴 두면
 * 문서와 화면이 조용히 어긋난다.
 *
 * 쓰는 곳: `components/material-picker/*`(재료 고르기), `data/workflowSteps.ts`·
 * `utils/domain/workflowSteps.ts`(단계 목록), `utils/domain/composerFieldGate.ts`(필수 점검).
 *
 * **지표 목록은 여기 두지 않는다.** ② 의 "고를 수 있는 지표"는 `getAvailableMetrics` 가
 * 유일한 출처다(`data/evaluationData.ts`). SPEC.md 와 두 벌이 되면 한쪽만 고쳐질 수 있다.
 */
import { getAvailableMetrics, type MetricDefinition, type TaskType } from "./evaluationData";
import {
  MONTH_RANGE_LABELS,
  type ComposerCard,
  type ComposerCardId,
  type ComposerField,
  type FieldPart,
  type MaterialCategory,
  type OptionalCardId,
  type PickKind,
} from "../types/reportComposer.types";

/**
 * 카드 9개. 배열 순서는 카드 번호 순(①~⑨)이다. 화면과 입력 순서는 `MATERIAL_CATEGORIES` 가 정한다.
 *
 * 카드와 필드를 나눈 기준(COMPOSER_COMPONENTS "카드를 나눈 기준"):
 * 성적서의 절이나 표가 생기고 사라지면 **카드**, 같은 칸의 내용만 바뀌면 **필드**다.
 */
export const COMPOSER_CARDS: ComposerCard[] = [
  // ─── 필수 카드 ①~⑤ — 잠겨 있어 뺄 수 없다 ────────────────────────────────
  {
    id: "evalData",
    number: "①",
    name: "평가 데이터",
    description: "모델의 예측 결과 파일입니다. 모든 지표를 이 파일로 계산합니다.",
    locked: true,
    // 파일은 평가 데이터(업로드)에서 받고, 컬럼 매핑·양성 클래스·결정 임계값은 컬럼 매핑에서 확인한다.
    steps: ["upload", "mapping"],
    fields: [
      {
        id: "resultFile",
        dedicatedScreen: true,
        label: "결과 파일",
        inputExample: "predictions.csv (CSV 또는 JSON, 20 MiB 이하)",
        kind: "required",
        input: "file",
        description: "모델이 테스트 데이터에 낸 예측 결과가 담긴 파일입니다. 예: 샘플마다 정답과 예측이 한 줄씩 있는 predictions.csv",
        format: "CSV 또는 JSON 파일 1개, 20 MiB 이하",
        mono: true,
        step: "upload",
        reportSection: "4절",
      },
      // ─── 컬럼 매핑 화면이 받는 항목. 매핑 역할(`columnRoles`)마다 정확히 한 항목이 맡는다 ───
      {
        id: "yTrueColumn",
        dedicatedScreen: true,
        label: "정답 컬럼",
        inputExample: "y_true",
        kind: "required",
        input: "column",
        columnRoles: ["y_true"],
        description: "샘플마다 실제 정답이 적힌 컬럼입니다. 예: label, y_true",
        mono: true,
        step: "mapping",
        reportSection: "3절",
      },
      {
        // 예측 레이블과 확률은 서로 대신할 수 있어(PREDICTION_ROLE_ALTERNATIVES) 한 항목이다.
        id: "predictionColumns",
        dedicatedScreen: true,
        label: "예측 컬럼",
        inputExample: "y_pred 또는 score · prob_cat, prob_dog …",
        kind: "required",
        input: "column",
        columnRoles: ["y_pred", "score", "prob_class_*", "prob_label_*"],
        description:
          "모델이 낸 예측이 적힌 컬럼입니다. 예측 레이블이나 확률 중 하나 이상이 있어야 합니다. 예: y_pred, prob_cat",
        format: "예측 레이블 컬럼 또는 확률 컬럼(하나 이상)",
        mono: true,
        step: "mapping",
        reportSection: "3절",
      },
      {
        // 선택지는 올린 파일의 정답 값이라 레지스트리에 적지 않는다.
        id: "positiveClass",
        dedicatedScreen: true,
        label: "양성 클래스",
        inputExample: "정답 값 중 하나 (1, churn …)",
        kind: "required",
        taskTypes: ["binary"],
        input: "single",
        description: "이진 분류에서 찾아야 하는 쪽으로 볼 정답 값입니다. 예: 이탈 예측이면 churn",
        format: "정답 값 중 하나 선택. 기본값은 자동 판단",
        mono: true,
        step: "mapping",
        reportSection: "3절",
      },
      {
        id: "decisionThreshold",
        dedicatedScreen: true,
        label: "결정 임계값",
        inputExample: "0.5",
        kind: "conditional",
        conditionLabel: "컬럼 매핑에서 예측 레이블 없이 확률 컬럼 선택 시",
        // 조건은 매핑 결과라 값으로 읽을 수 없다. 예측 컬럼을 넣으면 함께 들어간다.
        conditionField: "predictionColumns",
        taskTypes: ["binary", "multilabel"],
        input: "number",
        numberRange: { min: 0, max: 1 },
        description: "확률을 예측으로 바꿀 때 기준이 되는 값입니다. 이 값 이상이면 양성으로 봅니다. 예: 0.5",
        format: "0~1 사이 숫자. 기본값 0.5, 멀티레이블은 레이블마다",
        mono: true,
        step: "mapping",
        reportSection: "3절",
      },
      {
        id: "latencyColumn",
        dedicatedScreen: true,
        label: "지연시간 컬럼",
        inputExample: "latency_ms",
        kind: "optional",
        input: "column",
        columnRoles: ["latency"],
        description: "샘플마다 추론에 걸린 시간(밀리초)이 적힌 컬럼입니다. 예: latency_ms",
        format: "컬럼 하나. 밀리초",
        mono: true,
        step: "mapping",
        reportSection: "6절",
      },
      {
        id: "sampleIdColumn",
        dedicatedScreen: true,
        label: "샘플 ID 컬럼",
        inputExample: "sample_id",
        kind: "optional",
        input: "column",
        columnRoles: ["id"],
        description: "샘플마다 붙은 고유 식별자 컬럼입니다. 예: sample_id",
        mono: true,
        step: "mapping",
      },
      {
        // 값은 스토어의 `classLabelDescriptions` 에 담긴다(매핑 화면의 설명 카드).
        id: "classLabelDescriptions",
        dedicatedScreen: true,
        label: "클래스 레이블 설명",
        inputExample: "cat = 집고양이 사진 (클래스마다 한 줄)",
        kind: "optional",
        input: "entries",
        entryKeysFrom: "classes",
        description: "클래스 값이 무엇을 뜻하는지입니다. 예: cat = 집고양이 사진",
        step: "mapping",
        reportSection: "3절",
        sentToAi: true,
      },
    ],
  },
  {
    id: "metrics",
    number: "②",
    name: "지표와 합격 기준",
    description: "어떤 지표로 몇 점이면 합격인지 정합니다.",
    locked: true,
    // 지표·β·지표 선택 이유·합격 기준·핵심 지표를 한 화면에서 받는다(docs/MATERIAL_PICKER.md §5).
    steps: ["metrics"],
    fields: [
      {
        id: "selectedMetrics",
        dedicatedScreen: true,
        label: "지표",
        inputExample: "아래 지표 목록에서 고름 (최소 1개)",
        kind: "required",
        input: "metricSelect",
        description: "모델 성능을 잴 지표입니다. 분류 유형에서 쓸 수 있는 지표 중에 고릅니다. 예: Accuracy, F1, AUROC",
        format: "체크, 최소 1개",
        reportSection: "3절",
        sentToAi: true,
      },
      {
        id: "passCriteria",
        dedicatedScreen: true,
        label: "합격 기준",
        inputExample: "Accuracy ≥ 0.85",
        kind: "required",
        input: "entries",
        description: "지표마다 넘어야 할 목표값입니다. 계산한 값과 비교해 합격 여부를 판정합니다. 예: Accuracy 0.85 이상",
        format: "지표마다 목표값. 혼동행렬은 면제",
        entryKeysFrom: "metrics",
        mono: true,
        reportSection: "6절",
        sentToAi: true,
      },
      {
        id: "beta",
        dedicatedScreen: true,
        conditionField: "selectedMetrics",
        label: "β",
        inputExample: "1.0",
        kind: "conditional",
        conditionLabel: "지표에서 Fβ 선택 시",
        input: "number",
        description: "Fβ에서 재현율과 정밀도 중 어느 쪽을 더 무겁게 볼지 정하는 값입니다. 1보다 크면 재현율, 작으면 정밀도를 더 봅니다. 예: 2",
        mono: true,
        reportSection: "6절",
      },
      {
        // 멀티레이블에서만 묻는다. 세 지표군의 뜻이 서로 달라 고른 이유를 성적서에 적는다.
        // TS 4213 6.5.1 의 보고 항목이라 재료 선택 점검 **2층**(12번)이다 — 늘 묻지만(잠긴 카드라
        // kind 는 required) "모름"을 허용하고, 비어도 진행을 막지 않는다. 빠지면 성적서에 "제공되지
        // 않음"이 찍히고 생성 전 안내에 나온다(지표 화면은 빈 칸을 막지 않는다).
        id: "metricRationale",
        label: "지표 선택 이유",
        inputExample: "오차를 고르게 봄 / 모든 레이블 일치 / 겹치는 정도 / 기타(직접 입력)",
        kind: "required",
        taskTypes: ["multilabel"],
        input: "single",
        description: "멀티레이블 지표를 고른 이유입니다. 예: 레이블이 하나라도 틀리면 안 되는 모델이면 모든 레이블 일치",
        choiceLabels: {
          "Errors weighted evenly": "오차를 고르게 봄",
          "Every label must match": "모든 레이블 일치",
          "Degree of overlap": "겹치는 정도",
          "Other (own words)": "기타(직접 입력)",
        },
        choices: [
          "Errors weighted evenly",
          "Every label must match",
          "Degree of overlap",
          "Other (own words)",
        ],
        reportLabels: {
          "Errors weighted evenly": "오차를 고르게 봄",
          "Every label must match": "샘플의 모든 레이블이 맞아야 함",
          "Degree of overlap": "겹치는 정도를 봄",
          "Other (own words)": "기타",
        },
        otherChoice: "Other (own words)",
        allowsUnknown: true,
        help:
          "멀티레이블 지표는 저마다 다른 것을 묻기 때문에, 이 지표를 고른 이유를 성적서에 적습니다. " +
          "비우거나 모름으로 두면 성적서에 \"제공되지 않음\"으로 표시되고, 진행은 막지 않습니다.",
        // 지표 격자 바로 아래에서 레지스트리로 그린다. 카드의 나머지 필드(지표·β·합격 기준·핵심
        // 지표)는 지표 화면이 직접 그리고 검사한다.
        step: "metrics",
        reportSection: "3절",
        sentToAi: true,
      },
      {
        /**
         * 미달하면 최종 불합격(FAIL)이 되는 지표. 나머지 지표의 미달은 조건부 합격에 그친다
         * (`lib/report/computeVerdict.ts`).
         *
         * 목표값이 있는 지표 중 최소 1개(재료 목록 7절). 유형별 기본값이 미리 체크돼 있다. 판정이
         * 목표값과 함께 결정되므로 목표값을 적는 합격 기준 표에서 고른다 — 지표와 합격 기준 화면
         * (`components/test-items/PassCriteriaCard.tsx`).
         */
        id: "coreMetrics",
        dedicatedScreen: true,
        label: "핵심 지표",
        inputExample: "유형별 기본값: Accuracy · F1 (이진). 최소 1개",
        kind: "required",
        input: "metricSelect",
        description: "목표에 못 미치면 최종 불합격이 되는 지표입니다. 목표값이 있는 지표 중 1개 이상 고릅니다. 예: Accuracy, F1",
        format: "지표마다 체크. 유형별 기본값이 체크돼 있음",
        reportSection: "6절",
        sentToAi: true,
      },
    ],
  },
  {
    id: "clientInfo",
    number: "③",
    name: "의뢰자 정보",
    description: "성적서를 받는 회사와 용도입니다.",
    locked: true,
    steps: ["clientInfo"],
    fields: [
      {
        id: "companyInfo",
        dedicatedScreen: true,
        label: "회사 정보",
        inputExample:
          "회사명: (주)테스트기업 · 대표자: 홍길동 · " +
          "사업자등록번호: 123-45-67890 · 전화번호: 02-1234-5678 · 주소: 서울시 …",
        kind: "required",
        input: "text",
        description: "시험을 의뢰한 회사의 정보입니다. 회사 정보는 AI에 넘기지 않습니다.",
        parts: [
          { key: "companyName", label: "회사명", format: "텍스트", description: "의뢰하는 회사의 정식 명칭입니다. 예: (주)테스트기업" },
          { key: "representative", label: "대표자", format: "텍스트", description: "회사 대표자 이름입니다. 예: 홍길동" },
          { key: "businessNumber", label: "사업자등록번호", format: "텍스트", description: "회사의 사업자등록번호입니다. 예: 123-45-67890" },
          { key: "phone", label: "전화번호", format: "텍스트", description: "회사 대표 연락처입니다. 예: 02-1234-5678" },
          { key: "address", label: "주소", format: "텍스트", description: "회사 소재지입니다. 예: 서울시 강남구 테헤란로 123" },
        ],
        reportSection: "1절",
      },
      {
        id: "reportPurpose",
        dedicatedScreen: true,
        label: "성적서 용도",
        inputExample: "내부 검증 / 외부 제출 / 과제 산출물",
        kind: "required",
        input: "single",
        description: "성적서를 어디에 쓰는지입니다. 과제 산출물을 고르면 과제 정보를 받습니다. 예: 고객사나 기관에 내면 외부 제출",
        // 저장값은 `basicInfo.reportPurpose` 가 실제로 담는 값이다(성적서의 ReportPurposeKey 와 같다).
        // 종전 레지스트리는 영어 문장을 적어 두어 어디에도 저장되지 않는 값이었고, 과제 정보의 조건이
        // 성립할 수 없었다.
        choiceLabels: {
          internal: "내부 검증",
          external: "외부 제출",
          project: "과제 산출물",
        },
        choiceDescriptions: {
          internal: "사내 품질 확인이나 모델 모니터링에 씁니다",
          external: "고객사나 심사 기관에 냅니다",
          project: "지원 과제의 증빙으로 냅니다",
        },
        choices: ["internal", "external", "project"],
        // 글은 `basicInfo.reportPurposeNote` 에 담긴다(전용 화면이 받는다).
        allowsNote: true,
        reportSection: "1절",
      },
      {
        id: "projectInfo",
        dedicatedScreen: true,
        label: "과제 정보",
        inputExample: "과제명 · 과제 기관",
        kind: "conditional",
        conditionLabel: "성적서 용도에서 과제 산출물 선택 시",
        requiredWhen: { field: "reportPurpose", equals: "project" },
        input: "text",
        description: "성적서를 제출할 과제의 정보입니다.",
        parts: [
          { key: "projectName", label: "과제명", format: "텍스트", description: "성적서를 제출할 과제의 이름입니다. 예: AI 바우처 지원사업" },
          { key: "projectAgency", label: "과제 기관", format: "텍스트", description: "과제를 맡긴 기관입니다. 예: 정보통신산업진흥원" },
        ],
        reportSection: "1절",
      },
      {
        id: "contactExtra",
        dedicatedScreen: true,
        label: "홈페이지·팩스",
        inputExample: "https://example.com · 02-1234-5679",
        kind: "optional",
        input: "text",
        description: "회사 홈페이지와 팩스 번호입니다.",
        parts: [
          { key: "website", label: "홈페이지", format: "텍스트", description: "회사 웹사이트 주소입니다. 예: https://example.com" },
          { key: "fax", label: "팩스", format: "텍스트", description: "회사 팩스 번호입니다. 예: 02-1234-5679" },
        ],
        reportSection: "1절",
      },
      {
        id: "projectNumber",
        dedicatedScreen: true,
        label: "과제 번호",
        inputExample: "2026-PRJ-001",
        kind: "optional",
        input: "text",
        description: "과제의 관리 번호입니다. 예: 2026-PRJ-001",
        mono: true,
        reportSection: "1절",
      },
      {
        id: "requestDate",
        dedicatedScreen: true,
        label: "평가 의뢰일",
        inputExample: "기본값 오늘",
        // 성적서 1.2 와 표지 시험 기간의 시작일이다. 1층 검사(basicInfoValidity)가 늘 요구하므로 필수다 —
        // 종전에는 선택이라 고르지 않으면 칸이 숨었는데, 빈 값이면 고칠 칸 없이 "다음"이 막혔다.
        kind: "required",
        input: "date",
        description: "시험을 의뢰한 날짜입니다. 처음에는 평가를 시작한 날로 채워집니다. 예: 2026-10-15",
        reportSection: "1절",
      },
    ],
  },
  {
    id: "model",
    number: "④",
    name: "평가 대상 모델",
    description: "시험 대상 모델의 이름과 쓰임새입니다.",
    locked: true,
    // 이름·버전·용도를 한 화면에서 받는다(docs/MATERIAL_PICKER.md §5). 종전에는 이름·버전을 업로드
    // 화면이, 용도를 Details 가 따로 받았다.
    steps: ["model"],
    fields: [
      {
        id: "modelNameVersion",
        dedicatedScreen: true,
        label: "모델 이름·버전",
        inputExample: "이름: ChurnPredictor · 버전: v1.0.0 (버전 기본값 v1.0.0)",
        kind: "required",
        input: "text",
        description: "시험할 모델의 이름과 버전입니다.",
        parts: [
          { key: "modelName", label: "모델 이름", format: "텍스트", description: "시험할 모델을 부르는 이름입니다. 예: 고객 이탈 예측 모델, ChurnPredictor" },
          { key: "versionName", label: "버전", format: "텍스트. 기본값 v1.0.0", description: "같은 모델을 구분하는 버전입니다. 모델을 고쳐 다시 시험하면 버전을 올립니다. 예: v1.0.0, v2.1" },
        ],
        mono: true,
        reportSection: "2절",
        sentToAi: true,
      },
      {
        id: "modelPurpose",
        dedicatedScreen: true,
        label: "모델 용도",
        inputExample: "통신사 고객 이탈 예측",
        kind: "required",
        input: "text",
        description: "모델이 하는 일입니다. 예: 통신사 고객의 이탈 여부 예측",
        reportSection: "2절",
        sentToAi: true,
      },
      {
        // 1절 대상 문장("본 모델은 {분류} 형식으로 구현되었으며…")에 끼워 찍혀 한 줄로 받는다.
        id: "modelCategory",
        dedicatedScreen: true,
        label: "모델 분류",
        inputExample: "분류 모델 (신경망)",
        kind: "required",
        input: "text",
        description: "모델이 어떤 종류인지 한 줄로 적습니다. 예: 분류 모델(신경망), 텍스트 분류",
        reportSection: "1절",
        sentToAi: true,
      },
    ],
  },
  {
    id: "perspective",
    number: "⑤",
    name: "평가 관점",
    description: "이 모델에서 무엇을 중요하게 볼지입니다.",
    locked: true,
    // 지표와 합격 기준 바로 앞 단계다 — 답이 재료 선택 점검 3층의 기준점이다(docs/MATERIAL_PICKER.md §3).
    steps: ["perspective"],
    help:
      "고른 지표가 답과 맞지 않으면 지표 화면의 \"목적별 점검\"과 검증 화면의 생성 전 안내에서 " +
      "알려 줍니다. 다음으로 넘어가는 것은 막지 않습니다.",
    // 유형에 따라 필드가 갈리지만 사용자는 **항상 두 개**를 받는다.
    fields: [
      {
        id: "criticalErrorType",
        label: "중요 오류 유형",
        inputExample: "놓침(FN) / 잘못 잡음(FP) / 비슷함",
        kind: "required",
        taskTypes: ["binary"],
        input: "single",
        description: "놓치는 오류(FN)와 잘못 잡는 오류(FP) 중 무엇이 더 치명적인지입니다. 예: 암 진단 모델이면 놓침",
        choiceLabels: {
          "Missed (FN)": "놓침(FN)",
          "False alarm (FP)": "잘못 잡음(FP)",
          Similar: "비슷함",
        },
        choices: ["Missed (FN)", "False alarm (FP)", "Similar"],
        reportLabels: {
          "Missed (FN)": "FN이 더 위험",
          "False alarm (FP)": "FP가 더 위험",
          Similar: "비슷함",
        },
        help:
          "놓침을 고르면 Recall 또는 β가 1보다 큰 Fβ가, 잘못 잡음을 고르면 Precision 또는 " +
          "β가 1보다 작은 Fβ가 지표에 있어야 합니다. 없으면 지표 화면에서 알려 줍니다.",
        standardClause: "6.2.6",
        reportSection: "5절",
        sentToAi: true,
      },
      {
        id: "classPriority",
        label: "클래스 중요도",
        inputExample: "모두 동등 / 큰 클래스 우선 / 개별 샘플 우선",
        kind: "required",
        taskTypes: ["multiclass", "multilabel"],
        input: "single",
        description: "클래스를 어떤 기준으로 중요하게 볼지입니다. 예: 드문 클래스도 똑같이 중요하면 모두 동등",
        choiceLabels: {
          "All equal": "모두 동등",
          "Larger classes first": "큰 클래스 우선",
          "Individual samples first": "개별 샘플 우선",
        },
        choices: ["All equal", "Larger classes first", "Individual samples first"],
        reportLabels: {
          "All equal": "모든 클래스가 동등",
          "Larger classes first": "다수 클래스 우선",
          "Individual samples first": "샘플 단위로 중요",
        },
        help:
          "차례대로 매크로·가중·마이크로 평균 지표가 있어야 합니다. 클래스별 표를 고르면 세 평균이 " +
          "모두 있는 것으로 봅니다. 멀티레이블에서 큰 클래스 우선·개별 샘플 우선은 클래스별 표가 필요합니다.",
        standardClause: "6.4.3",
        reportSection: "5절",
        sentToAi: true,
      },
      {
        id: "usageMode",
        label: "사용 방식",
        inputExample: "실시간 응답 / 일괄 처리",
        kind: "required",
        input: "single",
        description: "요청마다 바로 응답하는지, 모아서 한꺼번에 처리하는지입니다. 예: 챗봇은 실시간 응답, 야간 정산은 일괄 처리",
        choiceLabels: {
          "Real-time": "실시간 응답",
          Batch: "일괄 처리",
        },
        choices: ["Real-time", "Batch"],
        reportLabels: { "Real-time": "대화형(실시간)", Batch: "배치" },
        help:
          "실시간 응답을 고르면 응답시간(latency) 컬럼을 매핑했는지 확인합니다. 없으면 생성 전에 알리고, " +
          "성적서에 응답 속도를 판단할 수 없다고 적습니다.",
        standardClause: "6.6.2",
        reportSection: "5절",
        sentToAi: true,
      },
    ],
  },

  // ─── 선택 카드 ⑥~⑨ — 안의 필수 항목은 재료 고르기에서 "권장"이다. 고르지 않으면 성적서에
//     "제공되지 않음"으로 찍힌다(docs/MATERIAL_PICKER.md §6) ─────────────────────
  {
    id: "trainingData",
    number: "⑥",
    name: "학습 데이터",
    description: "모델을 훈련할 때 쓴 데이터입니다.",
    locked: false,
    steps: ["trainingData"],
    help:
      "수집 환경 차이는 같은 클래스의 데이터가 서로 다른 장비, 처리 방식, 사람, 환경에서 " +
      "모였는지(TS 4213 5.3.8 채널 효과)를 묻습니다. 불균형 보정은 한쪽 클래스에 몰린 " +
      "데이터를 어떻게 다뤘는지(TS 4213 8절)를 묻습니다.",
    fields: [
      {
        id: "trainingDatasetName",
        label: "데이터 이름",
        inputExample: "고객 로그 2024",
        kind: "required",
        input: "text",
        description: "모델을 학습시킨 데이터셋의 이름입니다. 예: 고객 로그 2024",
        allowsUnknown: true,
        reportSection: "7절",
        sentToAi: true,
      },
      {
        /**
         * ⑦ 의 데이터 출처와 **다른 데이터셋**이다 — 이쪽은 모델을 훈련할 때 쓴 데이터,
         * 저쪽은 성능을 잰 테스트 데이터다. 둘이 같은지는 ⑦ 의 "학습 데이터와 출처 관계"가
         * 따로 묻는다(같으면 점수가 실제보다 좋게 나올 수 있다).
         */
        id: "trainingDataSource",
        label: "데이터 출처",
        inputExample: "사내 CRM 로그 (직접 입력)",
        kind: "required",
        input: "text",
        description: "학습 데이터를 어디서 얻었는지입니다. 예: 사내 CRM 로그, AI Hub 공개 데이터",
        allowsUnknown: true,
        reportSection: "7절",
        sentToAi: true,
      },
      {
        id: "trainingVolume",
        label: "데이터 양",
        inputExample: "학습 12,000건 · 검증 3,000건",
        kind: "required",
        input: "entries",
        description: "학습과 검증에 쓴 샘플 수입니다. 예: 학습 12,000건, 검증 3,000건",
        entryLabels: {
          Training: "학습",
          Validation: "검증",
        },
        entryKeys: ["Training", "Validation"],
        mono: true,
        numeric: true,
        allowsUnknown: true,
        reportSection: "7절",
        sentToAi: true,
      },
      {
        id: "trainingClassVolume",
        label: "클래스별 데이터 양",
        inputExample: "정상 8,400 / 이탈 3,600 (파일에서 찾은 클래스마다 한 칸)",
        kind: "required",
        input: "entries",
        description: "클래스마다 학습 샘플이 몇 건인지입니다. 칸은 평가 데이터의 클래스로 만들어집니다. 예: 정상 8,400건, 이탈 3,600건",
        entryKeysFrom: "classes",
        mono: true,
        numeric: true,
        allowsUnknown: true,
        reportSection: "7절",
        sentToAi: true,
      },
      {
        id: "channelEffects",
        label: "수집 환경 차이",
        inputExample:
          "알려진 것 없음 / 장비 차이 / 전처리 차이 / 수집자 차이 / 수집 환경 차이 / 기타 (복수 선택)",
        kind: "required",
        input: "multi",
        description: "같은 클래스의 데이터가 서로 다른 장비, 처리 방식, 사람, 환경에서 모였는지입니다. 예: 정상 사진은 병원 A, 이상 사진은 병원 B 장비로 찍었으면 장비 차이",
        choiceLabels: {
          "None known": "알려진 것 없음",
          "Different equipment": "장비 차이",
          "Different processing": "전처리 차이",
          "Different collectors": "수집자 차이",
          "Different surroundings": "수집 환경 차이",
          "Other (free text)": "기타(직접 입력)",
        },
        choices: [
          "None known",
          "Different equipment",
          "Different processing",
          "Different collectors",
          "Different surroundings",
          "Other (free text)",
        ],
        reportLabels: {
          "None known": "알려진 것 없음",
          "Different equipment": "수집 장치 차이",
          "Different processing": "전처리 차이",
          "Different collectors": "수집자 차이",
          "Different surroundings": "수집 환경 차이",
          "Other (free text)": "기타",
        },
        // "None known" 은 원문이 요구하는 답이라 **제공된 것으로 센다**. "모름"과 다르다.
        exclusiveChoice: "None known",
        otherChoice: "Other (free text)",
        help:
          "같은 클래스의 데이터가 서로 다른 장비, 처리 방식, 사람, 환경에서 모였는지입니다. " +
          "여러 개일 수 있습니다.",
        standardClause: "5.3.8",
        reportSection: "7절",
        sentToAi: true,
      },
      {
        /**
         * 편향 감소 노력. 여러 가지를 함께 했을 수 있어 복수 선택이다. "Did nothing" 은 다른
         * 노력과 함께 고를 수 없다 — 둘을 같이 고르면 어느 쪽이 참인지 알 수 없다.
         */
        id: "imbalanceHandling",
        label: "불균형 보정",
        inputExample: "클래스 수 맞춤 / 출처 다양화 / 보정 안 함 / 기타 (복수 선택)",
        kind: "required",
        input: "multi",
        description: "한쪽 클래스에 몰린 데이터를 어떻게 보정했는지입니다. 예: 적은 클래스를 늘려 수를 맞췄으면 클래스 수 맞춤",
        choiceLabels: {
          "Balanced the counts": "클래스 수 맞춤",
          "Widened the sources": "출처 다양화",
          "Did nothing": "보정 안 함",
          "Other (free text)": "기타(직접 입력)",
        },
        choices: ["Balanced the counts", "Widened the sources", "Did nothing", "Other (free text)"],
        reportLabels: {
          "Balanced the counts": "클래스 균형 조정",
          "Widened the sources": "데이터 출처 다양화",
          "Did nothing": "수행 안 함",
          "Other (free text)": "기타",
        },
        exclusiveChoice: "Did nothing",
        otherChoice: "Other (free text)",
        allowsUnknown: true,
        help: "한쪽 클래스에 몰린 데이터를 어떻게 다뤘는지입니다. 여러 개일 수 있습니다.",
        standardClause: "8절",
        reportSection: "7절",
        sentToAi: true,
      },
      {
        id: "trainingPeriod",
        label: "수집 기간",
        inputExample: "2023-01 ~ 2024-12",
        kind: "optional",
        input: "monthRange",
        description: "학습 데이터를 모은 기간입니다. 예: 2023-01 ~ 2024-12",
        mono: true,
        reportSection: "7절",
        sentToAi: true,
      },
      {
        /**
         * 종전에는 이 칸이 없었고, Details 합격 기준 카드의 "Report notes"(평가에 대한 메모)가
         * 성적서에 "학습 데이터 설명"으로 인쇄됐다. 칸을 여기로 옮기고 그 메모 칸은 없앴다.
         *
         * 선택 항목이지만 더보기에 접지 않는다 — 접어 두었더니 칸이 없는 것으로 보였다.
         */
        id: "trainingDescription",
        label: "학습 데이터 설명",
        inputExample: "데이터에 무엇이 들었고 어떻게 모았는지 (직접 입력)",
        kind: "optional",
        input: "textarea",
        description: "학습 데이터에 무엇이 들었고 어떻게 모았는지입니다. 예: 2024년 가입 고객의 월별 사용 로그",
        reportSection: "7절",
      },
      {
        // Details 의 학습 데이터 폼에만 있던 칸이다. 폼을 이 카드로 합치면서 옮겼다.
        id: "trainingDataFormat",
        label: "데이터 형식",
        inputExample: "정형 CSV, 이미지(JPG/PNG), 텍스트",
        kind: "optional",
        input: "text",
        description: "학습 데이터의 파일 형식이나 구조입니다. 예: 정형 CSV, 이미지(JPG/PNG), 텍스트",
        reportSection: "7절",
      },
      {
        id: "trainingNotes",
        label: "비고",
        inputExample: "학습 데이터에 대해 그 밖에 알릴 것 (직접 입력)",
        kind: "optional",
        input: "textarea",
        description: "학습 데이터에 대해 그 밖에 알릴 내용입니다. 예: 개인정보는 가명 처리함",
        reportSection: "7절",
      },
      {
        /**
         * 학습과 평가 데이터의 전처리가 같은가 — 종전의 자유서술 세 칸(⑥ 전처리, ⑦ 전처리·전처리
         * 내용)을 이 한 칸으로 바꿨다(서술 설계 D44).
         *
         * TS 4213 5.3.3 은 전처리를 "주의를 기울여야 할 것"으로만 적고 보고를 요구하지 않는다.
         * 걱정하는 것은 일관되지 않은 전처리가 해석을 비트는 경우라, 같은지만 묻고 코드가 조건으로
         * 쓸 수 있게 선택지로 받는다. 전처리가 채널 효과의 원인이면 ⑥ "Different processing"이 받는다.
         *
         * ⑥ 학습 데이터 카드에 둔다. 종전에는 ⑦ 테스트 데이터 카드에 있어, ⑦ 을 넣지 않으면 학습
         * 데이터를 넣어도 이 값을 받을 수 없었다(재료 목록 4절 "AI 예", persist v13 이 옮긴다).
         */
        id: "preprocessingMatch",
        label: "학습과 같은 전처리",
        inputExample: "같음 / 다름 / 모름 (덧붙이는 글 가능)",
        kind: "optional",
        input: "single",
        description: "평가 데이터를 학습 데이터와 같은 방식으로 전처리했는지입니다. 내용은 묻지 않습니다. 예: 같은 정규화 코드를 썼으면 같음",
        choiceLabels: {
          Same: "같음",
          Different: "다름",
          Unknown: "모름",
        },
        choices: ["Same", "Different", "Unknown"],
        allowsNote: true,
        help: "학습 데이터와 평가 데이터를 같은 방식으로 전처리했는지입니다.",
        reportSection: "3절",
        sentToAi: true,
        reportLabels: { Same: "같음", Different: "다름", Unknown: "모름" },
      },
    ],
  },
  {
    id: "testData",
    number: "⑦",
    name: "테스트 데이터",
    description: "성능을 잰 테스트 데이터의 출처입니다.",
    locked: false,
    steps: ["testData"],
    // 건수와 클래스별 건수는 올린 파일에서 시스템이 세므로 사용자에게 묻지 않는다.
    help:
      "학습 데이터와 같은 곳에서 왔으면 점수가 실제보다 좋게 나올 수 있어 성적서에 함께 " +
      "적습니다.",
    fields: [
      {
        id: "testDataSource",
        label: "데이터 출처",
        inputExample: "2025년 1분기 고객 로그 (직접 입력)",
        kind: "required",
        input: "text",
        description: "성능을 잰 테스트 데이터를 어디서 얻었는지입니다. 예: 2025년 1분기 고객 로그",
        allowsUnknown: true,
        reportSection: "4절",
        sentToAi: true,
      },
      {
        id: "testSourceRelation",
        label: "학습 데이터와 출처 관계",
        inputExample: "같음 / 다름",
        kind: "required",
        input: "single",
        description: "테스트 데이터가 학습 데이터와 같은 곳에서 왔는지입니다. 같은 곳이면 점수가 실제보다 좋게 나올 수 있습니다. 예: 같은 CRM 로그에서 나눴으면 같음",
        choiceLabels: {
          "Same source": "같음",
          "Different source": "다름",
        },
        choices: ["Same source", "Different source"],
        reportLabels: { "Same source": "같은 출처", "Different source": "다른 출처" },
        allowsUnknown: true,
        help: "둘이 같은 곳에서 왔으면 점수가 실제보다 좋게 나올 수 있습니다.",
        reportSection: "4절",
        sentToAi: true,
      },
      {
        id: "testPeriod",
        label: "수집 기간",
        inputExample: "2025-01 ~ 2025-03",
        kind: "optional",
        input: "monthRange",
        description: "테스트 데이터를 모은 기간입니다. 예: 2025-01 ~ 2025-03",
        mono: true,
        reportSection: "4절",
        sentToAi: true,
      },
    ],
  },
  {
    id: "groundTruth",
    number: "⑧",
    name: "정답 라벨",
    description: "테스트 데이터의 정답을 누가, 어떻게 붙였는지입니다.",
    locked: false,
    steps: ["groundTruth"],
    help:
      "정답이 틀리면 점수도 믿을 수 없어서 정답의 출처를 성적서에 적습니다. 실제 결과 기록은 " +
      "\"실제 해지 여부\"처럼 사후에 확인된 결과를 정답으로 쓴 경우입니다.",
    fields: [
      {
        id: "labelAuthor",
        label: "라벨 작성 주체",
        inputExample: "전문가 / 외부 작업자 / 프로그램·규칙 / 실제 결과 기록 / 기타",
        kind: "required",
        input: "single",
        description: "정답을 붙인 주체입니다. 실제 결과 기록은 사후에 확인된 결과를 정답으로 쓴 경우입니다. 예: 의사가 진단명을 붙였으면 전문가",
        choiceLabels: {
          "Domain experts": "전문가",
          "Outside workers": "외부 작업자",
          "A program or rule": "프로그램·규칙",
          "Recorded outcomes": "실제 결과 기록",
          "Other (free text)": "기타(직접 입력)",
        },
        choices: [
          "Domain experts",
          "Outside workers",
          "A program or rule",
          "Recorded outcomes",
          "Other (free text)",
        ],
        reportLabels: {
          "Domain experts": "전문가 수동",
          "Outside workers": "크라우드소싱",
          "A program or rule": "규칙·자동",
          "Recorded outcomes": "운영 로그",
          "Other (free text)": "기타",
        },
        otherChoice: "Other (free text)",
        allowsUnknown: true,
        reportSection: "4절",
        sentToAi: true,
      },
      {
        id: "labelReview",
        label: "라벨 검수 방식",
        inputExample: "복수 교차 검수 / 1인 검수 / 검수 없음",
        kind: "required",
        input: "single",
        description: "붙인 정답을 어떻게 다시 확인했는지입니다. 예: 두 사람이 따로 붙이고 맞춰 봤으면 복수 교차 검수",
        choiceLabels: {
          "Several reviewers": "복수 교차 검수",
          "One reviewer": "1인 검수",
          "No review": "검수 없음",
        },
        choices: ["Several reviewers", "One reviewer", "No review"],
        reportLabels: {
          "Several reviewers": "복수 라벨러 합의",
          "One reviewer": "단일 라벨러",
          "No review": "검토 없음",
        },
        allowsUnknown: true,
        reportSection: "4절",
        sentToAi: true,
      },
      {
        /**
         * 라벨러 수와 일치도는 칸을 나눈다. 한 칸("3 people · 82%")으로 받으면 숫자인지도,
         * 범위 안인지도 검사할 수 없다.
         */
        id: "labelReviewerCount",
        label: "라벨러 수",
        inputExample: "3",
        kind: "conditional",
        conditionLabel: "라벨 검수 방식에서 복수 교차 검수 선택 시",
        requiredWhen: { field: "labelReview", equals: "Several reviewers" },
        input: "number",
        description: "정답을 붙인 사람 수입니다. 예: 3",
        numberRange: { min: 1, integer: true },
        mono: true,
        reportSection: "4절",
        sentToAi: true,
      },
      {
        /**
         * 일치도를 무엇으로 쟀는가. 종류를 알아야 숫자를 읽을 수 있다 — 같은 0.8 이라도 단순
         * 일치율이면 보통이고 카파면 높은 편이다. TS 4213 5.3.9 는 Cohen의 카파를 예로만 든다
         * (서술 설계 D42).
         *
         * "Not measured" 는 제공된 답이다. 일치도는 2층 항목인 신뢰성에 딸린 세부 값이고, 대부분의
         * 고객은 일치도 숫자가 없다(심판 설계 6.2).
         */
        id: "labelAgreementKind",
        label: "일치도 종류",
        inputExample:
          "단순 일치율 / Cohen의 카파 / Fleiss의 카파 / Krippendorff의 알파 / 기타 / 측정 안 함",
        kind: "conditional",
        conditionLabel: "라벨 검수 방식에서 복수 교차 검수 선택 시",
        requiredWhen: { field: "labelReview", equals: "Several reviewers" },
        input: "single",
        description: "라벨러끼리 일치도를 무엇으로 쟀는지입니다. 라벨러가 2명이면 Fleiss의 카파, 3명 이상이면 Cohen의 카파를 고를 수 없습니다. 예: 두 사람이면 Cohen의 카파",
        choiceLabels: {
          "Percent agreement": "단순 일치율",
          "Cohen's kappa": "Cohen의 카파",
          "Fleiss' kappa": "Fleiss의 카파",
          "Krippendorff's alpha": "Krippendorff의 알파",
          Other: "기타(이름 직접 입력)",
          "Not measured": "측정 안 함",
        },
        choices: [
          "Percent agreement",
          "Cohen's kappa",
          "Fleiss' kappa",
          "Krippendorff's alpha",
          "Other",
          "Not measured",
        ],
        otherChoice: "Other",
        choiceRequires: {
          "Cohen's kappa": {
            field: "labelReviewerCount",
            max: 2,
            message: "Cohen의 카파는 두 사람을 비교합니다. 세 명 이상이면 Fleiss의 카파를 고르세요.",
          },
          "Fleiss' kappa": {
            field: "labelReviewerCount",
            min: 3,
            message: "Fleiss의 카파는 세 명 이상일 때 씁니다. 두 명이면 Cohen의 카파를 고르세요.",
          },
        },
        reportSection: "3절",
        sentToAi: true,
        reportLabels: {
          "Percent agreement": "단순 일치율",
          "Cohen's kappa": "Cohen의 카파",
          "Fleiss' kappa": "Fleiss의 카파",
          "Krippendorff's alpha": "Krippendorff의 알파",
          Other: "기타",
          "Not measured": "측정 안 함",
        },
      },
      {
        // 단순 일치율은 화면에서 % 로 받는다(0~100). 카파·알파는 −1~1, 기타는 검사하지 않는다.
        id: "labelAgreementValue",
        label: "일치도 값",
        inputExample: "82 (단순 일치율) 또는 0.71 (카파)",
        kind: "conditional",
        conditionLabel: "일치도 종류에서 측정 안 함 외 선택 시",
        requiredWhen: [
          { field: "labelReview", equals: "Several reviewers" },
          {
            field: "labelAgreementKind",
            in: ["Percent agreement", "Cohen's kappa", "Fleiss' kappa", "Krippendorff's alpha", "Other"],
          },
        ],
        input: "number",
        description: "라벨러끼리 답이 얼마나 일치했는지입니다. 예: 단순 일치율 82, 카파 0.71",
        format: "숫자. 단순 일치율 0~100(%), 카파·알파 −1~1",
        help: "단순 일치율은 0~100(%), 카파와 알파는 −1~1 입니다.",
        numberRangeBy: {
          field: "labelAgreementKind",
          ranges: {
            "Percent agreement": { min: 0, max: 100 },
            "Cohen's kappa": { min: -1, max: 1 },
            "Fleiss' kappa": { min: -1, max: 1 },
            "Krippendorff's alpha": { min: -1, max: 1 },
            Other: null,
          },
        },
        mono: true,
        reportSection: "3절",
        sentToAi: true,
      },
    ],
  },
  {
    id: "modelEnv",
    number: "⑨",
    name: "모델 설정과 실행 환경",
    description: "모델 설정값과 실행한 컴퓨터입니다.",
    locked: false,
    steps: ["modelEnv"],
    fields: [
      {
        id: "algorithm",
        label: "알고리즘",
        inputExample: "XGBoost",
        kind: "required",
        input: "text",
        description: "모델 학습에 쓴 알고리즘입니다. 예: 랜덤포레스트, XGBoost",
        mono: true,
        allowsUnknown: true,
        reportSection: "2절",
        sentToAi: true,
      },
      {
        id: "hyperparameters",
        label: "하이퍼파라미터",
        inputExample: "max_depth = 6, n_estimators = 300 (한 줄에 하나)",
        kind: "required",
        input: "entries",
        description: "학습할 때 정한 설정값입니다. 예: max_depth = 6, n_estimators = 300",
        mono: true,
        allowsUnknown: true,
        reportSection: "2절",
        sentToAi: true,
      },
      {
        /**
         * 문서의 예시는 한 줄("Ubuntu 22.04 · A100 · 64GB · Python 3.11")이지만 칸을 다섯으로
         * 나눈다. 성적서가 OS·CPU·GPU·메모리·소프트웨어를 **따로 인쇄**하기 때문이다
         * (`evalEnv.systemSpec`). 한 줄로 받으면 그걸 다시 다섯으로 쪼개야 하는데, 쪼개는
         * 규칙을 만들면 틀릴 수 있다.
         *
         * 칸 이름은 화면 문구고, 성적서가 무엇으로 인쇄할지는 아래 `legacy.byKey` 가 정한다
         * (성적서는 한국어로 "운영체제"라 찍는다). 둘을 같은 글자로 묶어 둘 필요가 없다.
         */
        id: "runtimeEnv",
        label: "실행 환경",
        inputExample: "Ubuntu 22.04 · A100 · 64GB · Python 3.11",
        kind: "required",
        input: "entries",
        description: "모델을 돌린 장비와 소프트웨어입니다. 예: Ubuntu 22.04, A100, 64GB, Python 3.11",
        entryLabels: {
          "Operating system": "운영체제",
          CPU: "CPU",
          GPU: "GPU",
          Memory: "메모리",
          Software: "소프트웨어",
        },
        entryKeys: ["Operating system", "CPU", "GPU", "Memory", "Software"],
        mono: true,
        allowsUnknown: true,
        reportSection: "8절",
        sentToAi: true,
        legacy: {
          target: "basicInfo",
          byKey: {
            "Operating system": "envOS",
            CPU: "envCPU",
            GPU: "envGPU",
            Memory: "envMemory",
            Software: "envSoftware",
          },
        },
      },
      {
        id: "gpuUsage",
        label: "GPU 사용 여부",
        inputExample: "학습 예 / 아니오 · 추론 예 / 아니오",
        kind: "required",
        input: "entries",
        description: "학습과 추론에 GPU 같은 가속 장치를 썼는지입니다. 예: 학습은 예, 추론은 아니오",
        entryLabels: {
          Training: "학습",
          Inference: "추론",
        },
        choiceLabels: {
          Yes: "예",
          No: "아니오",
          Unknown: "모름",
        },
        entryKeys: ["Training", "Inference"],
        choices: ["Yes", "No", "Unknown"],
        reportLabels: { Yes: "예", No: "아니오", Unknown: "모름" },
        allowsUnknown: true,
        reportSection: "8절",
        sentToAi: true,
      },
    ],
  },
];

/** 필수 카드 — 항상 성적서에 들어간다. */
export const REQUIRED_CARD_IDS: ComposerCardId[] = COMPOSER_CARDS.filter((card) => card.locked).map(
  (card) => card.id,
);

/** 선택 카드 — 재료 고르기에서 항목을 골라 저장하면 들어간다. 배열 순서는 카드 번호 순이다. */
export const OPTIONAL_CARD_IDS: OptionalCardId[] = COMPOSER_CARDS.filter(
  (card) => !card.locked,
).map((card) => card.id as OptionalCardId);

/** 카드 하나를 찾는다. */
export function getCard(id: ComposerCardId): ComposerCard {
  const card = COMPOSER_CARDS.find((item) => item.id === id);
  if (!card) throw new Error(`Unknown composer card: ${id}`);
  return card;
}

/** 이 분류 유형에서 보여줄 카드. 지금은 9개 모두 전 유형이지만 분기 지점을 남겨 둔다. */
export function getVisibleCards(taskType: TaskType | ""): ComposerCard[] {
  if (!taskType) return COMPOSER_CARDS;
  return COMPOSER_CARDS.filter((card) => !card.taskTypes || card.taskTypes.includes(taskType));
}

/** 이 분류 유형에서 보여줄 필드. */
export function getCardFields(id: ComposerCardId, taskType: TaskType | ""): ComposerField[] {
  return getCard(id).fields.filter((field) => {
    if (!taskType || !field.taskTypes) return true;
    return field.taskTypes.includes(taskType);
  });
}

/**
 * 선택지의 화면 이름. 저장값(`choices`)은 영어로 두고 보이는 이름만 바꾼다
 * (docs/MATERIAL_PICKER.md §8). 이름표가 없으면 저장값을 그대로 보인다.
 */
export function choiceLabel(field: ComposerField, value: string): string {
  return field.choiceLabels?.[value] ?? value;
}

/** `entryKeys` 행의 화면 이름. 이름표가 없으면 키를 그대로 보인다(클래스 이름 등). */
export function entryLabel(field: ComposerField, key: string): string {
  return field.entryLabels?.[key] ?? MONTH_RANGE_LABELS[key] ?? key;
}

/**
 * 표준 보고 항목인지 — TS 4213 이 성적서에 적으라고 요구하는 항목.
 *
 * 어느 필드가 그것인지는 **카드가 선택 카드인지로 정해진다**: 선택 카드 안의 필수 필드다.
 * 재료 고르기에서는 "권장"으로 보이고 항목마다 체크하며 기본은 꺼짐이다. 끈 항목은 성적서에
 * "제공되지 않음"으로 찍힌다(docs/MATERIAL_PICKER.md §6).
 */
export function isStandardReportingField(card: ComposerCard, field: ComposerField): boolean {
  return !card.locked && field.kind === "required";
}

/**
 * 재료 고르기 화면의 대분류 4개와 그 안의 카드(docs/MATERIAL_PICKER.md §2).
 *
 * 이 순서가 **카탈로그 순서이자 입력 순서**다(§1). 위 `COMPOSER_CARDS` 는 카드 번호 순(①~⑨)이라
 * 순서가 다르다 — 번호는 문서와 코드를 잇는 고리로만 남는다.
 */
export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  { id: "info", name: "의뢰 정보", cardIds: ["clientInfo"] },
  { id: "model", name: "모델", cardIds: ["model", "modelEnv"] },
  { id: "data", name: "데이터", cardIds: ["evalData", "trainingData", "testData", "groundTruth"] },
  { id: "criteria", name: "평가 기준", cardIds: ["perspective", "metrics"] },
];

/** 카드가 속한 대분류. */
export function categoryOf(cardId: ComposerCardId): MaterialCategory {
  const category = MATERIAL_CATEGORIES.find((item) => item.cardIds.includes(cardId));
  if (!category) throw new Error(`Card without a category: ${cardId}`);
  return category;
}

/** 카탈로그 순서로 늘어놓은 카드. 이 분류 유형에서 보이는 카드만. */
export function catalogCards(taskType: TaskType | ""): ComposerCard[] {
  const visible = new Set(getVisibleCards(taskType).map((card) => card.id));
  return MATERIAL_CATEGORIES.flatMap((category) => category.cardIds)
    .filter((id) => visible.has(id))
    .map(getCard);
}

/** 재료 고르기 화면에서 이 필드가 속하는 구분(docs/MATERIAL_PICKER.md §4·§6). */
export function pickKind(card: ComposerCard, field: ComposerField): PickKind {
  if (field.kind === "conditional") return "conditional";
  if (field.kind === "optional") return "optional";
  return isStandardReportingField(card, field) ? "recommended" : "required";
}

/** 쪼갠 항목 하나의 체크 id. */
export function partPickId(field: ComposerField, key: string): string {
  return `${field.id}:${key}`;
}

/** 선택지 화면 이름을 " / " 로 잇는다. */
function choiceList(field: ComposerField): string {
  return (field.choices ?? []).map((choice) => choiceLabel(field, choice)).join(" / ");
}

/**
 * 재료 고르기 화면에서 여러 줄로 쪼개 보일 항목. `parts` 가 없으면 `entryKeys` 에서 만든다
 * (⑥ 데이터 양의 학습·검증, ⑨ 실행 환경의 운영체제·CPU·…).
 */
export function fieldParts(field: ComposerField): FieldPart[] {
  if (field.parts) return field.parts;
  if (!field.entryKeys) return [];
  const format = field.choices
    ? "하나 선택: " + choiceList(field)
    : field.numeric
      ? "숫자"
      : "텍스트";
  return field.entryKeys.map((key) => ({ key, label: entryLabel(field, key), format }));
}

/**
 * 이름 오른쪽에 회색으로 보일 형식(docs/MATERIAL_PICKER.md §8). 레지스트리에 적은 `format` 이
 * 있으면 그것을, 없으면 입력 방식과 선택지에서 만든다 — 선택지를 고칠 때 형식 문구가 따로
 * 낡지 않게 한다.
 */
export function fieldFormat(field: ComposerField): string {
  if (field.format) return field.format;
  const withNote = (base: string) => (field.allowsNote ? base + ". 덧붙이는 글 가능" : base);
  switch (field.input) {
    case "file":
      return "파일";
    case "text":
      return "텍스트";
    case "textarea":
      return "자유서술";
    case "date":
      return "날짜";
    case "monthRange":
      return "시작 월과 끝 월";
    case "number":
      return field.numberRange?.integer ? `숫자. ${field.numberRange.min} 이상의 정수` : "숫자";
    case "single":
      return withNote("하나 선택: " + choiceList(field));
    case "multi":
      return withNote("여러 개 선택: " + choiceList(field));
    case "entries":
      if (field.entryKeysFrom === "classes") return field.numeric ? "클래스마다 숫자" : "클래스마다 한 줄 글";
      if (field.entryKeysFrom === "metrics") return "지표마다 값";
      if (field.entryKeys) return fieldParts(field).map((part) => part.label).join(" · ");
      return "\"이름 = 값\" 줄 추가";
    case "metricSelect":
      return "지표 선택";
    case "column":
      return field.columnRoles && field.columnRoles.length > 1 ? "컬럼 하나 이상" : "컬럼 하나";
  }
}

/**
 * 재료 고르기에서 이 필드를 받기로 했는지(docs/MATERIAL_PICKER.md §5·§6).
 *
 * 필수·조건부 필드는 늘 받는다. 권장·선택 필드는 그 필드나 쪼갠 항목 중 하나라도 체크해 저장했을
 * 때만 받는다. `picks` 가 없으면(재료 고르기 이전의 상태) 모두 받는 것으로 본다 — 종전 화면과 같다.
 */
export function isFieldPicked(
  card: ComposerCard,
  field: ComposerField,
  picks: readonly string[] | undefined,
): boolean {
  const kind = pickKind(card, field);
  if (kind === "required" || kind === "conditional") return true;
  if (!picks) return true;
  return picks.some((id) => id === field.id || id.startsWith(field.id + ":"));
}

/** 쪼갠 항목 하나를 받기로 했는지(③ 홈페이지·팩스). `picks` 가 없으면 받는 것으로 본다. */
export function isPartPicked(
  field: ComposerField,
  key: string,
  picks: readonly string[] | undefined,
): boolean {
  if (!picks) return true;
  return picks.includes(field.id) || picks.includes(partPickId(field, key));
}

/**
 * 이 카드에서 체크할 수 있는 항목 id 를 화면 순서로(docs/MATERIAL_PICKER.md §6).
 *
 * 권장 필드는 필드 한 줄 단위로 체크한다(쪼갠 항목은 나열만 한다). 선택 필드는 하나씩 체크하고,
 * 쪼갠 항목이 있으면 항목마다 체크한다(③ 홈페이지·팩스). 필수·조건부는 체크하지 않는다.
 */
export function pickableIds(cardId: ComposerCardId, taskType: TaskType | ""): string[] {
  const card = getCard(cardId);
  return getCardFields(cardId, taskType).flatMap((field) => {
    const kind = pickKind(card, field);
    if (kind === "recommended") return [field.id];
    if (kind === "optional") {
      return field.parts ? field.parts.map((part) => partPickId(field, part.key)) : [field.id];
    }
    return [];
  });
}

/**
 * ② 에서 고를 수 있는 지표.
 *
 * 레지스트리가 목록을 들지 않고 `getAvailableMetrics` 에 그대로 넘긴다 — 그쪽이 SPEC.md 와
 * 백엔드 노출 규칙의 단일 출처다(멀티레이블에서 M1·M11·M12·M13 을 빼는 결정 포함).
 */
export function getSelectableMetrics(taskType: TaskType | ""): MetricDefinition[] {
  return getAvailableMetrics(taskType || undefined);
}
