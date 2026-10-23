/**
 * 인쇄 준비 훅(서술 라운드 S3b) — 인쇄할 수 있는 완성본일 때만 인쇄한다.
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePrintOnReady } from "./usePrintOnReady";

function Probe({ ready }: { ready: boolean }) {
  const ref = usePrintOnReady({ some: "data" }, ready);
  return <div ref={ref} data-testid="box" />;
}

let print: ReturnType<typeof vi.fn>;
beforeEach(() => {
  print = vi.fn();
  vi.stubGlobal("print", print);
});
afterEach(() => vi.unstubAllGlobals());

describe("usePrintOnReady", () => {
  it("준비되지 않았으면(서술 대기·실패) 인쇄하지 않고 표시도 붙이지 않는다", async () => {
    const { getByTestId } = render(<Probe ready={false} />);
    await new Promise((r) => setTimeout(r, 400));
    expect(print).not.toHaveBeenCalled();
    expect(getByTestId("box")).not.toHaveAttribute("data-pdf-ready");
  });

  it("준비되면 표시를 붙이고 인쇄한다", async () => {
    const { getByTestId } = render(<Probe ready />);
    await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(getByTestId("box")).toHaveAttribute("data-pdf-ready", "true");
  });
});
