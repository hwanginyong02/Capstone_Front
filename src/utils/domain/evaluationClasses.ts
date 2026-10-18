/**
 * 평가 데이터의 클래스(멀티레이블은 레이블) 목록 — 한 곳에서 만든다(B5①).
 *
 * 종전에는 매핑 화면(클래스 설명 칸·양성 클래스 선택지), 학습 데이터 화면(클래스별 데이터 양 칸),
 * 성적서 매퍼(3절 클래스·설명 표)가 세 벌로 따로 계산했다. 셋의 출처 순서가 달라, 매핑에서 정답 컬럼을
 * 바꾸면 화면마다 다른 클래스 목록을 보였다.
 *
 * 출처 순서:
 * 1. 정답(y_true) 컬럼의 전체 고유값(`metadata.column_unique_values[컬럼]` — 백엔드가 전체 행에서 센 값,
 *    멀티레이블은 이미 레이블 단위로 쪼갬). 정답 컬럼을 바꿔도 그 컬럼의 값이다.
 * 2. 업로드 분석이 찾은 클래스(`detected_classes`, 멀티레이블은 `detected_labels`) — 고유값이 많아
 *    1이 비어 있을 때.
 * 3. 정답 컬럼의 샘플값(멀티레이블은 `|`·`,` 로 쪼갬 — 성적서 매퍼·백엔드 파서와 같은 규칙).
 *
 * 정답 컬럼이 없으면 빈 목록이다.
 */
import type { TaskType } from "../../data/evaluationData";
import type { MappingRow } from "../../types/mapping.types";

/** 이 함수가 읽는 메타데이터 키. 스토어의 실제 값은 이보다 넓다. */
export interface ClassMetadata {
  column_unique_values?: Record<string, string[]>;
  detected_classes?: string[];
  detected_labels?: string[];
  positive_class?: string;
}

export function evaluationClassNames(
  taskType: TaskType | "",
  columnMapping: readonly MappingRow[],
  metadata: ClassMetadata | null | undefined,
): string[] {
  const yTrueRow = columnMapping.find((row) => row.confirmedRole === "y_true");
  if (!yTrueRow) return [];

  const unique = metadata?.column_unique_values?.[yTrueRow.originalName];
  if (unique && unique.length > 0) return [...unique];

  const detected = metadata?.detected_classes?.length ? metadata.detected_classes : metadata?.detected_labels;
  if (detected && detected.length > 0) return [...detected];

  if (taskType === "multilabel") {
    const atoms = yTrueRow.sampleValues.flatMap((value) =>
      value.split(/[|,]/).map((item) => item.trim()).filter(Boolean),
    );
    return [...new Set(atoms)];
  }
  return [...new Set(yTrueRow.sampleValues)];
}

/**
 * 다시 정할 때 전에 고른 양성 클래스를 지킨다 — 새 클래스 목록에 있으면 그대로, 없으면 `fallback`.
 *
 * - 파일을 다시 올리면 분석이 metadata 를 통째로 덮는다. 전에 고른 값이 새 파일에도 있으면 유지한다
 *   (M5 — 종전에는 다시 올릴 때마다 자동 판단 값으로 조용히 뒤집혔다). `fallback` 은 새 분석의 값.
 * - 매핑에서 정답 컬럼을 바꿔 전에 고른 값이 새 목록에 없으면 비운다(B5④) — 사용자가 다시 고른다.
 *   `fallback` 은 "".
 * - 클래스 목록이 비면(아직 알 수 없음) 전에 고른 값을 그대로 둔다.
 */
export function keepPositiveClass(previous: string, classNames: readonly string[], fallback: string): string {
  if (!previous) return fallback;
  if (classNames.length === 0) return previous;
  return classNames.includes(previous) ? previous : fallback;
}

/**
 * 지금 클래스의 값만 남긴다 — 다른 파일·다른 정답 컬럼에서 적어 둔 옛 클래스 키를 뺀다(N1).
 *
 * 클래스 레이블 설명은 클래스 값을 키로 저장된다. 파일을 바꾸거나 정답 컬럼을 바꾸면 옛 키가 남는데,
 * 3절은 지금 클래스만 찍으면서 AI 에는 저장된 맵 전체가 갔다. 둘 다 이 함수를 거친 값을 쓴다.
 * 클래스 목록이 비면(정답 컬럼 없음) 아무것도 남지 않는다 — 3절도 찍지 않는다.
 */
export function currentClassEntries(
  values: Record<string, string>,
  classNames: readonly string[],
): Record<string, string> {
  const current = new Set(classNames);
  return Object.fromEntries(Object.entries(values).filter(([key]) => current.has(key)));
}
