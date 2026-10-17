/**
 * 발급 전 용량 확인 — 서버는 성적서 원본을 1 MiB 까지만 받는다. 넘으면 서버의 422 대신
 * 이유와 고칠 곳을 알리고 요청을 보내지 않는다.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/report/issuanceApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/report/issuanceApi")>();
  return { ...actual, issueReport: vi.fn(), reissueReport: vi.fn() };
});

import { issueReport } from "../lib/report/issuanceApi";
import { useIssuance } from "./useIssuance";
import { ISSUE_CONTENT_MAX_BYTES } from "../utils/image/examplePreview";
import type { FinalReportData } from "../types/finalReport.types";

function report(extraBytes: number): FinalReportData {
  return {
    meta: { reportId: "", issuedAt: "" },
    isEvaluated: true,
    trainingDatasetInfo: {
      validExamples: [{ name: "big.jpg", size: "5 MB", type: "image/jpeg", previewUrl: "a".repeat(extraBytes) }],
    },
  } as unknown as FinalReportData;
}

afterEach(() => vi.restoreAllMocks());

describe("발급 전 용량 확인", () => {
  it("상한을 넘으면 서버에 보내지 않고 이유를 알린다", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { result } = renderHook(() => useIssuance("run-1", report(ISSUE_CONTENT_MAX_BYTES)));

    await act(() => result.current.issue());

    expect(issueReport).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(expect.stringContaining("예시 이미지"));
  });

  it("상한 안이면 그대로 발급을 요청한다", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(issueReport).mockRejectedValueOnce(new Error("network")); // 요청이 나갔는지만 본다
    const { result } = renderHook(() => useIssuance("run-1", report(1_000)));

    await act(() => result.current.issue());

    expect(issueReport).toHaveBeenCalledTimes(1);
  });
});
