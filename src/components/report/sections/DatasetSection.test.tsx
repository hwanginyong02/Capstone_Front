/** 3절 데이터셋 개요 — 학습 데이터 예시(적합·부적합 예시 파일). */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { DatasetSection } from "./DatasetSection";
import type { DatasetInfo, TrainingDatasetInfo } from "../../../types/finalReport.types";
import type { UploadedFileInfo } from "../../../types/workflow.types";

const datasetInfo: DatasetInfo = {
  format: "CSV",
  inputColumns: ["y_true", "y_pred"],
  sampleCount: 200,
  taskTypeLabel: "이진 분류",
  classCount: 2,
  classLabels: ["0", "1"],
  fileName: "eval.csv",
};

const image: UploadedFileInfo = {
  name: "good_case.png",
  size: "42.00 KB",
  type: "image/png",
  previewUrl: "data:image/png;base64,AAAA",
};
const csv: UploadedFileInfo = { name: "edge_rows.csv", size: "1.23 MB", type: "text/csv" };

function renderWith(validExamples: UploadedFileInfo[], edgeExamples: UploadedFileInfo[]) {
  const training: TrainingDatasetInfo = {
    name: "train",
    trainingSampleCount: 0,
    validationSampleCount: 0,
    validExamples,
    edgeExamples,
  };
  render(
    <DatasetSection
      datasetInfo={datasetInfo}
      datasetSamples={[]}
      datasetDiagnosis=""
      trainingDatasetInfo={training}
    />,
  );
}

describe("3절 학습 데이터 예시 — 파일명과 크기(재료 목록 6절)", () => {
  it("이미지와 CSV 모두 '파일명 · 크기'를 찍는다", () => {
    renderWith([image], [csv]);

    expect(screen.getByText("good_case.png · 42.00 KB")).toBeInTheDocument();
    expect(screen.getByText("edge_rows.csv · 1.23 MB")).toBeInTheDocument();
    // 이미지는 미리보기도 그대로 찍는다.
    expect(screen.getByRole("img", { name: "good_case.png" })).toBeInTheDocument();
  });

  it("크기를 모르면 파일명만 찍는다", () => {
    renderWith([{ ...csv, size: "" }], []);

    expect(screen.getByText("edge_rows.csv")).toBeInTheDocument();
  });

  it("머리글은 화면과 같은 '적합 예시/부적합 예시'다", () => {
    renderWith([image], []);

    expect(screen.getByText("적합 예시")).toBeInTheDocument();
    expect(screen.getByText("부적합 예시")).toBeInTheDocument();
    expect(screen.getByText("등록된 부적합 예시 없음")).toBeInTheDocument();
    expect(screen.queryByText(/정상 데이터|불량 데이터/)).not.toBeInTheDocument();
  });
});
