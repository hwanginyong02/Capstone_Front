/**
 * 자동 컬럼 분석 타임아웃·취소 — ISSUES.md E-18.
 *
 * 종전: fetch 에 signal 도 타임아웃도 없었다(src/ 전체에서 AbortController 는
 * fetchNarrative.ts 한 파일뿐이었다). 백엔드는 blanket 재시도 x SDK max_retries 로
 * 최악 약 270초까지 늘어질 수 있었고, 그동안 프론트는 'Analyzing...' 라벨만 띄운 채
 * 뒤로 가기 버튼조차 감췄다 — 사용자가 취소도 후퇴도 할 수 없었다.
 *
 * 백엔드 재시도를 좁혀 최악이 약 135초가 됐으므로 프론트 예산은 그보다 조금 위인
 * 150초로 잡는다. 더 짧게 잡으면 백엔드가 준비해 둔 규칙 폴백조차 못 받는다.
 */
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ANALYSIS_TIMEOUT_MS, useColumnAnalysis } from "./useColumnAnalysis";

const NEVER_RESOLVES = () =>
  new Promise<Response>((_resolve, reject) => {
    // signal 이 붙어 있으면 abort 시 reject 된다 — 실제 fetch 동작을 모사한다.
  });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useColumnAnalysis 타임아웃/취소", () => {
  it("백엔드 최악(약 135초)보다 여유 있는 예산을 쓴다", () => {
    expect(ANALYSIS_TIMEOUT_MS).toBe(150_000);
  });

  it("응답이 오지 않으면 예산 초과 시 abort 한다", async () => {
    const seen: (AbortSignal | undefined)[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        seen.push(init?.signal ?? undefined);
        return new Promise<Response>((_res, rej) => {
          init?.signal?.addEventListener("abort", () =>
            rej(new DOMException("aborted", "AbortError")),
          );
        });
      }),
    );

    const { result } = renderHook(() => useColumnAnalysis());
    const pending = result.current.analyzeColumns(
      new File(["a,b\n1,2\n"], "d.csv"),
      "binary",
    );
    const assertion = expect(pending).rejects.toThrow();

    expect(seen[0]).toBeInstanceOf(AbortSignal);
    await vi.advanceTimersByTimeAsync(ANALYSIS_TIMEOUT_MS + 10);
    await assertion;
  });

  it("cancel() 로 진행 중인 분석을 즉시 끊을 수 있다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_res, rej) => {
          init?.signal?.addEventListener("abort", () =>
            rej(new DOMException("aborted", "AbortError")),
          );
        });
      }),
    );

    const { result } = renderHook(() => useColumnAnalysis());
    const pending = result.current.analyzeColumns(
      new File(["a,b\n1,2\n"], "d.csv"),
      "binary",
    );
    const assertion = expect(pending).rejects.toThrow();
    result.current.cancel();
    await assertion;
  });
});
