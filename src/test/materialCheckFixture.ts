/**
 * 섹션 테스트용 재료 선택 점검 결과. 판정은 실제 `checkMaterialSelection` 이 한다 — 섹션 테스트가
 * 손으로 만든 결과를 그리면 점검 함수와 인쇄가 어긋나도 모른다.
 */
import { checkMaterialSelection } from "../lib/report/materialCheck";
import type { MaterialCheckAck, MaterialCheckResult, ReportMaterials } from "../types/finalReport.types";

const row = (item: number, label: string, value: string | null = "있음") => ({ label, value, item });

export function materialCheckFixture(
  options: { missingLatencyAndLabel?: boolean; realTime?: boolean } = {},
  ack: MaterialCheckAck | null = null,
): MaterialCheckResult {
  const materials: ReportMaterials = {
    declarations: [],
    training: [row(1, "학습 데이터셋명"), row(3, "편향 감소 노력"), row(9, "채널 효과")],
    test: [row(2, "평가 데이터 출처")],
    groundTruth: [
      row(4, "정답 라벨 구축 방법", options.missingLatencyAndLabel ? null : "도메인 전문가"),
      row(5, "정답 라벨 신뢰성"),
    ],
    environment: [row(11, "학습 가속"), row(11, "추론 가속")],
    hyperparameters: { algorithm: "XGBoost", rows: [{ name: "max_depth", value: "6" }] },
  };
  return checkMaterialSelection({
    taskType: "binary",
    materials,
    systemSpec: { os: "Ubuntu", cpu: "Xeon", gpu: "A100", memory: "64GB", software: "Python" },
    latencyMapped: !options.missingLatencyAndLabel,
    perspective: options.realTime ? { usageMode: { text: "Real-time" } } : { usageMode: { text: "Batch" } },
    selectedMetricIds: ["M1"],
    beta: 1,
    imbalanceRatio: 2,
    distributionSource: "validation",
    ack,
  });
}
