/**
 * ③ 의뢰자 정보·④ 평가 대상 모델의 1층 필수(17025 §7.8.2.1 e·g). 화면의 다음 버튼과 검증 화면의 1층
 * 재확인(`layerOneGaps`)이 같은 함수를 쓴다.
 *
 * B11 — 공백만 넣은 칸은 빈 칸이다. 종전에는 ③ 의 칸이 trim 없이 참·거짓으로만 판정돼 공백 한 칸으로
 * 통과했고, 성적서 1.2 에 빈 이름이 찍혔다.
 */
import { describe, expect, it } from "vitest";

import { clientInfoGaps, isClientInfoValid, isModelInfoValid, modelInfoGaps } from "./basicInfoValidity";
import { layerOneGaps } from "./layerOne";
import { DEFAULT_BASIC_INFO, type BasicInfoFormData } from "../../types/workflow.types";

const VALID: BasicInfoFormData = {
  ...DEFAULT_BASIC_INFO,
  companyName: "테스트 주식회사",
  representative: "홍길동",
  businessNumber: "123-45-67890",
  phone: "02-1234-5678",
  address: "서울",
  contractDate: "2026-10-19",
  reportPurpose: "internal",
};

const REQUIRED_KEYS = [
  "companyName",
  "representative",
  "businessNumber",
  "phone",
  "address",
  "contractDate",
  "reportPurpose",
] as const;

describe("[B11] ③ 의뢰자 정보 — 칸마다 trim", () => {
  it("모두 채우면 통과", () => {
    expect(isClientInfoValid(VALID)).toBe(true);
  });

  it.each(REQUIRED_KEYS)("%s 가 공백뿐이면 통과하지 않는다", (key) => {
    expect(isClientInfoValid({ ...VALID, [key]: "   " })).toBe(false);
    expect(isClientInfoValid({ ...VALID, [key]: "" })).toBe(false);
  });

  it("과제 용도면 과제 이름·기관도 trim 해서 본다", () => {
    const project = { ...VALID, reportPurpose: "project", projectName: "AI 과제", projectAgency: "기관" };
    expect(isClientInfoValid(project)).toBe(true);
    expect(isClientInfoValid({ ...project, projectName: " " })).toBe(false);
    expect(isClientInfoValid({ ...project, projectAgency: "\t" })).toBe(false);
  });

  it("앞뒤 공백이 있어도 내용이 있으면 통과", () => {
    expect(isClientInfoValid({ ...VALID, companyName: "  테스트  " })).toBe(true);
  });

  it("④ 모델 정보도 공백뿐이면 통과하지 않는다(종전부터 trim)", () => {
    const model = { ...VALID, modelName: "M", versionName: "v1", modelPurpose: "p", modelCategory: "c" };
    expect(isModelInfoValid(model)).toBe(true);
    expect(isModelInfoValid({ ...model, modelName: "  " })).toBe(false);
  });
});

describe("[B11] 검증 화면의 1층 재확인도 같은 판정", () => {
  it("회사명이 공백뿐이면 의뢰자 정보가 빠졌다고 센다", () => {
    const gaps = layerOneGaps({
      taskType: "binary",
      basicInfo: { ...VALID, companyName: "  " },
      selectedMetricIds: [],
      metricDetails: {},
      composerMetrics: {},
      composerPerspective: {},
    });
    expect(gaps.some((gap) => gap.stepId === "clientInfo")).toBe(true);
  });
});

describe("빈 칸 이름 — '다음' 옆 안내(점검 다-8)와 판정이 같은 목록", () => {
  it("의뢰자 정보: 비면 화면 순서대로 칸 이름, 다 차면 빈 목록", () => {
    expect(clientInfoGaps(VALID)).toEqual([]);
    expect(clientInfoGaps({ ...VALID, companyName: " ", phone: "" }).map((gap) => gap.label)).toEqual(["회사명", "전화번호"]);
    expect(
      clientInfoGaps({ ...VALID, reportPurpose: "project", projectName: "", projectAgency: "" }).map((gap) => gap.label),
    ).toEqual(["과제명", "과제 기관"]);
  });

  it("평가 대상 모델: 이름·버전·용도·분류", () => {
    expect(modelInfoGaps({ ...DEFAULT_BASIC_INFO, versionName: "" }).map((gap) => gap.label)).toEqual(["모델 이름", "버전", "모델 용도", "모델 분류"]);
    expect(
      modelInfoGaps({ ...DEFAULT_BASIC_INFO, modelName: "M", versionName: "v1", modelPurpose: "p", modelCategory: "c" }),
    ).toEqual([]);
  });
});
