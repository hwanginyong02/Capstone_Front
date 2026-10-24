/** 판 4 2절 순수 함수(갈래 b1) — 저장 칸을 읽는 자리·출처 열 배정·표기(천 단위 쉼표, "—")를 칸마다 따로 단정한다. */
import { describe, expect, it } from "vitest";

import { loadEd4 } from "../../../../test/edition4/render/ed4Fixtures";
import type { FinalReportData } from "../../../../types/finalReport.types";
import {
  classDescriptionRows,
  environmentRows,
  evaluationDataRows,
  exampleFileCaption,
  fileHashText,
  fileSizeText,
  groundTruthRows,
  hyperparameterRows,
  modelRows,
  trainingExamples,
  trainingRows,
} from "./target";

const copy = (data: FinalReportData, change: (d: FinalReportData) => void): FinalReportData => {
  const d = structuredClone(data);
  change(d);
  return d;
};

const bc = loadEd4("bc_strong", "issued");

describe("2.2 해시·크기", () => {
  it("해시 = datasetInfo.sourceFile.sha256 그대로(64자), 없으면 —", () => {
    expect(fileHashText(bc)).toBe("4ead9f2ccc8da32c0c3148f02ea6ff4e030c156d9873eeb99883df73f3a49f9d");
    expect(fileHashText(bc)).toHaveLength(64);
    expect(fileHashText(copy(bc, (d) => (d.datasetInfo.sourceFile = null)))).toBe("—");
    expect(fileHashText(copy(bc, (d) => delete d.datasetInfo.sourceFile))).toBe("—");
  });

  it.each([
    [3727, "3,727바이트"],
    [0, "0바이트"],
    [999, "999바이트"],
    [1234567, "1,234,567바이트"],
  ])("크기 %d → %s", (n, text) => {
    expect(fileSizeText(copy(bc, (d) => (d.datasetInfo.sourceFile = { sha256: "a".repeat(64), sizeBytes: n })))).toBe(text);
  });

  it("크기 없음 —", () => {
    expect(fileSizeText(copy(bc, (d) => (d.datasetInfo.sourceFile = null)))).toBe("—");
  });
});

describe("2.2 평가 데이터 표 — 칸과 출처 열", () => {
  it("bc_strong 열 줄 — 시스템 확인 7칸, 의뢰자 제공 3칸(평가 유형·출처·관계)", () => {
    const rows = evaluationDataRows(bc);
    expect(rows.map((r) => [r[0], r[2]])).toEqual([
      ["업로드 파일명", "시스템 확인"],
      ["파일 해시(SHA-256)", "시스템 확인"],
      ["파일 크기", "시스템 확인"],
      ["데이터셋 형식", "시스템 확인"],
      ["입력 컬럼", "시스템 확인"],
      ["평가 데이터셋 샘플 수", "시스템 확인"],
      ["평가 유형", "의뢰자 제공"],
      ["감지된 클래스 수", "시스템 확인"],
      ["평가 데이터 출처", "의뢰자 제공"],
      ["학습 데이터와의 관계", "의뢰자 제공"],
    ]);
  });

  it("칸마다 제 저장 칸을 읽는다(하나씩 바꿔 봄)", () => {
    const d = copy(bc, (x) => {
      x.datasetInfo.fileName = "f.csv";
      x.datasetInfo.format = "F";
      x.datasetInfo.inputColumns = ["a", "b"];
      x.datasetInfo.sampleCount = 12345;
      x.datasetInfo.taskTypeLabel = "T";
      x.datasetInfo.classCount = 3;
      x.datasetInfo.classLabels = ["x", "y", "z"];
      x.datasetInfo.sourceFile = { sha256: "b".repeat(64), sizeBytes: 10 };
      x.materials!.test = [{ label: "평가 데이터 출처", value: null, note: "모름" }];
    });
    expect(evaluationDataRows(d).map((r) => r[1])).toEqual([
      "f.csv",
      "b".repeat(64),
      "10바이트",
      "F",
      "a, b",
      "12,345개",
      "T",
      "3개 — 클래스 목록: x, y, z",
      "제공되지 않음 (의뢰자 제공: 모름)",
    ]);
  });

  it("클래스 수·크기·샘플 수는 천 단위 쉼표(표의 수 — S6 질문 8)", () => {
    const d = copy(bc, (x) => {
      x.datasetInfo.classCount = 1200;
      x.datasetInfo.classLabels = ["x"];
      x.datasetInfo.sampleCount = 1000;
      x.datasetInfo.sourceFile = { sha256: "c".repeat(64), sizeBytes: 1234567 };
    });
    const values = evaluationDataRows(d).map((r) => r[1]);
    expect(values).toContain("1,200개 — 클래스 목록: x");
    expect(values).toContain("1,000개");
    expect(values).toContain("1,234,567바이트");
  });
});

describe("2.1", () => {
  it("대상 모델 표 — 모델명·버전·분류·용도·알고리즘", () => {
    expect(modelRows(bc).map((r) => r.label)).toEqual(["모델명", "버전", "모델 분류", "모델 용도", "알고리즘"]);
    const d = copy(bc, (x) => {
      x.evalScope.targetModel = "M";
      x.evalScope.version = "v";
      x.evalScope.modelCategory = "C";
      x.evalScope.modelPurpose = "P";
      x.materials!.hyperparameters.algorithm = "A";
    });
    expect(modelRows(d).map((r) => r.value)).toEqual(["M", "v", "C", "P", "A"]);
    const empty = copy(bc, (x) => {
      delete x.evalScope.modelCategory;
      delete x.evalScope.modelPurpose;
    });
    expect(modelRows(empty).slice(2, 4).map((r) => r.value)).toEqual(["제공되지 않음", "제공되지 않음"]);
  });

  it("하이퍼파라미터 — 이름·값 줄, 미제공·재료 없음은 null(B30)", () => {
    expect(hyperparameterRows(bc)).toEqual([
      ["C", "0.5"],
      ["max_iter", "2000"],
      ["solver", "lbfgs"],
    ]);
    expect(hyperparameterRows(copy(bc, (d) => (d.materials!.hyperparameters.rows = null)))).toBeNull();
    expect(hyperparameterRows(copy(bc, (d) => delete d.materials))).toBeNull();
  });

  it("학습·추론 환경 — 의뢰자 환경 다섯 칸(systemSpec) + 가속 재료 줄, 평가 시스템 값 없음", () => {
    expect(environmentRows(bc)).toEqual([
      { label: "운영체제", value: "Ubuntu 22.04" },
      { label: "CPU", value: "Intel Xeon 8핵" },
      { label: "GPU", value: "없음" },
      { label: "메모리", value: "32GB" },
      { label: "소프트웨어", value: "Python 3.11, scikit-learn 1.5" },
      { label: "학습 가속", value: "아니오" },
      { label: "추론 가속", value: "아니오" },
    ]);
    const d = copy(bc, (x) => {
      x.evalEnv.systemSpec = { os: "O", cpu: "", gpu: "G", memory: "M", software: "S" };
      x.materials!.environment = [{ label: "학습 가속", value: null, item: 11 }];
    });
    expect(environmentRows(d).map((r) => r.value)).toEqual(["O", "제공되지 않음", "G", "M", "S", "제공되지 않음"]);
  });
});

describe("2.2 아래 표·2.3", () => {
  it("정답 라벨·학습 데이터 — 재료 줄 materialRowText, 재료 없으면 빈 배열", () => {
    expect(groundTruthRows(bc)[0]).toEqual({ label: "정답 라벨 구축 방법", value: "전문가 수동 (의뢰자 제공: 조직검사로 확진한 병리 진단 결과)" });
    expect(trainingRows(bc)).toHaveLength(8);
    expect(trainingRows(bc)[4]).toEqual({ label: "학습 클래스 분포", value: "malignant 148 / benign 250" });
    const none = copy(bc, (d) => delete d.materials);
    expect(groundTruthRows(none)).toEqual([]);
    expect(trainingRows(none)).toEqual([]);
  });

  it("클래스 레이블 설명 — 저장된 클래스만, 빈 설명은 '설명 미입력'", () => {
    expect(classDescriptionRows(bc)).toEqual([
      { label: "benign", value: "양성 종양" },
      { label: "malignant", value: "악성 종양" },
    ]);
    const d = copy(bc, (x) => (x.datasetInfo.classLabelDescriptions = [{ label: "q", description: "" }]));
    expect(classDescriptionRows(d)).toEqual([{ label: "q", value: "설명 미입력" }]);
    expect(classDescriptionRows(copy(bc, (x) => delete x.datasetInfo.classLabelDescriptions))).toEqual([]);
  });

  it("학습 데이터 예시 — 한쪽이라도 있으면, 캡션 '파일명 · 크기'", () => {
    expect(trainingExamples(bc)).toBeNull();
    const file = { name: "e.png", size: "3 KB", type: "image/png" };
    const d = copy(bc, (x) => (x.trainingDatasetInfo!.edgeExamples = [file]));
    expect(trainingExamples(d)).toEqual({ valid: [], edge: [file] });
    expect(exampleFileCaption(file)).toBe("e.png · 3 KB");
    expect(exampleFileCaption({ ...file, size: "" })).toBe("e.png");
    expect(trainingExamples(copy(bc, (x) => delete x.trainingDatasetInfo))).toBeNull();
  });
});
