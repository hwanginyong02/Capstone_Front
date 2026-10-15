/**
 * 재료 레지스트리 — 성적서 구성 화면의 단일 출처.
 *
 * `docs/COMPOSER_COMPONENTS.md` 의 카드 9개(필수 5개, 선택 4개)와 그 안의 필드를 코드가 읽는
 * 설정으로 옮긴 것이다. 구성 화면의 카드·상세 영역·하단 요약, 단계 목록 계산, 필수 입력
 * 점검이 전부 이 파일 하나를 읽는다 — 같은 표를 여러 군데 베껴 두면 문서와 화면이 조용히
 * 어긋난다.
 *
 * 쓰는 곳: `components/report-composer/*`(구성 화면), `data/workflowSteps.ts`·
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
  type ComposerPreset,
  type ComposerSelection,
  type OptionalCardId,
} from "../types/reportComposer.types";

/**
 * 카드 9개. 배열 순서가 화면 순서다(필수 ①~⑤ 한 줄, 선택 ⑥~⑨ 한 줄).
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
    viewer: "csvExample",
    // 파일은 Evaluation File 에서 받고, 컬럼 매핑·양성 클래스·결정 임계값은 Column mapping 에서 확인한다.
    steps: ["upload", "mapping"],
    fields: [
      {
        id: "resultFile",
        label: "결과 파일",
        inputExample: "predictions.csv (CSV 또는 JSON, 20 MiB 이하)",
        kind: "required",
        input: "file",
        mono: true,
        step: "upload",
        reportSection: "4절",
      },
    ],
  },
  {
    id: "metrics",
    number: "②",
    name: "지표와 합격 기준",
    description: "어떤 지표로 몇 점이면 합격인지 정합니다.",
    locked: true,
    viewer: "metricList",
    // 합격 기준과 핵심 지표는 Details 에서 받는다(docs/WORKFLOW_REDESIGN.md §11.2).
    steps: ["metrics", "clientInfo"],
    fields: [
      {
        id: "selectedMetrics",
        label: "지표",
        inputExample: "아래 지표 목록에서 고름 (최소 1개)",
        kind: "required",
        input: "metricSelect",
        reportSection: "3절",
        sentToAi: true,
      },
      {
        id: "passCriteria",
        label: "합격 기준",
        inputExample: "Accuracy ≥ 0.85",
        kind: "required",
        input: "entries",
        entryKeysFrom: "metrics",
        mono: true,
        reportSection: "6절",
        sentToAi: true,
      },
      {
        id: "beta",
        label: "β",
        inputExample: "1.0",
        kind: "conditional",
        conditionLabel: "Fβ를 골랐을 때",
        input: "number",
        mono: true,
        reportSection: "6절",
      },
      {
        // 멀티레이블에서만 묻는다. 세 지표군의 뜻이 서로 달라 고른 이유를 성적서에 적는다.
        id: "metricRationale",
        label: "지표 선택 이유",
        inputExample: "오차를 고르게 봄 / 모든 레이블 일치 / 겹치는 정도 / 기타(직접 입력)",
        kind: "required",
        taskTypes: ["multilabel"],
        input: "single",
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
        help: "멀티레이블 지표는 저마다 다른 것을 묻기 때문에, 이 지표를 고른 이유를 성적서에 적습니다.",
        // 지표 격자 바로 아래에서 받는다. 카드의 나머지 필드는 다른 화면이 맡아 따로 검사한다.
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
         * 목표값과 함께 결정되므로 목표값을 적는 Details 의 합격 기준 표에서 고른다
         * (`pages/report/ReportInfo.tsx`).
         */
        id: "coreMetrics",
        label: "핵심 지표",
        inputExample: "유형별 기본값: Accuracy · F1 (이진). 최소 1개",
        kind: "required",
        input: "metricSelect",
        step: "clientInfo",
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
        label: "회사 정보",
        inputExample:
          "회사명: (주)테스트기업 · 대표자: 홍길동 · " +
          "사업자등록번호: 123-45-67890 · 전화번호: 02-1234-5678 · 주소: 서울시 …",
        kind: "required",
        input: "text",
        reportSection: "1절",
      },
      {
        id: "reportPurpose",
        label: "성적서 용도",
        inputExample: "내부 검증 / 외부 제출 / 과제 제출 (덧붙이는 글 가능)",
        kind: "required",
        input: "single",
        choiceLabels: {
          "Internal review": "내부 검증",
          "External submission": "외부 제출",
          "Project submission": "과제 제출",
        },
        choices: ["Internal review", "External submission", "Project submission"],
        reportSection: "1절",
      },
      {
        id: "projectInfo",
        label: "과제 정보",
        inputExample: "과제명 · 과제 기관",
        kind: "conditional",
        conditionLabel: "과제 제출일 때",
        requiredWhen: { field: "reportPurpose", equals: "Project submission" },
        input: "text",
        reportSection: "1절",
      },
      {
        id: "contactExtra",
        label: "홈페이지·팩스",
        inputExample: "https://example.com · 02-1234-5679",
        kind: "optional",
        input: "text",
        advanced: true,
        reportSection: "1절",
      },
      {
        id: "projectNumber",
        label: "과제 번호",
        inputExample: "2026-PRJ-001",
        kind: "optional",
        input: "text",
        advanced: true,
        mono: true,
        reportSection: "1절",
      },
      {
        id: "requestDate",
        label: "평가 의뢰일",
        inputExample: "기본값 오늘",
        kind: "optional",
        input: "date",
        advanced: true,
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
    // 이름·버전은 run 을 식별하는 이름표라 Evaluation File 에서, 용도는 성적서 서식용이라 Details 에서.
    steps: ["upload", "clientInfo"],
    fields: [
      {
        id: "modelNameVersion",
        label: "모델 이름·버전",
        inputExample: "이름: ChurnPredictor · 버전: v1.0.0 (버전 기본값 v1.0.0)",
        kind: "required",
        input: "text",
        mono: true,
        step: "upload",
        reportSection: "2절",
        sentToAi: true,
      },
      {
        id: "modelPurpose",
        label: "모델 용도",
        inputExample: "통신사 고객 이탈 예측",
        kind: "required",
        input: "text",
        step: "clientInfo",
        reportSection: "2절",
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
    // 단계가 따로 없다 — 지표 선택 화면 맨 위에서 받는다(docs/WORKFLOW_REDESIGN.md §10).
    steps: ["metrics"],
    help:
      "답에 따라 알맞은 지표를 추천하고, 고른 지표가 맞지 않으면 지표 화면에서 알려 줍니다. " +
      "다음으로 넘어가는 것은 막지 않습니다.",
    // 유형에 따라 필드가 갈리지만 사용자는 **항상 두 개**를 받는다.
    fields: [
      {
        id: "criticalErrorType",
        label: "중요 오류 유형",
        inputExample: "놓침(FN) / 잘못 잡음(FP) / 비슷함",
        kind: "required",
        taskTypes: ["binary"],
        input: "single",
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
          "놓침을 고르면 Recall 이나 β가 1보다 큰 Fβ를, 잘못 잡음을 고르면 Precision 이나 " +
          "β가 1보다 작은 Fβ를 추천합니다.",
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
        help: "차례대로 매크로·가중·마이크로 평균 지표에 대응합니다.",
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
        choiceLabels: {
          "Real-time": "실시간 응답",
          Batch: "일괄 처리",
        },
        choices: ["Real-time", "Batch"],
        reportLabels: { "Real-time": "대화형(실시간)", Batch: "배치" },
        help: "실시간 응답을 고르면 파일에 응답시간(latency) 컬럼이 있는지 확인합니다.",
        standardClause: "6.6.2",
        reportSection: "5절",
        sentToAi: true,
      },
    ],
  },

  // ─── 선택 카드 ⑥~⑨ — 끄면 안의 필수 항목이 "제공되지 않음"으로 찍힌다 ─────────
  {
    id: "trainingData",
    number: "⑥",
    name: "학습 데이터",
    description: "모델을 훈련할 때 쓴 데이터입니다.",
    locked: false,
    steps: ["dataInfo"],
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
        advanced: true,
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
        reportSection: "7절",
      },
      {
        // Details 의 학습 데이터 폼에만 있던 칸이다. 폼을 이 카드로 합치면서 옮겼다.
        id: "trainingDataFormat",
        label: "데이터 형식",
        inputExample: "정형 CSV, 이미지(JPG/PNG), 텍스트",
        kind: "optional",
        input: "text",
        advanced: true,
        reportSection: "7절",
      },
      {
        id: "trainingNotes",
        label: "비고",
        inputExample: "학습 데이터에 대해 그 밖에 알릴 것 (직접 입력)",
        kind: "optional",
        input: "textarea",
        advanced: true,
        reportSection: "7절",
      },
    ],
  },
  {
    id: "testData",
    number: "⑦",
    name: "테스트 데이터",
    description: "성능을 잰 테스트 데이터의 출처입니다.",
    locked: false,
    steps: ["dataInfo"],
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
        advanced: true,
        mono: true,
        reportSection: "4절",
        sentToAi: true,
      },
      {
        /**
         * 학습과 평가 데이터의 전처리가 같은가 — 종전의 자유서술 세 칸(⑥ 전처리, ⑦ 전처리·전처리
         * 내용)을 이 한 칸으로 바꿨다(서술 설계 D44).
         *
         * TS 4213 5.3.3 은 전처리를 "주의를 기울여야 할 것"으로만 적고 보고를 요구하지 않는다.
         * 걱정하는 것은 일관되지 않은 전처리가 해석을 비트는 경우라, 같은지만 묻고 코드가 조건으로
         * 쓸 수 있게 선택지로 받는다. 전처리가 채널 효과의 원인이면 ⑥ "Different processing"이 받는다.
         */
        id: "preprocessingMatch",
        label: "학습과 같은 전처리",
        inputExample: "같음 / 다름 / 모름 (덧붙이는 글 가능)",
        kind: "optional",
        input: "single",
        choiceLabels: {
          Same: "같음",
          Different: "다름",
          Unknown: "모름",
        },
        choices: ["Same", "Different", "Unknown"],
        allowsNote: true,
        help: "학습 데이터와 테스트 데이터를 같은 방식으로 전처리했는지입니다.",
        reportSection: "정할 것",
        sentToAi: true,
        reportLabels: { Same: "같음", Different: "다름", Unknown: "모름" },
      },
    ],
  },
  {
    id: "groundTruth",
    number: "⑧",
    name: "정답 라벨",
    description: "테스트 데이터의 정답을 누가, 어떻게 붙였는지입니다.",
    locked: false,
    steps: ["dataInfo"],
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
        conditionLabel: "복수 교차 검수일 때",
        requiredWhen: { field: "labelReview", equals: "Several reviewers" },
        input: "number",
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
        conditionLabel: "복수 교차 검수일 때",
        requiredWhen: { field: "labelReview", equals: "Several reviewers" },
        input: "single",
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
        conditionLabel: "측정한 일치도 종류를 골랐을 때",
        requiredWhen: [
          { field: "labelReview", equals: "Several reviewers" },
          {
            field: "labelAgreementKind",
            in: ["Percent agreement", "Cohen's kappa", "Fleiss' kappa", "Krippendorff's alpha", "Other"],
          },
        ],
        input: "number",
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

/** 선택 카드 — 켜고 끌 수 있다. 배열 순서가 화면 순서다. */
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

/**
 * 이 분류 유형에서 보여줄 필드.
 *
 * `includeAdvanced` 가 거짓이면 더보기로 접히는 필드를 뺀다 — 상세 영역이 처음 보여주는
 * 목록이 그것이다.
 */
export function getCardFields(
  id: ComposerCardId,
  taskType: TaskType | "",
  options: { includeAdvanced?: boolean } = {},
): ComposerField[] {
  const { includeAdvanced = true } = options;
  return getCard(id).fields.filter((field) => {
    if (!includeAdvanced && field.advanced) return false;
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

/** 더보기로 접히는 필드 수 — "선택 항목 N개 더 보기" 버튼 문구에 쓴다. */
export function countAdvancedFields(id: ComposerCardId, taskType: TaskType | ""): number {
  return getCardFields(id, taskType).filter((field) => field.advanced).length;
}

/**
 * "필수 (표준 보고)" 인지 — TS 4213 이 성적서에 적으라고 요구하는 항목.
 *
 * 문서가 네 번째 구분으로 적지만 어느 필드가 그것인지는 **카드가 선택 카드인지로 정해진다**:
 * 선택 카드를 켜면 그 안의 필수 필드는 반드시 입력해야 하고, 모르면 "모름"을 고른다. 카드를
 * 끄거나 "모름"을 고르면 성적서에 "제공되지 않음"으로 찍힌다
 * (COMPOSER_COMPONENTS "구분 규칙" + 열린 결정).
 */
export function isStandardReportingField(card: ComposerCard, field: ComposerField): boolean {
  return !card.locked && field.kind === "required";
}

/** 켜져 있는 선택 카드 수. 하단 요약의 "선택 카드 n/4" 에 쓴다. */
export function countOptionalOn(selection: ComposerSelection): number {
  return OPTIONAL_CARD_IDS.filter((id) => selection[id]).length;
}

/** 프리셋이 만드는 선택 상태. 최소 구성은 필수 5개만, 전체는 선택 4개까지 켠다. */
export function presetSelection(preset: ComposerPreset): ComposerSelection {
  const on = preset === "full";
  return OPTIONAL_CARD_IDS.reduce(
    (acc, id) => ({ ...acc, [id]: on }),
    {} as ComposerSelection,
  );
}

/**
 * 현재 상태가 어느 프리셋과 같은지. 어느 쪽도 아니면 `null` —
 * 그때 프리셋 토글은 두 칸 모두 선택 해제로 보인다(COMPOSER_DESIGN "프리셋").
 */
export function matchPreset(selection: ComposerSelection): ComposerPreset | null {
  const onCount = countOptionalOn(selection);
  if (onCount === 0) return "minimal";
  if (onCount === OPTIONAL_CARD_IDS.length) return "full";
  return null;
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
