/**
 * 데이터셋 분포 사전 진단 문구 생성 (3절).
 *
 * 가짜 MOCK 진단문("학습-평가 비율 0.80:0.20, Negative 61.8%..." 등) 대신
 * 실제 클래스 분포(metadata.class_distribution)와 불균형 비율(M23 또는 직접 산출)을
 * 기반으로 사실만 서술한다. (LLM 아님 — 규칙 기반 사실 진술)
 */

export function buildDatasetDiagnosis(
  metadata: { class_distribution?: Record<string, number> } | null | undefined,
  imbalanceRatio?: number,
  droppedRows: number = 0,
  datasetSize?: number,
  taskType?: "binary" | "multiclass" | "multilabel",
): string {
  const dist: Record<string, number> = metadata?.class_distribution ?? {};
  const entries = Object.entries(dist).filter(([, count]) => typeof count === "number");

  const parts: string[] = [];

  if (droppedRows > 0) {
    parts.push(
      `결측치(NaN) 제거 전처리로 인해 전체 행 중 ${droppedRows.toLocaleString()}개 샘플이 평가에서 제외되었다.`,
    );
  }

  if (entries.length > 0) {
    const sumOfCounts = entries.reduce((sum, [, count]) => sum + count, 0);
    // 멀티레이블이면 datasetSize를 사용하거나, 주어지지 않은 경우 sumOfCounts 사용
    const total = datasetSize && datasetSize > 0 ? datasetSize : sumOfCounts;
    
    // 멀티레이블의 경우, 백분율은 해당 클래스의 출현 빈도 / 전체 샘플 수 (즉 총합이 100%가 넘을 수 있음)
    // 멀티클래스/바이너리의 경우 기존처럼 count / sumOfCounts 로 하여 정확히 100%가 되게 함
    const denominator = taskType === "multilabel" ? total : sumOfCounts;
    
    const distText = entries
      .map(
        ([label, count]) =>
          `${label} ${count.toLocaleString()}건(${denominator > 0 ? ((count / denominator) * 100).toFixed(1) : "0.0"}%)`,
      )
      .join(", ");
      
    parts.push(`평가 데이터셋은 총 ${total.toLocaleString()}건이며, 클래스(레이블)별 분포는 ${distText}이다.`);

    const counts = entries.map(([, count]) => count);
    const minCount = Math.min(...counts);
    const ratio =
      typeof imbalanceRatio === "number"
        ? imbalanceRatio
        : minCount > 0
          ? Math.max(...counts) / minCount
          : 0;

    if (entries.length < 2) {
      // 클래스가 1종이면 '가장 많은 클래스 / 가장 적은 클래스' 가 자기 자신이라 비율이
      // 항상 1이 된다. 그것을 그대로 서술하면 "허용 기준 이내의 균형 상태"가 인쇄되는데,
      // 실제로는 평가가 성립하지 않는 데이터다 — 정반대 결론이다(ISSUES.md C-04).
      // 백엔드도 같은 이유로 M23 을 '측정 불가'로 내려보낸다. 여기서 자기가 다시
      // 계산해버리면 백엔드의 판단이 무의미해진다.
      parts.push(
        `정답 클래스가 1종뿐이라 클래스 불균형 비율(Imbalance Ratio)은 정의되지 않는다(측정 불가). ` +
          `분류 성능 지표의 해석에도 주의가 필요하다.`,
      );
    } else if (ratio > 0) {
      const balanced = ratio <= 1.5;
      parts.push(
        `클래스 불균형 비율(Imbalance Ratio)은 ${ratio.toFixed(2)}로, ` +
          (balanced
            ? "허용 기준(≤ 1.50) 이내의 균형 상태이다."
            : "허용 기준(1.50)을 초과하여 클래스 불균형에 따른 성능 지표 해석에 주의가 필요하다."),
      );
    }
  }

  if (parts.length === 0) {
    return "데이터셋 분포 정보가 제공되지 않았습니다.";
  }

  return parts.join(" ");
}
