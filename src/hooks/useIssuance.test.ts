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

import { issueReport, reissueReport } from "../lib/report/issuanceApi";
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

describe("발급 비고 (B16)", () => {
  it("적은 비고는 앞뒤 공백을 떼어 보내고, 비거나 공백뿐이면 보내지 않는다", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(issueReport).mockClear();
    vi.mocked(issueReport).mockRejectedValue(new Error("network")); // 요청 본문만 본다
    const { result } = renderHook(() => useIssuance("run-1", report(1_000)));

    await act(() => result.current.issue(" 고객 제출용 "));
    await act(() => result.current.issue("   "));
    await act(() => result.current.issue());

    const notes = vi.mocked(issueReport).mock.calls.map(([payload]) => payload.note);
    expect(notes).toEqual(["고객 제출용", undefined, undefined]);
  });
});



/** 서술 라운드 S3b — 끝나지 않은 서술은 완성본이 아니다. 발급·정정 발급 모두 서술 done 이어야 한다. */
describe("서술이 끝나지 않으면 발급·정정 발급을 잠근다", () => {
  it("서술이 끝나지 않았으면 발급할 수 없고 요청도 보내지 않는다", async () => {
    vi.mocked(issueReport).mockClear();
    const { result } = renderHook(() => useIssuance("run-1", report(1_000), false));
    expect(result.current.canIssue).toBe(false);
    await act(() => result.current.issue());
    expect(issueReport).not.toHaveBeenCalled();
  });

  it("완성본 표시(isEvaluated)가 없으면 서술 상태가 done 이어도 잠근다", () => {
    const draft = { ...report(1_000), isEvaluated: false } as FinalReportData;
    expect(renderHook(() => useIssuance("run-1", draft, true)).result.current.canIssue).toBe(false);
  });

  it("발급된 성적서도 서술이 끝나지 않았으면 정정 발급을 보내지 않는다", async () => {
    vi.mocked(reissueReport).mockClear();
    const issued = { ...report(1_000), meta: { reportId: "RPT-2026-0001", issuedAt: "x" } } as unknown as FinalReportData;
    const { result } = renderHook(() => useIssuance("run-1", issued, false));
    await act(() => result.current.reissue("오타 수정"));
    expect(reissueReport).not.toHaveBeenCalled();
  });

  it("서술이 끝난 완성본은 정정 발급을 보낸다", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(reissueReport).mockClear();
    vi.mocked(reissueReport).mockRejectedValueOnce(new Error("network"));
    const issued = { ...report(1_000), meta: { reportId: "RPT-2026-0001", issuedAt: "x" } } as unknown as FinalReportData;
    const { result } = renderHook(() => useIssuance("run-1", issued, true));
    await act(() => result.current.reissue("오타 수정"));
    expect(reissueReport).toHaveBeenCalledTimes(1);
  });
});
