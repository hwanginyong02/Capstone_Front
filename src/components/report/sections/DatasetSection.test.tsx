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

describe("3절 — 판 1 보관본(운영 main 발급)은 발급 당시 모양, 판 3 은 새 모양", () => {
  function renderLegacyOr3(legacyLayout: boolean, validExamples: UploadedFileInfo[] = [csv]) {
    render(
      <DatasetSection
        datasetInfo={datasetInfo}
        datasetSamples={[]}
        datasetDiagnosis=""
        trainingDatasetInfo={{ name: "train", trainingSampleCount: 0, validationSampleCount: 0, validExamples, edgeExamples: [] }}
        schema3={!legacyLayout}
        legacyLayout={legacyLayout}
      />,
    );
  }
  const rowValue = (label: string) =>
    screen.queryAllByRole("cell").find((td) => td.textContent === label)?.nextElementSibling?.textContent ?? null;

  it("판 1 — 학습 샘플 수 0 도 줄로 찍는다", () => {
    renderLegacyOr3(true);
    expect(rowValue("학습 샘플 수")).toBe("0개");
  });

  it("판 3 — 학습 샘플 수 0 은 줄을 뺀다", () => {
    renderLegacyOr3(false);
    expect(rowValue("학습 샘플 수")).toBeNull();
  });

  it("판 1 — 예시 머리글은 '정상 데이터/불량 데이터', 파일명만(크기 없이) 칸 안에", () => {
    renderLegacyOr3(true);
    expect(screen.getByText("정상 데이터")).toBeInTheDocument();
    expect(screen.getByText("불량 데이터")).toBeInTheDocument();
    expect(screen.getByText("등록된 불량 데이터 없음")).toBeInTheDocument();
    expect(screen.getByText("edge_rows.csv")).toBeInTheDocument();
    expect(screen.queryByText(/적합 예시|1\.23 MB/)).not.toBeInTheDocument();
  });

  it("판 1 — 미리보기가 있는 예시는 그림만, 파일명 글은 없다", () => {
    renderLegacyOr3(true, [image]);
    expect(screen.getByRole("img", { name: "good_case.png" })).toBeInTheDocument();
    expect(screen.queryByText(/good_case\.png/)).not.toBeInTheDocument();
  });

  it("판 3 — '적합 예시/부적합 예시', '파일명 · 크기'", () => {
    renderLegacyOr3(false);
    expect(screen.getByText("적합 예시")).toBeInTheDocument();
    expect(screen.getByText("edge_rows.csv · 1.23 MB")).toBeInTheDocument();
    expect(screen.queryByText(/정상 데이터|불량 데이터/)).not.toBeInTheDocument();
  });
});
