/**
 * 재료 선택 점검 — "성적서 목적에 필요한 재료를 골랐나"를 코드 규칙으로 판정한다
 * (입력 설계 › 재료 선택 점검, 점검 표 1.0).
 *
 * - 판정은 이 함수 한 곳에서만 한다. `mapWorkflowToFinalReport` 가 한 번 부르고, 생성 전 안내·
 *   지표 화면 미리보기·인쇄·진행 기록은 그 결과를 읽기만 한다.
 * - 2층은 성적서가 실제로 "제공되지 않음"을 찍는 값을 그대로 센다(`buildReportMaterials` 의 null 줄,
 *   4절 실행 환경 `systemSpec`). 그래서 화면 안내와 성적서가 어긋나지 않는다.
 * - 2·3층이 부족해도 진행을 막지 않는다(6절). 1층 빈칸은 검증 화면이 따로 막는다.
 * - AI·심판에는 보내지 않는다. 같은 입력에는 늘 같은 결과다(시각은 진행 기록에서 받는다).
 *
 * 버전 규칙: "주.부". 같은 입력의 판정이 바뀌면 주, 문구만 바뀌면 부를 올린다. 버전과 규칙 표는
 * `materialCheck.test.ts` 가 리터럴로 고정한다.
 */
import type { TaskType } from "../../data/evaluationData";
import type { ComposerValueMap } from "../../types/reportComposer.types";
import type {
  MaterialCheckAck,
  MaterialCheckItem,
  MaterialCheckLine,
  MaterialCheckResult,
  EvalEnvironment,
  ReportMaterials,
} from "../../types/finalReport.types";
import { printedImbalanceRatio } from "./buildDatasetDiagnosis";
import { formatKstDateTime } from "./issuanceApi";
import { AVERAGING_BY_PRIORITY, NOT_PROVIDED, choiceLabel } from "./reportMaterials";
import { josaEunNeun, josaEuroRo } from "./koreanJosa";

export const MATERIAL_CHECK_VERSION = "1.0";

type SystemSpec = EvalEnvironment["systemSpec"];

/** 4번 줄의 "불균형이 크다" 기준(IR > 9, KEEL·Fernández 외). */
export const HIGH_IMBALANCE_RATIO = 9;

/**
 * 2층 보고 항목(재료 선택 점검 4.2 의 #1~#12). `impact` 는 빠졌을 때 판단할 수 없게 되는 것이다
 * (서술 설계 › 성적서 고정 문구 2.2 — 표에 없던 항목의 문안은 여기서 채웠다).
 */
export const REPORTING_ITEMS: ReadonlyArray<{ item: number; name: string; impact: string; multilabelOnly?: true }> = [
  { item: 1, name: "학습 데이터의 출처·크기·구성", impact: "평가 결과를 학습 데이터와 견주어 해석할 수 있는지" },
  { item: 2, name: "평가 데이터 출처", impact: "평가 데이터가 용도를 대표하는지" },
  { item: 3, name: "편향 감소 노력", impact: "데이터 편향을 분석하고 줄였는지" },
  { item: 4, name: "정답 라벨 구축 방법", impact: "정답 라벨을 얼마나 믿을 수 있는지" },
  { item: 5, name: "정답 라벨 신뢰성", impact: "정답 라벨의 오류가 성능 수치에 얼마나 섞였는지" },
  { item: 6, name: "대표 작동 지점의 TP·FP 건수", impact: "오류 건수를 확인할 수 있는지" },
  { item: 7, name: "추론 환경", impact: "결과가 어떤 하드웨어·소프트웨어에서 나왔는지" },
  { item: 8, name: "추론 효율성(지연시간)", impact: "응답 속도가 용도에 맞는지" },
  { item: 9, name: "학습 데이터의 채널 효과", impact: "모델이 내용 대신 수집 방식을 배웠는지" },
  { item: 10, name: "하이퍼파라미터", impact: "같은 조건으로 모델을 다시 만들거나 공정하게 비교할 수 있는지" },
  { item: 11, name: "가속 사용", impact: "응답 시간이 어떤 조건에서 나온 값인지" },
  { item: 12, name: "멀티레이블 지표 선택 기준", impact: "고른 지표가 무엇을 확인하기 위한 것인지", multilabelOnly: true },
];

/**
 * 3번 줄 — 클래스 중요도에 맞는 평균 방식 지표. 다중 클래스 Accuracy(M1)는 마이크로로 인정하고
 * (값이 같다), 클래스별 표(M22)는 세 평균을 모두 찍으므로 어느 답에도 인정한다.
 */
export const AVERAGING_METRICS: Record<"multiclass" | "multilabel", Record<string, string[]>> = {
  multiclass: {
    "All equal": ["M2", "M3", "M4", "M5", "M11", "M22"],
    "Larger classes first": ["M13", "M22"],
    "Individual samples first": ["M1", "M12", "M22"],
  },
  multilabel: {
    "All equal": ["M2", "M3", "M4", "M5", "M22"],
    "Larger classes first": ["M22"],
    "Individual samples first": ["M22"],
  },
};

/** 3번 줄이 미충족일 때 "추가"로 권하는 지표 하나. */
const AVERAGING_RECOMMENDATION: Record<"multiclass" | "multilabel", Record<string, string>> = {
  multiclass: { "All equal": "M11", "Larger classes first": "M13", "Individual samples first": "M12" },
  multilabel: { "All equal": "M22", "Larger classes first": "M22", "Individual samples first": "M22" },
};

export interface MaterialCheckInput {
  taskType: TaskType;
  /** 성적서가 찍는 고객 재료 줄(`buildReportMaterials`). */
  materials: ReportMaterials;
  /** 4절 실행 환경 다섯 칸. 빈 칸은 "제공되지 않음" 문자열이다. */
  systemSpec: SystemSpec;
  /** 지연시간(latency) 컬럼을 매핑했는가. */
  latencyMapped: boolean;
  /** ⑤ 평가 관점 값(선언 3개). */
  perspective: ComposerValueMap;
  selectedMetricIds: readonly string[];
  /** Fβ 의 β(`resolveBeta`). */
  beta: number;
  /** 불균형 비율(`imbalanceRatioOf`)과 그 분포의 출처. 모르면 null. */
  imbalanceRatio: number | null;
  distributionSource: "validation" | "upload" | null;
  /** 생성 전 안내 확인 기록. */
  ack?: MaterialCheckAck | null;
}

function reportingItems(input: MaterialCheckInput): MaterialCheckItem[] {
  const { materials, taskType } = input;
  const tagged = [...materials.training, ...materials.test, ...materials.groundTruth, ...materials.environment];

  const judge = (item: number): { provided: boolean; missing: string[] } => {
    switch (item) {
      case 6:
        return { provided: true, missing: [] }; // 시스템이 늘 계산한다(혼동행렬).
      case 7: {
        const labels: Array<[keyof SystemSpec, string]> = [
          ["os", "운영체제"],
          ["cpu", "CPU"],
          ["gpu", "GPU"],
          ["memory", "메모리"],
          ["software", "소프트웨어"],
        ];
        const missing = labels
          .filter(([key]) => !input.systemSpec[key]?.trim() || input.systemSpec[key] === NOT_PROVIDED)
          .map(([, label]) => label);
        return { provided: missing.length === 0, missing };
      }
      case 8: // 사용 방식과 무관하게 센다.
        return input.latencyMapped ? { provided: true, missing: [] } : { provided: false, missing: ["지연시간 컬럼"] };
      case 10: {
        const missing = [
          ...(materials.hyperparameters.algorithm === null ? ["알고리즘"] : []),
          ...(materials.hyperparameters.rows === null ? ["하이퍼파라미터"] : []),
        ];
        return { provided: missing.length === 0, missing };
      }
      case 12:
        return materials.metricRationale ? { provided: true, missing: [] } : { provided: false, missing: ["지표 선택 이유"] };
      default: {
        // 여러 줄 항목은 모든 줄이 있어야 제공이다.
        const rows = tagged.filter((row) => row.item === item);
        const missing = rows.filter((row) => row.value === null).map((row) => row.label);
        return { provided: rows.length > 0 && missing.length === 0, missing: rows.length > 0 ? missing : ["(입력 없음)"] };
      }
    }
  };

  return REPORTING_ITEMS.filter((def) => !def.multilabelOnly || taskType === "multilabel").map((def) => ({
    item: def.item,
    name: def.name,
    impact: def.impact,
    ...judge(def.item),
  }));
}

function answerOf(perspective: ComposerValueMap, fieldId: string): string | null {
  const value = perspective[fieldId];
  return value && !value.unknown && value.text ? value.text : null;
}

function purposeLines(input: MaterialCheckInput, latencyProvided: boolean): MaterialCheckLine[] {
  const { taskType, perspective } = input;
  const picked = new Set(input.selectedMetricIds);
  const lines: MaterialCheckLine[] = [];

  // ① 대화형 → 지연시간. 2층 8번과 같은 판정값을 쓴다.
  if (answerOf(perspective, "usageMode") === "Real-time") {
    const declared = choiceLabel("perspective", "usageMode", "Real-time");
    lines.push({
      id: "latency",
      met: latencyProvided,
      title: "사용 방식 → 지연시간",
      declared,
      recommended: [],
      shortfall: `의뢰자가 사용 방식을 "${declared}"${josaEuroRo(declared)} 밝혔으나 응답시간(latency) 자료가 제공되지 않아, 응답 속도가 용도에 맞는지 판단할 수 없다.`,
    });
  }

  // ② 이진 위험 방향 → 재현율 또는 β > 1 인 Fβ / 정밀도 또는 β < 1 인 Fβ.
  const risk = taskType === "binary" ? answerOf(perspective, "criticalErrorType") : null;
  if (risk === "Missed (FN)" || risk === "False alarm (FP)") {
    const fn = risk === "Missed (FN)";
    const declared = choiceLabel("perspective", "criticalErrorType", risk);
    const fbetaFits = picked.has("M5") && (fn ? input.beta > 1 : input.beta < 1);
    lines.push({
      id: "riskDirection",
      met: picked.has(fn ? "M3" : "M2") || fbetaFits,
      title: "위험 방향 → 재현율·정밀도",
      declared,
      recommended: [fn ? "M3" : "M2"],
      shortfall: fn
        ? `의뢰자가 위험 방향을 "${declared}"${josaEuroRo(declared)} 밝혔으나, 이에 맞는 재현율(Recall) 또는 β가 1보다 큰 Fβ가 시험 항목에 없다.`
        : `의뢰자가 위험 방향을 "${declared}"${josaEuroRo(declared)} 밝혔으나, 이에 맞는 정밀도(Precision) 또는 β가 1보다 작은 Fβ가 시험 항목에 없다.`,
    });
  }

  // ③ 다중·멀티 클래스 중요도 → 맞는 평균 방식 지표.
  const priority = taskType !== "binary" ? answerOf(perspective, "classPriority") : null;
  const averaging = priority ? AVERAGING_BY_PRIORITY[priority] : undefined;
  if (taskType !== "binary" && priority && averaging) {
    const declared = choiceLabel("perspective", "classPriority", priority);
    lines.push({
      id: "averaging",
      met: AVERAGING_METRICS[taskType][priority].some((id) => picked.has(id)),
      title: "클래스 중요도 → 평균 방식",
      declared,
      recommended: [AVERAGING_RECOMMENDATION[taskType][priority]],
      shortfall: `의뢰자가 클래스 중요도를 "${declared}"${josaEuroRo(declared)} 밝혔으나, 이에 맞는 ${averaging} 지표가 시험 항목에 없다.`,
    });
  }

  // ④ 이진, 곡선 지표(M9·M10)를 골랐고 IR > 9 → AUPRC(M10). 3절과 같은 자릿수로 비교한다.
  const ratio = input.imbalanceRatio;
  if (
    taskType === "binary" &&
    (picked.has("M9") || picked.has("M10")) &&
    ratio !== null &&
    printedImbalanceRatio(ratio) > HIGH_IMBALANCE_RATIO
  ) {
    const shown = ratio.toFixed(2);
    lines.push({
      id: "curveImbalance",
      met: picked.has("M10"),
      title: "큰 불균형 → AUPRC",
      declared: `불균형 비율 ${shown}`,
      recommended: ["M10"],
      shortfall: `불균형 비율(IR)이 ${shown}${josaEuroRo(shown)} 9를 넘고 곡선 지표를 골랐으나, AUPRC가 시험 항목에 없다. AUROC만으로는 불균형이 큰 데이터의 성능을 충분히 보여 주지 못한다.`,
    });
  }
  return lines;
}

/** 재료 선택 점검(점검 표 1.0). */
export function checkMaterialSelection(input: MaterialCheckInput): MaterialCheckResult {
  const items = reportingItems(input);
  const latencyProvided = items.find((item) => item.item === 8)?.provided ?? false;
  const lines = purposeLines(input, latencyProvided);

  const missingItems = items.filter((item) => !item.provided);
  const unmetLines = lines.filter((line) => !line.met);
  const warningIds = [
    ...missingItems.map((item) => `reporting:${item.item}`),
    ...unmetLines.map((line) => `purpose:${line.id}`),
  ];

  // 진행 기록은 점검 표 버전이 같고 지금 경고를 모두 담았을 때만 인정한다.
  const ack = input.ack;
  const acknowledged =
    !!ack && ack.version === MATERIAL_CHECK_VERSION && warningIds.every((id) => ack.warningIds.includes(id));
  const acknowledgement = acknowledged ? { at: ack.at, version: ack.version } : null;

  const provided = items.length - missingItems.length;
  const names = missingItems.map((item) => item.name);
  const lastName = names[names.length - 1] ?? "";

  const averagingLine = unmetLines.find((line) => line.id === "averaging");
  const averaging = averagingLine && input.taskType === "multiclass" ? AVERAGING_BY_PRIORITY[answerOf(input.perspective, "classPriority") ?? ""] : undefined;

  return {
    version: MATERIAL_CHECK_VERSION,
    reporting: { total: items.length, provided, items },
    purpose: { applicable: lines.length, met: lines.length - unmetLines.length, lines },
    warningIds,
    imbalanceRatio: input.imbalanceRatio,
    distributionSource: input.distributionSource,
    acknowledgement,
    printed: {
      cover:
        missingItems.length === 0
          ? "기준 표준: ISO/IEC TS 4213:2022"
          : "ISO/IEC TS 4213:2022에 따라 평가. 일부 보고 항목 미제공(1.4 참조)",
      ...(missingItems.length > 0
        ? {
            notProvided:
              `ISO/IEC TS 4213이 보고를 요구하는 항목 중 ${names.join(", ")}${josaEunNeun(lastName)} 의뢰자로부터 ` +
              "제공받지 못해 기재하지 않았다. 따라서 본 결과서는 이 항목들에 대해 TS 4213의 보고 요구를 충족하지 않는다.",
          }
        : {}),
      impacts: missingItems.map((item) => `${item.name}: ${item.impact} 판단할 수 없다.`),
      purposeShortfalls: unmetLines.map((line) => line.shortfall),
      summary: [
        {
          label: "보고 항목 제공",
          value: `${items.length}개 중 ${provided}개`,
          note: names.length > 0 ? `빠진 항목: ${names.join(", ")} (1.4 참조)` : "TS 4213 보고 항목 모두 제공",
        },
        {
          label: "목적별 점검",
          value: lines.length > 0 ? `${lines.length}줄 중 ${lines.length - unmetLines.length}줄 충족` : "해당 없음",
          note:
            unmetLines.length > 0
              ? `미충족: ${unmetLines.map((line) => line.title).join(", ")} (1.4 참조)`
              : lines.length > 0
                ? "선언에 맞는 재료를 모두 갖춤"
                : "점검할 선언 없음",
        },
        {
          label: "생성 전 안내 확인",
          value:
            warningIds.length === 0
              ? "안내할 부족 없음"
              : acknowledgement
                ? `확인 후 진행 (${formatKstDateTime(acknowledgement.at)})`
                : "확인 기록 없음",
          note: `점검 표 ${MATERIAL_CHECK_VERSION}`,
        },
      ],
      ...(averaging
        ? {
            averagingSentence: `의뢰자가 클래스 중요도를 "${averagingLine!.declared}"${josaEuroRo(averagingLine!.declared)} 밝혔으나, 이에 맞는 ${averaging} 지표는 시험 항목에 없다(1.4 참조).`,
          }
        : {}),
    },
  };
}
