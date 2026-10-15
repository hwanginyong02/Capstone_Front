import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isEvaluationDataUploadValid } from "./DataUpload";
import { isModelInfoValid } from "../basic-info/BasicInfo";
import { DEFAULT_BASIC_INFO, type UploadedFileInfo } from "../../types/workflow.types";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf-8");

const file: UploadedFileInfo = { name: "eval.csv", size: "1 KB", type: "text/csv" };

describe("업로드 단계 통과 조건", () => {
  it("파일 메타와 원본이 모두 있어야 통과한다", () => {
    expect(isEvaluationDataUploadValid(file, true)).toBe(true);
  });

  it("원본 File 객체가 없으면 막는다(과거 평가를 물려받은 직후 상태)", () => {
    // 메타만 복원된 상태로 통과시키면 다음 단계에서 "파일이 없습니다"를 만난다.
    expect(isEvaluationDataUploadValid(file, false)).toBe(false);
  });

  it("파일 자체가 없으면 막는다", () => {
    expect(isEvaluationDataUploadValid(null, false)).toBe(false);
  });
});

/**
 * 모델 이름·버전은 ④ 평가 대상 모델 단계가 받는다(docs/MATERIAL_PICKER.md §5). 종전에는 업로드
 * 화면이 받았다. 같은 값을 두 화면이 고치면 어느 쪽이 참인지 화면만 보고는 알 수 없다.
 */
describe("모델 이름표는 한 곳에서만 편집한다", () => {
  const model = {
    ...DEFAULT_BASIC_INFO,
    modelName: "Face recognizer",
    versionName: "v1.0.0",
    modelPurpose: "출입 인증",
    modelCategory: "분류 모델",
  };

  it("모델 이름·버전·용도·분류가 모두 있어야 넘어간다", () => {
    expect(isModelInfoValid(model)).toBe(true);
  });

  it("모델 이름이 비면 막는다 — run 이 'Untitled model' 로 저장돼 다른 모델과 묶인다", () => {
    expect(isModelInfoValid({ ...model, modelName: "" })).toBe(false);
    expect(isModelInfoValid({ ...model, modelName: "   " })).toBe(false);
  });

  it("버전이 비면 막는다", () => {
    expect(isModelInfoValid({ ...model, versionName: "" })).toBe(false);
  });

  it("업로드 화면에는 모델 입력란이 없다", () => {
    expect(read("components/data-upload/DataUpload.tsx")).not.toContain("modelName");
    expect(read("pages/DataUpload.tsx")).not.toContain("modelName");
  });

  it("평가 대상 모델 화면이 모델 이름·버전을 받는다", () => {
    const source = read("components/basic-info/BasicInfo.tsx");
    expect(source).toContain('update("modelName"');
    expect(source).toContain('update("versionName"');
  });
});
