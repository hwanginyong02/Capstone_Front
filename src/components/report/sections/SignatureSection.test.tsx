/** 서명란 — 발급 완료 문구는 판마다(서술 라운드 세션 B, 사용자 결정 2: 판 3 본문에는 AI 표현을 쓰지 않는다). */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SignatureSection } from "./SignatureSection";
import type { EvalScope, FinalReportMeta, PerformerInfo, SignatureData } from "../../../types/finalReport.types";

const signature: SignatureData = { issuer: "리트머스 평가부", signedAt: "2026-10-22", history: [] };
const meta = { reportId: "RPT-2026-0001", issuedAt: "2026-10-22", title: "t" } as FinalReportMeta;
const evalScope = { version: "v1" } as EvalScope;
const performer = { orgName: "리트머스", evaluator: "자동 평가 엔진", contact: "—" } as PerformerInfo;

const OLD = "본 시험결과서는 AI 자동화 평가 시스템에 의해 생성되었으며, 의뢰자의 최종 확인을 거쳐 정식 발급된 문서입니다.";
const NEW = "본 시험결과서는 자동화 평가 시스템에 의해 생성되었으며, 의뢰자의 최종 확인을 거쳐 정식 발급된 문서입니다.";

describe("서명란 발급 완료 문구", () => {
  it("판 2: 'AI 자동화 평가 시스템'", () => {
    render(<SignatureSection signature={signature} meta={meta} evalScope={evalScope} performer={performer} schema3={false} />);
    expect(screen.getByText(OLD)).toBeInTheDocument();
  });

  it("판 3: '자동화 평가 시스템'(AI 없음)", () => {
    render(<SignatureSection signature={signature} meta={meta} evalScope={evalScope} performer={performer} schema3 />);
    expect(screen.getByText(NEW)).toBeInTheDocument();
    expect(screen.queryByText(OLD)).not.toBeInTheDocument();
  });

  it("미발급(초안)이면 판과 무관하게 서명 문구가 없다", () => {
    render(
      <SignatureSection signature={signature} meta={{ ...meta, reportId: "" }} evalScope={evalScope} performer={performer} schema3 />,
    );
    expect(screen.getByText("[ 초안 — 미발급 ]")).toBeInTheDocument();
    expect(screen.queryByText(NEW)).not.toBeInTheDocument();
  });
});
