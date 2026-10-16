/**
 * 클래스별 표(M22, sklearn classification report)를 성적서와 사실 시트가 쓰는 모양으로 바꾼다.
 *
 * 클래스 줄과 평균 줄(매크로·가중·마이크로, 멀티레이블은 샘플 평균도)을 함께 남긴다. 종전에는
 * 평균 줄을 버렸고, 클래스 줄도 Precision·Recall·F1 을 함께 고른 경우에만 지표마다 따로 찍었다
 * — M22 만 고르면 표가 아예 보이지 않았다(재료 목록 9절 "M22 집계행", 서술 설계 D17·D39).
 *
 * `accuracy` 키는 숫자 하나라 표의 줄이 아니다 — Accuracy 는 M1 로 따로 보인다.
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
 * @param classLabels 클래스 줄의 순서(감지된 클래스·레이블). 표에 있는데 여기 없는 클래스는 뒤에
 *   붙인다.
 */
export function buildClassReportTable(
  classReport: unknown,
  classLabels: readonly string[],
): ClassReportTable | null {
  if (!classReport || typeof classReport !== "object") return null;
  const report = classReport as Record<string, unknown>;

  const classKeys = Object.keys(report).filter((key) => !NON_CLASS_KEYS.has(key));
  const ordered = [
    ...classLabels.filter((label) => classKeys.includes(label)),
    ...classKeys.filter((key) => !classLabels.includes(key)),
  ];

  const rows = ordered.map((label) => toRow(label, report[label])).filter((r): r is ClassReportRow => r !== null);
  const averages = AVERAGE_ROWS.map(([key, label]) => toRow(label, report[key])).filter(
    (r): r is ClassReportRow => r !== null,
  );
  if (rows.length === 0 && averages.length === 0) return null;
  return { rows, averages };
}
