/**
 * 작업 유형 이름과 대체값(W9).
 *
 * - 이름: 화면과 성적서·AI 서술이 한국어 한 벌(이진 분류 / 다중 클래스 분류 / 다중 레이블 분류)을 쓴다
 *   (2026-10-18 사용자 결정). 이미 발급된 성적서는 저장된 이름 그대로 그린다.
 * - 대체값: 유형이 비었을 때의 유형은 `resolveTaskType` 한 곳("binary")이다. 종전에는 15곳이 따로
 *   정해 같은 파일 안에서도 갈렸다.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  getColumnDisplay,
  isLegacyTaskTypeLabel,
  LEGACY_TASK_TYPE_LABELS,
  resolveTaskType,
  TASK_TYPE_LABELS,
  TASK_TYPE_LABELS_KO,
  taskTypeLabelsFor,
} from "./evaluationData";
import { mapWorkflowToFinalReport } from "../lib/report/mapWorkflowToFinalReport";
import { DEFAULT_BASIC_INFO } from "../types/workflow.types";
import { ReportCoverSection } from "../components/report/sections/ReportCoverSection";
import { DatasetSection } from "../components/report/sections/DatasetSection";
import { MetricListSection } from "../components/report/sections/MetricListSection";
import { DataValidation } from "../components/data-validation/DataValidation";

const ROOT = resolve(__dirname, "../..");

describe("유형 이름 — 화면과 성적서가 한국어 한 벌", () => {
  it("세 이름", () => {
    expect(TASK_TYPE_LABELS_KO).toEqual({
      binary: "이진 분류",
      multiclass: "다중 클래스 분류",
      multilabel: "다중 레이블 분류",
    });
    expect(TASK_TYPE_LABELS).toEqual(TASK_TYPE_LABELS_KO);
  });

  const backendPrompt = resolve(ROOT, "../Capstone_Back/app/narrative/prompt.py");
  // 백엔드 저장소가 옆에 없으면(프론트만 받은 CI) 대조를 건너뛴다. 파일을 읽기 전에 확인한다.
  it.skipIf(!existsSync(backendPrompt))("백엔드 서술 지시문의 TASK_TYPE_LABELS 와 같은 글자다", () => {
    const source = readFileSync(backendPrompt, "utf-8");
    const block = source.match(/^TASK_TYPE_LABELS\s*=\s*\{([^}]*)\}/m);
    expect(block).not.toBeNull();
    const backend = Object.fromEntries(
      [...block![1].matchAll(/"(\w+)"\s*:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
    );
    expect(Object.keys(backend).length).toBe(3);
    expect(backend).toEqual(TASK_TYPE_LABELS_KO);
  });
});

describe("성적서의 유형 이름 — 자리마다", () => {
  const report = mapWorkflowToFinalReport({
    basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "테스트 주식회사", modelName: "MyModel" },
    taskType: "multilabel",
    selectedMetricIds: ["M4", "M17"],
    metricDetails: {},
    uploadedFile: null,
    trainingExampleFiles: [],
    trainingUnsuitableExampleFiles: [],
    columnMapping: [],
    classLabelDescriptions: {},
    metadata: null,
  });

  it("표지", () => {
    render(<ReportCoverSection meta={report.meta} performer={report.performer} />);
    expect(screen.getByText("다중 레이블 분류")).toBeInTheDocument();
  });

  it("3절 평가 유형", () => {
    render(
      <DatasetSection
        datasetInfo={report.datasetInfo}
        datasetSamples={report.datasetSamples}
        datasetDiagnosis={report.datasetDiagnosis}
      />,
    );
    expect(screen.getByText("평가 유형").closest("tr")).toHaveTextContent("다중 레이블 분류");
  });

  it("5절 머리글과 공통 지표 안내", () => {
    render(
      <MetricListSection
        metricList={report.metricList}
        metricFormulas={report.metricFormulas}
        taskTypeLabel={report.meta.taskTypeLabel}
      />,
    );
    expect(screen.getByText("다중 레이블 분류 전용 지표")).toBeInTheDocument();
    expect(screen.getByText("(이진 분류 / 다중 클래스 분류 / 다중 레이블 분류 모두 적용)")).toBeInTheDocument();
    expect(screen.queryByText(/Multi-label|Multi-class|Binary/)).not.toBeInTheDocument();
  });

  it("옛 발급본(영문 저장값)의 5.1 공통 지표 안내는 W9 이전 글자 그대로 (S10 마무리)", () => {
    for (const label of ["Binary", "Multi-class", "Multi-label"]) {
      const { unmount } = render(
        <MetricListSection metricList={report.metricList} metricFormulas={report.metricFormulas} taskTypeLabel={label} />,
      );
      expect(screen.getByText("(Binary / Multi-class / Multi-label 모두 적용)")).toBeInTheDocument();
      expect(screen.getByText(`${label} 전용 지표`)).toBeInTheDocument();
      expect(screen.queryByText(/이진 분류|다중 클래스 분류|다중 레이블 분류/)).not.toBeInTheDocument();
      unmount();
    }
  });

  it("발급본은 저장된 이름 그대로 그린다", () => {
    render(<ReportCoverSection meta={{ ...report.meta, taskTypeLabel: "Multi-label" }} performer={report.performer} />);
    expect(screen.getByText("Multi-label")).toBeInTheDocument();
  });
});

describe("옛 발급본 유형 이름 판정 (isLegacyTaskTypeLabel, S10 마무리)", () => {
  it("W9 이전 영문 표의 세 값만 옛 이름이다", () => {
    expect(LEGACY_TASK_TYPE_LABELS).toEqual({ binary: "Binary", multiclass: "Multi-class", multilabel: "Multi-label" });
    const legacy = Object.values(LEGACY_TASK_TYPE_LABELS);
    expect(legacy.length).toBe(3);
    for (const label of legacy) expect(isLegacyTaskTypeLabel(label)).toBe(true);
    for (const label of [...Object.values(TASK_TYPE_LABELS_KO), "binary", "Multiclass", "", undefined]) {
      expect(isLegacyTaskTypeLabel(label)).toBe(false);
    }
  });

  it("표 고르기 — 영문 저장값이면 영문 표, 아니면 한국어 표", () => {
    expect(taskTypeLabelsFor("Multi-label")).toBe(LEGACY_TASK_TYPE_LABELS);
    expect(taskTypeLabelsFor("다중 레이블 분류")).toBe(TASK_TYPE_LABELS_KO);
    expect(taskTypeLabelsFor(undefined)).toBe(TASK_TYPE_LABELS_KO);
  });
});

describe("컬럼 설명의 유형 이름 (COLUMN_DISPLAY, S10 마무리)", () => {
  it("정답·예측 컬럼 설명이 유형 이름표의 '다중 레이블 분류'를 쓴다 — '멀티레이블'이 아니다", () => {
    expect(getColumnDisplay("y_true").description).toBe(
      "실제 정답 값입니다. 다중 레이블 분류이면 정답 레이블 묶음을 한 가지 형식으로 적습니다.",
    );
    expect(getColumnDisplay("y_pred").description).toBe(
      "모델이 예측한 값입니다. 다중 레이블 분류이면 y_true 와 같은 형식으로 예측 레이블 묶음을 적습니다.",
    );
  });
});

describe("유형 대체값 한 곳 (resolveTaskType)", () => {
  it("비었으면 binary, 있으면 그대로", () => {
    expect(resolveTaskType("")).toBe("binary");
    expect(resolveTaskType(null)).toBe("binary");
    expect(resolveTaskType(undefined)).toBe("binary");
    expect(resolveTaskType("multiclass")).toBe("multiclass");
    expect(resolveTaskType("multilabel")).toBe("multilabel");
  });

  function listSources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return listSources(path);
      return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
  }

  it("src 에 `x || \"binary\"` 같은 유형 대체값이 resolveTaskType 밖에 없다", () => {
    const files = listSources(join(ROOT, "src"));
    expect(files.length).toBeGreaterThan(100);
    const fallback = /(\|\||\?\?)\s*["'](binary|multiclass|multilabel)["']/;
    const hits = files.flatMap((path) =>
      readFileSync(path, "utf-8")
        .split("\n")
        .flatMap((line, index) => (fallback.test(line) ? [`${relative(ROOT, path)}:${index + 1}: ${line.trim()}`] : [])),
    );
    expect(hits).toEqual(["src/data/evaluationData.ts:" + resolveLine() + ": return taskType || \"binary\";"]);
  });

  /** 대체값을 정하는 단 한 줄의 위치. */
  function resolveLine(): number {
    const lines = readFileSync(join(ROOT, "src/data/evaluationData.ts"), "utf-8").split("\n");
    return lines.findIndex((line) => line.trim() === 'return taskType || "binary";') + 1;
  }
});

describe("검증 화면의 묶음 이름 — 성적서 6.0 과 같은 한국어 이름 (S7 검토)", () => {
  it("다중 클래스 분류·다중 레이블 분류 묶음 이름과 설명", () => {
    const item = (group: "multiclass" | "multilabel") => ({
      name: `${group}_check`,
      result: "ok",
      handling: "-",
      status: "pass" as const,
      group,
    });
    render(
      <DataValidation
        isLoading={false}
        validationData={{
          task_type: "multiclass",
          selected_metric_ids: [],
          execution_summary: [],
          validation_details: [item("multiclass"), item("multilabel")],
          error_count: 0,
          warning_count: 0,
        }}
      />,
    );
    expect(screen.getByText("다중 클래스 분류 검사")).toBeInTheDocument();
    expect(screen.getByText("분류 유형이 다중 클래스 분류일 때 적용")).toBeInTheDocument();
    expect(screen.getByText("다중 레이블 분류 검사")).toBeInTheDocument();
    expect(screen.getByText("분류 유형이 다중 레이블 분류일 때 적용")).toBeInTheDocument();
  });
});
