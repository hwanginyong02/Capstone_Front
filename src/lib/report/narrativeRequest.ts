/**
 * 서술 작업 요청(`POST /api/narrative/jobs` 본문) 조립 — 한 곳(판 4 라운드 계획 2.2).
 *
 * 성적서 훅(`useReportData`)과 계약 시험(`factSheetContract.test.ts`)이 이 함수 하나를 쓴다. 종전에는 두 곳이 같은 모양을 따로
 * 적어, 한쪽에만 칸이 생겨도 계약 시험이 실제 요청을 보지 못했다.
 *
 * - 판 신호 `report_edition` 은 바탕 성적서의 찍힌 판(`usesSchema4`)으로만 정한다 — 플래그를 다시 읽지 않는다(판 결정은
 *   `newRunContentSchema()` 한 곳). 판 3 요청에는 키가 없다(백엔드 기본 3 — 판 3 요청 바이트가 지금과 같다).
 * - 키 순서는 task_type · report_purpose · (report_edition) · fact_sheet · (client_inputs).
 * - 본문이 백엔드 상한(2MB)에 가까우면 클래스 단위 칸을 비운다(`fitNarrativePayload`, 유-11).
 */
import type { FinalReportData } from "../../types/finalReport.types";
import type { FactSheet, NarrativeRequestPayload } from "./buildFactSheet";
import { fitNarrativePayload } from "./factSheetFit";
import { usesSchema4 } from "./normalizeReportContent";

export interface NarrativeRequestParts {
  /** 작업 유형(`resolveTaskType` 을 거친 값). */
  taskType: string;
  /** `assembleEvaluatedReport` 가 만든(미리 자른) 사실 시트. */
  factSheet: FactSheet;
  /** 고객이 제공한 입력(`buildClientInputs`). 없으면 키를 두지 않는다. */
  clientInputs?: Record<string, unknown>;
}

export function buildNarrativeRequest(
  baseReport: Pick<FinalReportData, "contentSchema" | "evalScope">,
  parts: NarrativeRequestParts,
): NarrativeRequestPayload {
  return fitNarrativePayload({
    task_type: parts.taskType,
    report_purpose: baseReport.evalScope.reportPurposeKey,
    ...(usesSchema4(baseReport) ? { report_edition: 4 as const } : {}),
    fact_sheet: parts.factSheet,
    ...(parts.clientInputs ? { client_inputs: parts.clientInputs } : {}),
  });
}
