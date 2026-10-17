/** 6.4 응답시간 — 지연시간이 없으면 그 자리에 "제공되지 않음"(고정 문구 2.1 "그 자리에서 보기"). */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LatencySection } from "./LatencySection";

describe("응답시간 지표", () => {
  it("지연시간이 없으면 '제공되지 않음'을 찍는다", () => {
    render(<LatencySection latency={null} />);
    expect(screen.getByText("제공되지 않음")).toBeInTheDocument();
  });

  it("있으면 통계 표를 찍는다", () => {
    render(<LatencySection latency={{ mean: 1, min: 0.5, p50: 1, p95: 2, p99: 3, max: 4, unit: "ms" }} />);
    expect(screen.getByText("4.00 ms")).toBeInTheDocument();
    expect(screen.queryByText("제공되지 않음")).not.toBeInTheDocument();
  });
});
