/**
 * 판 4 3절 시험 방법(갈래 b2) 그리기 — 화면·인쇄 두 경로를 1단계 렌더 도구로 그려 예시본 3절 블록과 글자 대조하고(가림은 아래 명시
 * 목록, 개수 단정), 다중(digits)·멀티(yeast)의 3.1~3.3 자리를 정확값으로 단정한다. 픽스처에 없는 갈래는 복사본으로.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadEd4 } from "../../../test/edition4/render/ed4Fixtures";
import { blockText, exampleBlock, exampleLines, expectExampleBlock, printText, screenText } from "../../../test/edition4/render/renderEd4";
import type { FinalReportData } from "../../../types/finalReport.types";
import { Ed4Method } from "./Ed4Method";

const edit = (data: FinalReportData, fn: (d: FinalReportData) => void): FinalReportData => {
  const copy = structuredClone(data);
  fn(copy);
  return copy;
};

/** 그린 글에서 3절만(제목 "3. 시험 방법" 부터 "4. 시험 결과" 앞까지)을 줄로. */
function section3(text: string): string[] {
  const lines = text.split("\n");
  const from = lines.indexOf("3. 시험 방법");
  const to = lines.indexOf("4. 시험 결과");
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return lines.slice(from, to);
}

/** 부품 하나만 그린 글(줄 배열). */
const partLines = (data: FinalReportData) => {
  const view = render(<Ed4Method data={data} mode="screen" />);
  const lines = blockText([view.container]).trim().split("\n");
  view.unmount();
  return lines;
};

/** 두 제목 줄 사이(앞 제목 포함, 뒤 제목 제외). */
const between = (lines: string[], from: string, to: string) => {
  const a = lines.indexOf(from);
  const b = lines.indexOf(to);
  expect(a).toBeGreaterThanOrEqual(0);
  expect(b).toBeGreaterThan(a);
  return lines.slice(a, b);
};

/*
 * 예시본 3절 블록의 가림(명시 목록). 예시본 글자를 픽스처 값으로 바꾼다 — 바꾼 수를 단정한다.
 * - ○ 칸 "평가 엔진 버전": 실제 값 "1.0.0"(백엔드 엔진 버전 상수, 모델 버전 v2.1 아님).
 * - "평가 수행 일시": 픽스처의 평가 응답은 S1 골든(evaluated_at 2026-10-22T16:23:38+09:00)이라 RPT-2026-0001 발급본의 18:45:58 과 다르다.
 * - 미발급(final)만: 단계별 수행 일시 3행의 발급 일시 → "(미발급)"(부록 B8).
 */
const MASKS_ALWAYS: ReadonlyArray<readonly [string, string]> = [
  ["| 평가 엔진 버전 | ○ |", "| 평가 엔진 버전 | 1.0.0 |"],
  ["| 평가 수행 일시 | 2026-10-22T18:45:58+09:00 |", "| 평가 수행 일시 | 2026-10-22T16:23:38+09:00 |"],
];
const MASKS_UNISSUED: ReadonlyArray<readonly [string, string]> = [
  [
    "| 확인·발급 | 의뢰자의 입력 내용 확인, 시험성적서(PDF) 자동 발급 | 2026-10-22 18:46 |",
    "| 확인·발급 | 의뢰자의 입력 내용 확인, 시험성적서(PDF) 자동 발급 | (미발급) |",
  ],
];

function maskedExample(issued: boolean): string {
  let block = exampleBlock("## 3. 시험 방법");
  const masks = issued ? MASKS_ALWAYS : [...MASKS_ALWAYS, ...MASKS_UNISSUED];
  let applied = 0;
  for (const [from, to] of masks) {
    expect(block.split(from).length - 1).toBe(1);
    block = block.replace(from, to);
    applied += 1;
  }
  expect(applied).toBe(issued ? 2 : 3);
  // 3절의 ○ 칸은 엔진 버전 하나뿐이었다 — 가린 뒤 남은 ○ 가 없어야 한다.
  expect(block).not.toContain("○");
  return block;
}

describe("예시본 3절 대조 — bc_strong 화면·인쇄", () => {
  const cases = [
    ["issued", true],
    ["final", false],
  ] as const;

  for (const [kind, issued] of cases) {
    it(`화면(${kind}) — 3절 줄이 예시본과 순서·글자·개수까지 같다`, () => {
      const block = maskedExample(issued);
      const text = screenText(loadEd4("bc_strong", kind));
      expectExampleBlock(text, block);
      // 사이에 다른 줄이 끼지 않았다(예시본 줄 수 = 그린 3절 줄 수).
      const lines = section3(text);
      expect(lines.length).toBe(exampleLines(block).length);
      expect(lines.length).toBe(62);
    });

    it(`인쇄(${kind}) — 3절 줄이 예시본과 같다`, async () => {
      const block = maskedExample(issued);
      const text = await printText(loadEd4("bc_strong", kind));
      expectExampleBlock(text, block);
      expect(section3(text).length).toBe(exampleLines(block).length);
    });
  }

  it("○ 칸 실제 값 — 평가 엔진 버전 1.0.0 (모델 버전 v2.1 아님)", () => {
    const lines = section3(screenText(loadEd4("bc_strong", "issued")));
    expect(lines.filter((l) => l.startsWith("| 평가 엔진 버전"))).toEqual(["| 평가 엔진 버전 | 1.0.0"]);
    expect(lines.join("\n")).not.toContain("v2.1");
  });

  it("3.5 절차는 번호를 글로 찍는다(ol 없음)", () => {
    const view = render(<Ed4Method data={loadEd4("bc_strong", "final")} mode="print" />);
    expect(view.container.querySelector("ol")).toBeNull();
    expect([...view.container.querySelectorAll("p")].filter((p) => /^[1-7]\. /.test(p.textContent ?? ""))).toHaveLength(7);
    view.unmount();
  });
});

describe("다중(digits_strong) 3.1~3.3 자리", () => {
  const lines = () => partLines(loadEd4("digits_strong", "issued"));

  it("3.1 — 선언 표·합격 기준 표(핵심 둘)", () => {
    expect(between(lines(), "3.1 의뢰자 요구사항", "3.2 시험항목과 산정식")).toEqual([
      "3.1 의뢰자 요구사항",
      "다음 값은 모두 의뢰자가 지정하였습니다.",
      "의뢰자 선언",
      "| 항목 | 내용",
      "| 클래스 중요도 | 모든 클래스가 동등 (의뢰자 제공: 어느 숫자를 틀려도 오배송 한 건이다.)",
      "| 사용 방식 | 대화형(실시간)",
      "선택 지표와 합격 기준",
      "| Metric ID | 시험항목 | 합격 기준 | 핵심 지표",
      "| M1 | Accuracy | ≥ 0.980 | 핵심",
      "| M2 | Precision | 없음(참고 지표) | —",
      "| M3 | Recall | 없음(참고 지표) | —",
      "| M4 | F1 Score | ≥ 0.980 | 핵심",
      "| M6 | KL Divergence | ≤ 0.050 | —",
      "| M11 | Macro Average | 없음(참고 지표) | —",
      "| M12 | Micro Average | 없음(참고 지표) | —",
      "| M23 | Imbalance Ratio | 없음(참고 지표) | —",
    ]);
  });

  it("3.2 — 공통·다중 클래스 전용 묶음", () => {
    const s = between(lines(), "3.2 시험항목과 산정식", "3.3 산출 기준");
    expect(s.filter((l) => !l.startsWith("|"))).toEqual([
      "3.2 시험항목과 산정식",
      "의뢰자가 선택한 시험항목에 대해서만 평가를 수행한다.",
      "공통 지표 (이진 분류 / 다중 클래스 분류 / 다중 레이블 분류 모두 적용)",
      "다중 클래스 분류 전용 지표",
    ]);
    expect(s).toContain("| M6 | KL Divergence | 정답 레이블의 분포와 모델이 예측한 클래스 레이블의 분포 간의 차이(Target Drift)를 계산합니다. | ∑ P(x) * log(P(x) / Q(x))");
    expect(s.slice(-3)).toEqual([
      "| Metric ID | 시험항목 | 시험목표 | 시험방법 및 산정식",
      "| M11 | Macro Average | 클래스별 지표를 같은 비중으로 평균합니다. | 클래스별 P·R·F1의 매크로 평균 — (Class1 + … + ClassN) / N",
      "| M12 | Micro Average | 모든 표본을 한데 모아 지표를 계산합니다. | 마이크로 평균 — 전 클래스의 TP·FP·FN을 합산해 P·R·F1을 계산",
    ]);
    expect(s.filter((l) => /^\| M\d/.test(l)).map((l) => l.split(" | ")[0])).toEqual(
      ["| M1", "| M2", "| M3", "| M4", "| M6", "| M23", "| M11", "| M12"],
    );
  });

  it("3.3 — B7 충족 글, 23번, M6 줄, 신뢰구간 방식(파생 예측·양성 클래스 줄 없음)", () => {
    expect(between(lines(), "3.3 산출 기준", "3.4 판정 규칙")).toEqual([
      "3.3 산출 기준",
      '다중 클래스 지표의 평균 방식은 매크로 평균을 기준으로 합니다. 의뢰자가 클래스 중요도를 "모든 클래스가 동등"으로 밝혔기 때문입니다.',
      "본 시험성적서의 지표 산출 결과와 합격 기준은 원본 데이터에서 소수점 셋째 자리로 반올림 표기되었습니다. 다만 판정 대상 지표의 값 중 셋째 자리로 반올림하면 판정과 어긋나 보이는 값과, 신뢰구간 경계 중 반올림하면 목표값과 같아 보이는 값은 자릿수를 늘려 표기하였습니다. 결정 임계값은 그 값을 그대로 적용해도 같은 예측이 나오는 자릿수로 표기하였습니다. 소견 문장의 숫자도 같은 규칙을 따릅니다. 표기한 값끼리 계산한 차이는 반올림 때문에 끝자리가 다를 수 있습니다.",
      "KL Divergence(M6) 지표는 예측 확률(Probability) 분포가 아닌, 정답 레이블과 모델이 예측한 클래스 레이블 간의 분포 차이(Target Drift)를 기반으로 산출되었습니다.",
      "판정 대상 지표의 95% 신뢰구간은 Wilson 점수 구간(M1), 다항 재표집 부트스트랩(2,000회, 시드 4213, 백분위 구간; M4, M6)으로 산출하였습니다.",
    ]);
  });

  it("3.4·3.5 — 핵심 지표 둘, 발급 일시 18:52", () => {
    const all = lines();
    expect(all).toContain(
      "목표값이 설정되고 산출에 성공한 지표를 판정 대상으로 하며, 핵심 지표는 의뢰자가 지정하였다(Accuracy(M1), F1 Score(M4)). 핵심 지표가 하나라도 목표에 미달하면 불합격, 핵심 지표가 산출되지 않았거나 판정 대상 지표가 없으면 판정 불가, 핵심 지표는 모두 충족하였으나 그 외 지표 중 미달이 있으면 조건부 합격, 모든 판정 대상 지표가 목표를 충족하면 합격으로 판정한다. 판정은 측정값을 목표값과 직접 비교하였으며 측정 불확도는 반영하지 않았다.",
    );
    expect(all).toContain("| 확인·발급 | 의뢰자의 입력 내용 확인, 시험성적서(PDF) 자동 발급 | 2026-10-22 18:52");
    expect(all).toContain("| 평가 수행 일시 | 2026-10-22T16:23:39+09:00");
  });

  it("인쇄 경로에도 같은 3.3 글", async () => {
    const lines3 = section3(await printText(loadEd4("digits_strong", "issued")));
    expect(lines3).toContain('다중 클래스 지표의 평균 방식은 매크로 평균을 기준으로 합니다. 의뢰자가 클래스 중요도를 "모든 클래스가 동등"으로 밝혔기 때문입니다.');
    expect(lines3.length).toBe(section3(screenText(loadEd4("digits_strong", "issued"))).length);
  });
});

describe("멀티(yeast_strong) 3.1~3.3 자리", () => {
  const lines = () => partLines(loadEd4("yeast_strong", "issued"));

  it("3.1 — 선언 표 뒤 고정 문구 5, 합격 기준 표(핵심 Hamming Loss ≤·Jaccard)", () => {
    expect(between(lines(), "3.1 의뢰자 요구사항", "3.2 시험항목과 산정식")).toEqual([
      "3.1 의뢰자 요구사항",
      "다음 값은 모두 의뢰자가 지정하였습니다.",
      "의뢰자 선언",
      "| 항목 | 내용",
      "| 클래스 중요도 | 모든 클래스가 동등",
      "| 사용 방식 | 배치 (의뢰자 제공: 주 1회 새 유전자 목록을 한꺼번에 돌린다.)",
      "지표 선택 기준: 겹치는 정도를 봄 (의뢰자 제공: 한 유전자의 기능 범주를 일부라도 맞히면 실험 후보로 쓸 수 있다.)",
      "선택 지표와 합격 기준",
      "| Metric ID | 시험항목 | 합격 기준 | 핵심 지표",
      "| M2 | Precision | 없음(참고 지표) | —",
      "| M3 | Recall | 없음(참고 지표) | —",
      "| M4 | F1 Score | ≥ 0.450 | —",
      "| M15 | Hamming Loss | ≤ 0.220 | 핵심",
      "| M16 | Exact Match Ratio | 없음(참고 지표) | —",
      "| M17 | Jaccard Index | ≥ 0.450 | 핵심",
      "| M18 | Distribution Diff (ML) | 없음(참고 지표) | —",
      "| M23 | Imbalance Ratio | 없음(참고 지표) | —",
    ]);
  });

  it("3.2 — 공통·다중 레이블 분류 전용 묶음", () => {
    const s = between(lines(), "3.2 시험항목과 산정식", "3.3 산출 기준");
    expect(s.filter((l) => !l.startsWith("|"))).toEqual([
      "3.2 시험항목과 산정식",
      "의뢰자가 선택한 시험항목에 대해서만 평가를 수행한다.",
      "공통 지표 (이진 분류 / 다중 클래스 분류 / 다중 레이블 분류 모두 적용)",
      "다중 레이블 분류 전용 지표",
    ]);
    expect(s.filter((l) => /^\| M\d/.test(l)).map((l) => l.split(" | ")[0])).toEqual(
      ["| M2", "| M3", "| M4", "| M23", "| M15", "| M16", "| M17", "| M18"],
    );
    expect(s).toContain("| M17 | Jaccard Index | 예측 레이블과 실제 레이블의 교집합을 합집합으로 나눈 값입니다. | |y_true ∩ y_pred| / |y_true ∪ y_pred|");
  });

  it("3.3 — 공통 임계값 0.5 글 + 점수 컬럼 14개, 23번, 신뢰구간 방식(레이블별 표·평균 방식·M6 없음)", () => {
    expect(between(lines(), "3.3 산출 기준", "3.4 판정 규칙")).toEqual([
      "3.3 산출 기준",
      "본 평가의 예측값은 제출된 확률값에 결정 임계값 0.5를 적용하여 산출하였습니다. (점수 컬럼: score_Class1, score_Class2, score_Class3, score_Class4, score_Class5, score_Class6, score_Class7, score_Class8, score_Class9, score_Class10, score_Class11, score_Class12, score_Class13, score_Class14)",
      "본 시험성적서의 지표 산출 결과와 합격 기준은 원본 데이터에서 소수점 셋째 자리로 반올림 표기되었습니다. 다만 판정 대상 지표의 값 중 셋째 자리로 반올림하면 판정과 어긋나 보이는 값과, 신뢰구간 경계 중 반올림하면 목표값과 같아 보이는 값은 자릿수를 늘려 표기하였습니다. 결정 임계값은 그 값을 그대로 적용해도 같은 예측이 나오는 자릿수로 표기하였습니다. 소견 문장의 숫자도 같은 규칙을 따릅니다. 표기한 값끼리 계산한 차이는 반올림 때문에 끝자리가 다를 수 있습니다.",
      "판정 대상 지표의 95% 신뢰구간은 행 재표집 부트스트랩(2,000회, 시드 4213, 백분위 구간; M4, M15, M17)으로 산출하였습니다.",
    ]);
  });

  it("레이블별 임계값(복사본) — 첫 항목 뒤에 표, 점수 컬럼 덧붙임 없음", () => {
    const d = edit(loadEd4("yeast_strong", "final"), (x) => {
      x.meta.derivedPrediction!.threshold = { score_Class1: 0.35, score_Class2: 0.5 };
    });
    expect(between(partLines(d), "3.3 산출 기준", "3.4 판정 규칙").slice(0, 5)).toEqual([
      "3.3 산출 기준",
      "본 평가의 예측값은 제출된 확률값에 레이블별 결정 임계값(아래 표)을 적용하여 산출하였습니다.",
      "| 점수 컬럼 | 결정 임계값",
      "| score_Class1 | 0.35",
      "| score_Class2 | 0.5",
    ]);
  });
});

describe("픽스처에 없는 갈래(복사본)", () => {
  it("핵심 지표 기본값 — 3.1 둘째 안내·'핵심(기본값)' 열, 3.4 기본값 문장", () => {
    const d = edit(loadEd4("bc_strong", "final"), (x) => (x.coreMetricsSource = "default"));
    const lines = partLines(d);
    expect(lines[2]).toBe("다음 값은 의뢰자가 지정하였습니다. 핵심 지표 열의 '기본값'은 의뢰자가 지정하지 않아 분류 유형의 기본값을 따른 것입니다.");
    expect(lines).toContain("| M3 | Recall | ≥ 0.970 | 핵심(기본값)");
    expect(lines.filter((l) => l.endsWith("| 핵심"))).toEqual([]);
    expect(lines.some((l) => l.includes("핵심 지표는 분류 유형의 기본값을 의뢰자가 바꾸지 않고 사용하였다(Recall(M3))."))).toBe(true);
  });

  it("B7 미충족(digits 복사본) — 저장된 판 4 미충족 글", () => {
    const unmet = '의뢰자가 클래스 중요도를 "모든 클래스가 동등"으로 밝혔으나, 이에 맞는 매크로 평균 지표는 시험 항목에 없습니다(1.3 참조).';
    const d = edit(loadEd4("digits_strong", "final"), (x) => {
      x.materialCheck!.printed.averagingSentence = unmet;
      x.materials!.averagingSentence = unmet;
    });
    const s = between(partLines(d), "3.3 산출 기준", "3.4 판정 규칙");
    expect(s[1]).toBe(unmet);
    expect(s.join("\n")).not.toContain("기준으로 합니다");
  });

  it("선언이 없으면 '의뢰자 선언' 소제목·표를 그리지 않는다", () => {
    const d = edit(loadEd4("bc_strong", "final"), (x) => (x.materials!.declarations = []));
    const s = between(partLines(d), "3.1 의뢰자 요구사항", "3.2 시험항목과 산정식");
    expect(s).toEqual([
      "3.1 의뢰자 요구사항",
      "다음 값은 모두 의뢰자가 지정하였습니다.",
      "선택 지표와 합격 기준",
      ...s.slice(3),
    ]);
    expect(s).not.toContain("의뢰자 선언");
  });

  it("엔진 버전 없음 → '—'", () => {
    const d = edit(loadEd4("bc_strong", "final"), (x) => (x.evalEnv.engineVersion = null));
    expect(partLines(d)).toContain("| 평가 엔진 버전 | —");
  });
});
