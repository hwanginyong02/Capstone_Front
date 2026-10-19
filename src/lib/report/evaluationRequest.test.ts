/**
 * 평가 요청 스냅샷과 파일 지문(서술 라운드 S3b, 점검 유-8).
 */
import { describe, expect, it } from "vitest";

import { buildEvaluationRequestSnapshot, fingerprintOf, sameFile } from "./evaluationRequest";
import { binaryMapping } from "../../hooks/reportJob.harness";

const file = (name = "data.csv", body = "a,b\n1,2\n", lastModified = 1000) => new File([body], name, { lastModified });

describe("sameFile", () => {
  it("이름·바이트·수정 시각이 모두 같아야 같은 파일이다", () => {
    const fp = fingerprintOf(file());
    expect(sameFile(fp, file())).toBe(true);
    expect(sameFile(fp, file("other.csv"))).toBe(false);
    expect(sameFile(fp, file("data.csv", "a,b\n1,2\n3,4\n"))).toBe(false); // 바이트가 다름
    expect(sameFile(fp, file("data.csv", "a,b\n1,2\n", 2000))).toBe(false); // 수정 시각이 다름
  });

  it("지문이나 파일이 없으면 같지 않다", () => {
    expect(sameFile(null, file())).toBe(false);
    expect(sameFile(fingerprintOf(file()), null)).toBe(false);
  });
});

describe("buildEvaluationRequestSnapshot", () => {
  const state = {
    taskType: "binary" as const,
    columnMapping: binaryMapping(),
    selectedMetricIds: ["M1"],
    metricDetails: {},
    metadata: { positive_class: "1", detected_classes: ["0", "1"] },
    decisionThreshold: null,
    basicInfo: { modelName: "모델", modelPurpose: "용도" },
    rawFile: file(),
  };

  it("메모리의 파일 지문을 남긴다", () => {
    expect(buildEvaluationRequestSnapshot(state).file).toEqual({ name: "data.csv", bytes: 8, lastModified: 1000 });
  });

  it("파일이 없으면 지문도 없다", () => {
    expect(buildEvaluationRequestSnapshot({ ...state, rawFile: null }).file).toBeNull();
  });

  it("평가 요청 본문은 매핑 역할을 백엔드 이름으로 옮기고 결정 임계값은 쓰일 때만", () => {
    const { payload, model } = buildEvaluationRequestSnapshot({ ...state, decisionThreshold: 0.3 });
    expect(payload.task_type).toBe("binary");
    expect(payload.selected_metric_ids).toEqual(["M1"]);
    expect(payload.column_mappings.map((m) => m.column)).toEqual(["row_id", "label", "pred", "prob"]);
    expect(payload.decision_threshold).toBeNull(); // 하드 예측이 있어 임계값을 쓰지 않는다
    expect(model).toEqual({ name: "모델", purpose: "용도", category: "", reportPurposeNote: "" });
  });
});
