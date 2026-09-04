/**
 * issuanceApi — 발급/재발급 요청 본문 계약.
 *
 * ISSUES.md F-01 — 서버가 성적서 내용을 보관하려면 프론트가 발급 시 그것을 보내야 한다.
 * ISSUES.md G-02 — 재발급에는 run_id 소지 증명이 **필수**다(백엔드가 없으면 422).
 *   report_no 는 순차 채번이라 전수 열거가 가능하지만 run_id 는 randomUUID 라 추측 불가.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { issueReport, reissueReport } from "./issuanceApi";

const ISSUANCE_RESPONSE = {
  report_no: "RPT-2026-0001",
  version: "v1.0",
  issuer: "한국 AI 인증원 평가부",
  issued_at: "2026-07-04T08:10:52+00:00",
  organization: {
    org_name: "한국 AI 인증원",
    department: "평가부",
    evaluator: "자동 평가 엔진",
    contact: "—",
    address: null,
  },
  history: [],
};

let fetchMock: ReturnType<typeof vi.fn>;

function bodyOf(callIndex = 0): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[callIndex];
  return JSON.parse((init as RequestInit).body as string);
}

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ISSUANCE_RESPONSE,
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("발급 요청", () => {
  it("[F-01] 성적서 원본을 content 로 함께 보낸다", async () => {
    await issueReport({
      runId: "run-abc",
      modelName: "MyModel",
      content: { kpiResults: [{ metricId: "M1", value: 0.944 }] },
    });

    const body = bodyOf();
    expect(body.run_id).toBe("run-abc");
    expect(body.content).toEqual({ kpiResults: [{ metricId: "M1", value: 0.944 }] });
  });

  it("[F-01] content 가 없으면 null 로 보낸다(서버는 메타만 저장)", async () => {
    await issueReport({ runId: "run-abc" });
    expect(bodyOf().content).toBeNull();
  });
});

describe("재발급 요청", () => {
  it("[G-02] run_id 소지 증명을 함께 보낸다", async () => {
    await reissueReport("RPT-2026-0001", "지표 정정", { runId: "run-abc" });

    const body = bodyOf();
    expect(body.run_id).toBe("run-abc");
    expect(body.note).toBe("지표 정정");
  });

  it("[F-01] 정정된 성적서 원본도 함께 보낸다", async () => {
    await reissueReport("RPT-2026-0001", "지표 정정", {
      runId: "run-abc",
      content: { kpiResults: [{ metricId: "M1", value: 0.955 }] },
    });

    expect(bodyOf().content).toEqual({ kpiResults: [{ metricId: "M1", value: 0.955 }] });
  });

  it("백엔드 detail 을 오류 메시지로 올린다", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "이 성적서를 재발급할 권한이 없습니다(run 식별자 불일치)." }),
    });

    await expect(
      reissueReport("RPT-2026-0001", "x", { runId: "guessed" })
    ).rejects.toThrow(/권한이 없습니다/);
  });
});
