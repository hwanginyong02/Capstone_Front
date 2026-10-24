/**
 * 판 4 렌더 픽스처(`fixtures/`) 이름과 읽기 — 생성기(`generate.test.tsx`)와 렌더 시험 도구(`renderEd4.tsx`)가 같이 쓴다.
 *
 * 픽스처 목록과 특징은 생성기 머리 주석. 대기·실패 데이터는 저장된 그대로라 `narrativeSource` 가 없다 — 화면은 run 의 서술 상태로
 * "pending"/"failed" 를 덧씌워 그린다(`useReportData` 의 화면 전용 출처). `loadEd4` 가 같은 일을 한다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { IssuanceResult } from "../../../lib/report/issuanceApi";
import type { FinalReportData } from "../../../types/finalReport.types";

export const ED4_FIXTURE_DIR = resolve(__dirname, "fixtures");

export type Ed4Tag = "bc_strong" | "digits_strong" | "yeast_strong";
export type Ed4FixtureKind = "pending" | "pending.narrative" | "final" | "issued" | "failed" | "failed.narrative";

export const ed4FixtureName = (tag: Ed4Tag, kind: Ed4FixtureKind) => `${tag}.${kind}.json`;

/** 같은 입력의 판 3 실제 발급본 발급 기록(발급본 픽스처가 덧입힌 것 — 번호로 열기 화면의 서버 응답에도 쓴다). */
export const ED4_ISSUANCE_OF: Record<Ed4Tag, string> = {
  bc_strong: resolve(__dirname, "../../archive/issued/RPT-2026-0001.issuance.json"),
  digits_strong: resolve(__dirname, "../../archive/issued/RPT-2026-0003.issuance.json"),
  yeast_strong: resolve(__dirname, "../../archive/issued/RPT-2026-0005.issuance.json"),
};

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

/** 발급 기록(IssuanceResult). */
export function loadEd4Issuance(tag: Ed4Tag): IssuanceResult {
  return readJson(ED4_ISSUANCE_OF[tag]) as IssuanceResult;
}

/**
 * 픽스처 하나를 화면이 받는 모양으로 읽는다. 대기·실패는 화면처럼 `narrativeSource` 를 "pending"/"failed" 로 덧씌운다
 * (`useReportData` displaySource 와 같은 규칙). 나머지는 저장된 그대로.
 */
export function loadEd4(tag: Ed4Tag, kind: "pending" | "final" | "issued" | "failed"): FinalReportData {
  if (kind === "failed" && tag !== "bc_strong") throw new Error("서술 실패 픽스처는 bc_strong 하나뿐이다");
  const data = readJson(resolve(ED4_FIXTURE_DIR, ed4FixtureName(tag, kind))) as FinalReportData;
  if (kind === "pending") return { ...data, narrativeSource: "pending" };
  if (kind === "failed") return { ...data, narrativeSource: "failed" };
  return data;
}
