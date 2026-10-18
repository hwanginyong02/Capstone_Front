/** 클래스 목록 한 곳(B5①)과 양성 클래스 유지(B5④·M5). */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { MappingRow } from "../../types/mapping.types";
import { mapWorkflowToFinalReport, type MapWorkflowToReportInput } from "../../lib/report/mapWorkflowToFinalReport";
import { DEFAULT_BASIC_INFO } from "../../types/workflow.types";
import { evaluationClassNames, keepPositiveClass } from "./evaluationClasses";

const row = (name: string, role: MappingRow["confirmedRole"], samples: string[] = []): MappingRow => ({
  originalName: name,
  sampleValues: samples,
  inferredRole: role,
  confirmedRole: role,
  modified: false,
  warnings: [],
});

describe("evaluationClassNames", () => {
  const mapping = [row("label", "y_true", ["b", "a", "b"]), row("other", "ignore", ["x"])];

  it("정답 컬럼이 없으면 빈 목록", () => {
    expect(evaluationClassNames("binary", [row("other", "ignore")], { detected_classes: ["0", "1"] })).toEqual([]);
  });

  it("1순위: 정답 컬럼의 전체 고유값 — 분석이 찾은 클래스보다 앞선다(정답 컬럼을 바꾼 경우)", () => {
    const metadata = { column_unique_values: { label: ["a", "b", "c"], other: ["x"] }, detected_classes: ["0", "1"] };
    expect(evaluationClassNames("multiclass", mapping, metadata)).toEqual(["a", "b", "c"]);
  });

  it("2순위: 고유값이 없으면 분석이 찾은 클래스, 멀티레이블은 레이블", () => {
    expect(evaluationClassNames("multiclass", mapping, { detected_classes: ["cat", "dog"] })).toEqual(["cat", "dog"]);
    expect(evaluationClassNames("multilabel", mapping, { detected_labels: ["news", "sports"] })).toEqual([
      "news",
      "sports",
    ]);
  });

  it("3순위: 샘플값(중복 없이), 멀티레이블은 | 와 , 로 쪼갠다", () => {
    expect(evaluationClassNames("binary", mapping, null)).toEqual(["b", "a"]);
    expect(evaluationClassNames("multilabel", [row("l", "y_true", ["a|b", "b, c", ""])], undefined)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("keepPositiveClass", () => {
  it("다시 올렸을 때 전에 고른 값이 새 목록에 있으면 지킨다(M5)", () => {
    expect(keepPositiveClass("cat", ["cat", "dog"], "dog")).toBe("cat");
  });

  it("새 목록에 없으면 대신할 값 — 다시 올리면 새 자동 판단, 매핑을 바꾸면 빈 값(B5④)", () => {
    expect(keepPositiveClass("cat", ["0", "1"], "1")).toBe("1");
    expect(keepPositiveClass("cat", ["0", "1"], "")).toBe("");
  });

  it("고른 적이 없으면 대신할 값, 목록이 비면 고른 값을 그대로", () => {
    expect(keepPositiveClass("", ["0", "1"], "1")).toBe("1");
    expect(keepPositiveClass("cat", [], "")).toBe("cat");
  });
});

describe("세 곳이 같은 목록을 쓴다", () => {
  it("성적서 3절의 클래스는 같은 함수의 결과다 — 고유값이 분석 클래스보다 앞선다", () => {
    const input: MapWorkflowToReportInput = {
      basicInfo: { ...DEFAULT_BASIC_INFO },
      taskType: "multiclass",
      selectedMetricIds: ["M1"],
      metricDetails: {},
      uploadedFile: null,
      trainingExampleFiles: [],
      trainingUnsuitableExampleFiles: [],
      columnMapping: [row("label", "y_true", ["a"])],
      classLabelDescriptions: {},
      metadata: { column_unique_values: { label: ["a", "b", "c"] }, detected_classes: ["old1", "old2"] } as never,
    };
    const expected = evaluationClassNames(input.taskType, input.columnMapping, input.metadata as never);
    expect(expected.length).toBeGreaterThan(0);
    expect(mapWorkflowToFinalReport(input).datasetInfo.classLabels).toEqual(expected);
  });

  it("매핑 화면·학습 데이터 화면·성적서 매퍼가 이 함수를 부르고, 따로 계산하지 않는다", () => {
    const files = [
      "components/column-mapping/ColumnMapping.tsx",
      "pages/DataInfo.tsx",
      "lib/report/mapWorkflowToFinalReport.ts",
    ];
    expect(files.length).toBe(3);
    for (const file of files) {
      const source = readFileSync(resolve(__dirname, "../..", file), "utf-8");
      expect(source, file).toMatch(/evaluationClassNames\(/);
      expect(source, file).not.toMatch(/detected_classes\?\.length|detected_labels \?\?|split\(\/\[\|,\]\/\)/);
    }
  });
});
