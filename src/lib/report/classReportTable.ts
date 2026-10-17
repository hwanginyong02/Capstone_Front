/**
 * 클래스별 표(M22, sklearn classification report)를 성적서와 사실 시트가 쓰는 모양으로 바꾼다.
 *
 * 클래스 줄과 평균 줄(매크로·가중·마이크로, 멀티레이블은 샘플 평균도)을 함께 남긴다. 종전에는
 * 평균 줄을 버렸고, 클래스 줄도 Precision·Recall·F1 을 함께 고른 경우에만 지표마다 따로 찍었다
 * — M22 만 고르면 표가 아예 보이지 않았다(재료 목록 9절 "M22 집계행", 서술 설계 D17·D39).
 *
 * `accuracy` 키는 숫자 하나라 클래스 줄이 아니다. 다만 **단일 레이블 다중 클래스**에서는 sklearn 이
 * "micro avg" 대신 이 값을 낸다 — 마이크로 Precision = Recall = F1 = Accuracy 이기 때문이다. 그래서
 * 다중 클래스는 이 값으로 "마이크로 평균" 줄을 만든다. 재료 선택 점검이 "M22 를 고르면 세 평균
 * 방식(매크로·가중·마이크로)이 모두 있다"고 보는 근거가 이 표에 실제로 찍히게 한다.
 */
import type { ClassReportRow, ClassReportTable } from "../../types/finalReport.types";

/** 평균 줄의 키와 성적서에 찍는 이름. 이 순서로 찍는다. */
const AVERAGE_ROWS: Array<[key: string, label: string]> = [
  ["macro avg", "매크로 평균"],
  ["weighted avg", "가중 평균"],
  ["micro avg", "마이크로 평균"],
  ["samples avg", "샘플 평균"],
];

const NON_CLASS_KEYS = new Set(["accuracy", ...AVERAGE_ROWS.map(([key]) => key)]);

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function toRow(label: string, raw: unknown): ClassReportRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  return {
    label,
    precision: num(row.precision),
    recall: num(row.recall),
    // sklearn classification_report 의 키는 "f1-score"
    f1: num(row["f1-score"] ?? row.f1),
    support: num(row.support),
  };
}

/**
 * 다중 클래스에서 "micro avg" 가 없을 때 `accuracy` 로 마이크로 평균 줄을 만든다. support 는 전체
 * 표본 수(매크로 평균 줄의 support)다. 예측에만 나온 클래스가 있으면 sklearn 이 "micro avg" 를
 * 직접 내므로 이 함수는 쓰이지 않는다.
 */
function microFromAccuracy(
  key: string,
  report: Record<string, unknown>,
  taskType: string | undefined,
): Record<string, unknown> | undefined {
  if (key !== "micro avg" || taskType !== "multiclass") return undefined;
  const accuracy = num(report.accuracy);
  if (accuracy === null) return undefined;
  const macro = report["macro avg"];
  const support = macro && typeof macro === "object" ? (macro as Record<string, unknown>).support : undefined;
  return { precision: accuracy, recall: accuracy, "f1-score": accuracy, support };
}

/**
 * @param classLabels 클래스 줄의 순서(감지된 클래스·레이블). 표에 있는데 여기 없는 클래스는 뒤에
 *   붙인다.
 */
export function buildClassReportTable(
  classReport: unknown,
  classLabels: readonly string[],
  taskType?: "binary" | "multiclass" | "multilabel",
): ClassReportTable | null {
  if (!classReport || typeof classReport !== "object") return null;
  const report = classReport as Record<string, unknown>;

  const classKeys = Object.keys(report).filter((key) => !NON_CLASS_KEYS.has(key));
  const ordered = [
    ...classLabels.filter((label) => classKeys.includes(label)),
    ...classKeys.filter((key) => !classLabels.includes(key)),
  ];

  const rows = ordered.map((label) => toRow(label, report[label])).filter((r): r is ClassReportRow => r !== null);
  const averages = AVERAGE_ROWS.map(([key, label]) => toRow(label, report[key] ?? microFromAccuracy(key, report, taskType))).filter(
    (r): r is ClassReportRow => r !== null,
  );
  if (rows.length === 0 && averages.length === 0) return null;
  return { rows, averages };
}
