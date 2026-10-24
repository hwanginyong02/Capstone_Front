/**
 * M21(혼동 행렬)을 고른 판 4 합성 데이터 — 판 4 렌더 픽스처 셋(bc·digits·yeast)은 모두 `charts.confusionMatrix: null` 이라
 * M21 그림 갈래가 없다(S4·S5 독립 검토 rv3 지적 1). 픽스처를 복사해 M21 을 고른 run 의 칸만 더한다(S6 질문 3 시험용).
 *
 * - 고른 지표: 앱 지표 정의(`METRICS` M21)로 지표 목록·산정식(판 4 산정식 표 `formulaEd4`)·산출 결과 한 줄(목표 없음 — 참고 지표)을
 *   더한다. 모양은 판 3 보관본(`archive/issued/syn_binary_shift_cm.json`)의 M21 줄과 같다.
 * - 그림 재료(`charts.confusionMatrix`)는 그 픽스처의 혼동 행렬 건수(`confusionCounts`)에서 만든다:
 *   - 이진: [[TN, FP], [FN, TP]] — 행 = 실제(음성·양성), 열 = 예측. bc_strong = [[105, 2], [1, 63]], 171건.
 *   - 다중: 대각 = 클래스별 TP. 틀린 칸은 사실 시트 최다 오분류 쌍(5→6, 5→9, 6→1)과, 남은 FN(7·9·9)을 남은 FP(2·5·8)에 맞춰
 *     7→2, 9→5, 9→8 로 놓은 합성(행 합 = 실제 수, 열 합 = 예측 수가 건수 표와 맞음). 540건.
 *   - 멀티레이블: 레이블마다 [[TN, FP], [FN, TP]](917건) — 판 3 차트 부품의 레이블별 행렬 모양.
 */
import { METRICS } from "../../../data/evaluationData";
import { formulaEd4 } from "../../../lib/report/edition4/metricFormulasEd4";
import type { FinalReportData } from "../../../types/finalReport.types";
import type { ConfusionMatrixData } from "../../../types/report.types";

import { loadEd4, type Ed4Tag } from "./ed4Fixtures";

/** 다중(digits_strong) 틀린 칸 — [실제, 예측, 건수]. 위 머리 주석의 합성 규칙. */
const DIGITS_ERRORS: ReadonlyArray<[string, string, number]> = [
  ["5", "6", 1],
  ["5", "9", 1],
  ["6", "1", 1],
  ["7", "2", 1],
  ["9", "5", 1],
  ["9", "8", 1],
];

function matrixOf(data: FinalReportData): ConfusionMatrixData {
  const counts = data.confusionCounts!;
  const taskType = data.meta.taskType;
  if (taskType === "binary") {
    const r = counts.rows[0];
    return { labels: [...data.datasetInfo.classLabels], matrix: [[r.tn, r.fp], [r.fn, r.tp]], totalSamples: r.tn + r.fp + r.fn + r.tp };
  }
  if (taskType === "multilabel") {
    const per = counts.rows.map((r) => ({ label: r.label, matrix: [[r.tn, r.fp], [r.fn, r.tp]], totalSamples: r.tn + r.fp + r.fn + r.tp }));
    return { labels: [`Negative (${per[0].label})`, `Positive (${per[0].label})`], matrix: per[0].matrix, totalSamples: per[0].totalSamples, multilabelMatrices: per };
  }
  const labels = counts.rows.map((r) => r.label);
  const matrix = counts.rows.map((r, i) => labels.map((_, j) => (i === j ? r.tp : 0)));
  for (const [actual, predicted, n] of DIGITS_ERRORS) matrix[labels.indexOf(actual)][labels.indexOf(predicted)] += n;
  return { labels, matrix, totalSamples: matrix.flat().reduce((a, b) => a + b, 0) };
}

/** 픽스처(tag, kind)에 M21 을 고른 run 의 칸을 더한 합성 데이터. */
export function loadEd4WithM21(tag: Ed4Tag, kind: "final" | "issued"): FinalReportData {
  const data = structuredClone(loadEd4(tag, kind));
  const m21 = METRICS.find((m) => m.id === "M21")!;
  data.metricList = [...data.metricList, { metricId: "M21", name: m21.name, threshold: null, passCriteria: "정보 제공" }];
  data.metricFormulas = [
    ...(data.metricFormulas ?? []),
    { metricId: "M21", name: m21.name, formula: formulaEd4("M21", m21.formula ?? "—"), description: m21.description, isCommon: !!m21.isCommon },
  ];
  data.kpiResults = [
    ...data.kpiResults,
    { metricId: "M21", name: m21.name, value: 0, threshold: null, status: "pass", higherIsBetter: true, isCore: false },
  ] as FinalReportData["kpiResults"];
  data.charts = { ...data.charts, confusionMatrix: matrixOf(data) } as FinalReportData["charts"];
  return data;
}
