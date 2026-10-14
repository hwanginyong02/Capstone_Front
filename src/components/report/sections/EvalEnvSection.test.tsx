import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvalEnvSection } from "./EvalEnvSection";
import { DEFAULT_EVAL_ENV_CONSTANTS } from "../../../lib/report/reportConstants";
import type { EvalEnvironment, EvalScope, FinalReportMeta } from "../../../types/finalReport.types";

/**
 * ISSUES.md F-08 · F-09 — 성적서 4절 '평가 수행 환경'.
 *
 * 순수 함수(`buildEvalEnvironment`)만 테스트하면 **그것을 화면이 실제로 쓰는지**는
 * 확인되지 않는다. 이 파일이 렌더 결과를 본다.
 */
const meta = {
  reportId: "", title: "", issuedAt: "",
  evaluationPeriod: { from: "2026-09-01", to: "2026-09-07" },
  taskType: "binary", taskTypeLabel: "Binary",
} as FinalReportMeta;

const evalScope = { version: "v1.2.0", targetModel: "스팸 분류기" } as EvalScope;

function env(environment?: EvalEnvironment["environment"]): EvalEnvironment {
  return {
    ...DEFAULT_EVAL_ENV_CONSTANTS,
    systemSpec: { os: "Linux", cpu: "-", gpu: "-", memory: "-", software: "-" },
    environment,
  };
}

describe("4절 평가 수행 환경", () => {
  it("[F-09] 서버가 준 라이브러리 버전을 인쇄한다", () => {
    render(<EvalEnvSection meta={meta} evalScope={evalScope} evalEnv={env({
      libraries: { python: "3.12.4", "scikit-learn": "1.5.1" },
      evaluated_at: "2026-09-07T12:34:56+09:00",
    })} />);

    expect(screen.getByText(/scikit-learn 1\.5\.1/)).toBeInTheDocument();
    expect(screen.queryByText(/scikit-learn 1\.4\.0/)).not.toBeInTheDocument();
  });

  it("[F-09] 평가 수행 일시도 서버 값이다(09:00/18:00 고정 문자열 아님)", () => {
    render(<EvalEnvSection meta={meta} evalScope={evalScope} evalEnv={env({
      libraries: { python: "3.12.4" }, evaluated_at: "2026-09-07T12:34:56+09:00",
    })} />);

    expect(screen.getByText("2026-09-07T12:34:56+09:00")).toBeInTheDocument();
    expect(screen.queryByText(/18:00 KST/)).not.toBeInTheDocument();
  });

  it("[결정 4] 구 스냅샷은 종전 상수로 폴백한다(빈 표를 인쇄하지 않는다)", () => {
    render(<EvalEnvSection meta={meta} evalScope={evalScope} evalEnv={env(undefined)} />);

    expect(screen.getByText(new RegExp(DEFAULT_EVAL_ENV_CONSTANTS.tools[1]))).toBeInTheDocument();
  });

  it("[F-08] 사용자 모델 버전을 '평가 엔진 버전'이라 부르지 않는다", () => {
    render(<EvalEnvSection meta={meta} evalScope={evalScope} evalEnv={env(undefined)} />);

    expect(screen.queryByText("평가 엔진 버전")).not.toBeInTheDocument();
    expect(screen.getByText("대상 모델 버전")).toBeInTheDocument();
    expect(screen.getByText("v1.2.0")).toBeInTheDocument();
  });
});

/** ⑨ 의 가속 사용(환경 표)과 하이퍼파라미터(표 아래) — 2층 항목이라 빠지면 "제공되지 않음". */
describe("4절 고객 재료", () => {
  const materials = {
    declarations: [],
    training: [],
    test: [],
    groundTruth: [],
    environment: [
      { label: "학습 가속", value: "예" },
      { label: "추론 가속", value: null },
    ],
    hyperparameters: { algorithm: "XGBoost", rows: [{ name: "max_depth", value: "6" }] },
  };

  it("가속 사용을 환경 표에, 하이퍼파라미터를 표 아래에 찍는다", () => {
    render(<EvalEnvSection meta={meta} evalScope={evalScope} evalEnv={env(undefined)} materials={materials} />);

    expect(screen.getByText("학습 가속").nextSibling).toHaveTextContent("예");
    expect(screen.getByText("추론 가속").nextSibling).toHaveTextContent("제공되지 않음");
    expect(screen.getByText("XGBoost")).toBeInTheDocument();
    expect(screen.getByText("max_depth")).toBeInTheDocument();
  });

  it("하이퍼파라미터가 없으면 제공되지 않음으로 적는다", () => {
    render(
      <EvalEnvSection
        meta={meta}
        evalScope={evalScope}
        evalEnv={env(undefined)}
        materials={{ ...materials, hyperparameters: { algorithm: null, rows: null } }}
      />,
    );
    expect(screen.getByText("하이퍼파라미터: 제공되지 않음")).toBeInTheDocument();
  });

  it("옛 성적서(재료 없음)에는 하이퍼파라미터 절이 없다", () => {
    render(<EvalEnvSection meta={meta} evalScope={evalScope} evalEnv={env(undefined)} />);
    expect(screen.queryByText("하이퍼파라미터")).not.toBeInTheDocument();
  });
});
