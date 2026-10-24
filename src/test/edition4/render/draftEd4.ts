/**
 * 평가 전 초안 시험 도구(판 4 검토 고침 fix1) — 시험 파일이 아니다(수집되지 않음).
 *
 * 새 run 입력(판 3 newRun 입력 사본 `edition3/newRun/inputs/<tag>.state.json`·`.validate.json`)을 스토어에 넣고, 앱이 평가를
 * 부르기 전에 만드는 초안(`mapWorkflowToFinalReport` 결과 그대로 — `problems`·`kpiResults`·`isEvaluated` 없음)을 돌려준다.
 * 판은 `edition`("3"|"4")으로 고른다(VITE_REPORT_EDITION stub, 끝나면 풀림).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { vi } from "vitest";

import { toUploadedFileInfo } from "../../../components/data-upload/shared";
import { buildReportInput, mapWorkflowToFinalReport } from "../../../lib/report/mapWorkflowToFinalReport";
import type { FinalReportData } from "../../../types/finalReport.types";
import { useWorkflowStore } from "../../../utils/stores/useWorkflowStore";

const R = (p: string) => JSON.parse(readFileSync(resolve(__dirname, p), "utf8"));

export function draftReport(tag: string, edition: "3" | "4" = "4"): FinalReportData {
  vi.stubEnv("VITE_REPORT_EDITION", edition);
  try {
    const state = R(`../../edition3/newRun/inputs/${tag}.state.json`);
    const validate = R(`../../edition3/newRun/inputs/${tag}.validate.json`);
    const { file: fp, workflow } = state;
    const file = new File([new Uint8Array(fp.bytes)], fp.name, { type: fp.type, lastModified: fp.lastModified });
    useWorkflowStore.setState({
      ...workflow,
      uploadedFile: toUploadedFileInfo(file),
      rawFile: file,
      validationResult: validate,
      materialCheckAck: null,
      lastRunId: null,
    });
    return mapWorkflowToFinalReport(buildReportInput(useWorkflowStore.getState()), validate as never);
  } finally {
    vi.unstubAllEnvs();
  }
}
