/**
 * 갈래 b2(판 4 3절 시험 방법) 순수 함수 — 판 4 렌더 픽스처(bc_strong·digits_strong·yeast_strong)와, 픽스처에 없는 갈래는 픽스처를
 * 복사해 필요한 칸만 바꾼 데이터로 정확값을 단정한다(픽스처 파일은 고치지 않는다).
 */
import { describe, expect, it } from "vitest";

import { loadEd4 } from "../../../../test/edition4/render/ed4Fixtures";
import type { FinalReportData } from "../../../../types/finalReport.types";
import {
  B7_AVERAGING_MET,
  FIXED_10_MARGIN_PARAGRAPH_ED4,
  FIXED_23_ROUNDING,
  FIXED_26_SPECIFIED_ALL,
  FIXED_26_SPECIFIED_DEFAULT_CORE,
  FIXED_9_PER_LABEL_ED4,
} from "../edition4Text";
import {
  averagingMetMaterialsEd4,
  averagingSentenceEd4,
  basisItemsEd4,
  coreMetricsTextEd4,
  criteriaRowsEd4,
  declarationRowsEd4,
  derivationEd4,
  formulaGroupsEd4,
  librariesTextEd4,
  metricRationaleEd4,
  positiveClassSentenceEd4,
  requirementsHeadEd4,
  scheduleRowsEd4,
  systemRowsEd4,
  usesDefaultCore,
  verdictRuleParagraphsEd4,
} from "./methodEd4";
import { ED3_M6_NOTE } from "./methodText";

const bc = () => loadEd4("bc_strong", "final");
const bcIssued = () => loadEd4("bc_strong", "issued");
const digits = () => loadEd4("digits_strong", "final");
const yeast = () => loadEd4("yeast_strong", "final");
/** 픽스처 복사본에 칸을 바꾼다(원본은 그대로). */
const edit = (data: FinalReportData, fn: (d: FinalReportData) => void): FinalReportData => {
  const copy = structuredClone(data);
  fn(copy);
  return copy;
};

const BC_CI_NOTE =
  "판정 대상 지표의 95% 신뢰구간은 Wilson 점수 구간(M1, M3), 다항 재표집 부트스트랩(2,000회, 시드 4213, 백분위 구간; M4), 행 재표집 부트스트랩(2,000회, 시드 4213, 백분위 구간; M9, M19)으로 산출하였습니다.";
const DIGITS_B7 = '다중 클래스 지표의 평균 방식은 매크로 평균을 기준으로 합니다. 의뢰자가 클래스 중요도를 "모든 클래스가 동등"으로 밝혔기 때문입니다.';

describe("3.1 의뢰자 요구사항", () => {
  it("표 위 안내 — 의뢰자 지정이면 26_specified_all, 기본값 핵심이면 26_specified_default_core(정해진 것 6)", () => {
    expect(requirementsHeadEd4(bc())).toBe("다음 값은 모두 의뢰자가 지정하였습니다.");
    expect(requirementsHeadEd4(bc())).toBe(FIXED_26_SPECIFIED_ALL);
    const dflt = edit(bc(), (d) => (d.coreMetricsSource = "default"));
    expect(usesDefaultCore(dflt)).toBe(true);
    expect(requirementsHeadEd4(dflt)).toBe(
      "다음 값은 의뢰자가 지정하였습니다. 핵심 지표 열의 '기본값'은 의뢰자가 지정하지 않아 분류 유형의 기본값을 따른 것입니다.",
    );
    expect(requirementsHeadEd4(dflt)).toBe(FIXED_26_SPECIFIED_DEFAULT_CORE);
    // 기본값 출처라도 핵심 지표가 하나도 없으면 '기본값' 열이 없으니 첫 글.
    const noCore = edit(dflt, (d) => d.kpiResults.forEach((r) => (r.isCore = false)));
    expect(requirementsHeadEd4(noCore)).toBe(FIXED_26_SPECIFIED_ALL);
  });

  it("의뢰자 선언 표 — 저장된 선언 줄을 materialRowText 로(대응표 2)", () => {
    expect(declarationRowsEd4(bc())).toEqual([
      { label: "위험 방향", value: "FN이 더 위험 (의뢰자 제공: 악성을 놓치면 추가 검사와 치료가 늦어진다. 잘못 잡은 경우는 재판독으로 걸러진다.)" },
      { label: "사용 방식", value: "배치 (의뢰자 제공: 하루 판독분을 밤에 한 번에 돌린다.)" },
    ]);
    expect(declarationRowsEd4(digits())).toEqual([
      { label: "클래스 중요도", value: "모든 클래스가 동등 (의뢰자 제공: 어느 숫자를 틀려도 오배송 한 건이다.)" },
      { label: "사용 방식", value: "대화형(실시간)" },
    ]);
    // 값이 없고 의뢰자 글만 따로 실린 줄 — "제공되지 않음 (의뢰자 제공: …)".
    const noted = edit(bc(), (d) => (d.materials!.declarations = [{ label: "위험 방향", value: null, note: "모르겠다" }]));
    expect(declarationRowsEd4(noted)).toEqual([{ label: "위험 방향", value: "제공되지 않음 (의뢰자 제공: 모르겠다)" }]);
    expect(declarationRowsEd4(edit(bc(), (d) => delete d.materials))).toEqual([]);
  });

  it("고정 문구 5 — 멀티레이블만 '지표 선택 기준: …'", () => {
    expect(metricRationaleEd4(yeast())).toBe(
      "지표 선택 기준: 겹치는 정도를 봄 (의뢰자 제공: 한 유전자의 기능 범주를 일부라도 맞히면 실험 후보로 쓸 수 있다.)",
    );
    expect(metricRationaleEd4(bc())).toBeNull();
    expect(metricRationaleEd4(digits())).toBeNull();
    // 이유 칸이 제공되지 않음(null) + 의뢰자 글.
    const unknown = edit(yeast(), (d) => {
      d.materials!.metricRationale = null;
      d.materials!.metricRationaleNote = "아직 정하지 못함";
    });
    expect(metricRationaleEd4(unknown)).toBe("지표 선택 기준: 제공되지 않음 (의뢰자 제공: 아직 정하지 못함)");
    // 다른 유형인데 칸이 있어도 찍지 않는다(유형으로 가른다).
    const stray = edit(bc(), (d) => (d.materials!.metricRationale = "겹치는 정도를 봄"));
    expect(metricRationaleEd4(stray)).toBeNull();
    expect(metricRationaleEd4(edit(yeast(), (d) => delete d.materials!.metricRationale))).toBeNull();
  });

  it("선택 지표와 합격 기준 — bc_strong(예시본 3.1 표 그대로)", () => {
    expect(criteriaRowsEd4(bc())).toEqual([
      ["M1", "Accuracy", "≥ 0.950", "—"],
      ["M2", "Precision", "없음(참고 지표)", "—"],
      ["M3", "Recall", "≥ 0.970", "핵심"],
      ["M4", "F1 Score", "≥ 0.950", "—"],
      ["M9", "AUROC", "≥ 0.980", "—"],
      ["M10", "AUPRC", "없음(참고 지표)", "—"],
      ["M19", "Log Loss", "≤ 0.100", "—"],
      ["M23", "Imbalance Ratio", "없음(참고 지표)", "—"],
    ]);
  });

  it("선택 지표와 합격 기준 — 다중(digits)·멀티(yeast) 정확값", () => {
    expect(criteriaRowsEd4(digits())).toEqual([
      ["M1", "Accuracy", "≥ 0.980", "핵심"],
      ["M2", "Precision", "없음(참고 지표)", "—"],
      ["M3", "Recall", "없음(참고 지표)", "—"],
      ["M4", "F1 Score", "≥ 0.980", "핵심"],
      ["M6", "KL Divergence", "≤ 0.050", "—"],
      ["M11", "Macro Average", "없음(참고 지표)", "—"],
      ["M12", "Micro Average", "없음(참고 지표)", "—"],
      ["M23", "Imbalance Ratio", "없음(참고 지표)", "—"],
    ]);
    expect(criteriaRowsEd4(yeast())).toEqual([
      ["M2", "Precision", "없음(참고 지표)", "—"],
      ["M3", "Recall", "없음(참고 지표)", "—"],
      ["M4", "F1 Score", "≥ 0.450", "—"],
      ["M15", "Hamming Loss", "≤ 0.220", "핵심"],
      ["M16", "Exact Match Ratio", "없음(참고 지표)", "—"],
      ["M17", "Jaccard Index", "≥ 0.450", "핵심"],
      ["M18", "Distribution Diff (ML)", "없음(참고 지표)", "—"],
      ["M23", "Imbalance Ratio", "없음(참고 지표)", "—"],
    ]);
  });

  it("합격 기준 판 4 표기(D1) — 넷째 자리 목표는 받은 글자, 셋째 자리 이하는 끝 0 유지, 방향은 지표 판정 방향", () => {
    const d = edit(bc(), (x) => {
      x.metricList[0].threshold = 0.8124; // M1
      x.metricList[3].threshold = 0.9; // M4
    });
    const rows = criteriaRowsEd4(d);
    expect(rows[0][2]).toBe("≥ 0.8124");
    expect(rows[3][2]).toBe("≥ 0.900");
    // 판 3 저장 글(passCriteria)을 읽지 않는다 — 저장 글을 바꿔도 칸은 목표값에서.
    const stale = edit(bc(), (x) => (x.metricList[0].passCriteria = "≥ 0.95"));
    expect(criteriaRowsEd4(stale)[0][2]).toBe("≥ 0.950");
    // 낮을수록 좋은 지표(M19)는 ≤.
    expect(criteriaRowsEd4(bc())[6][2]).toBe("≤ 0.100");
  });

  it("부록 B5 — M21·M22 는 목표가 있어도 '없음(참고 지표)'", () => {
    const d = edit(digits(), (x) => {
      x.metricList.push({ metricId: "M21", name: "Confusion Matrix", threshold: 0.9, passCriteria: "≥ 0.900" });
      x.metricList.push({ metricId: "M22", name: "Classification Report", threshold: null, passCriteria: "정보 제공" });
    });
    const rows = criteriaRowsEd4(d);
    expect(rows.slice(-2)).toEqual([
      ["M21", "Confusion Matrix", "없음(참고 지표)", "—"],
      ["M22", "Classification Report", "없음(참고 지표)", "—"],
    ]);
  });

  it("핵심 지표 열 — 기본값 출처면 '핵심(기본값)'(고정 문구 26)", () => {
    const d = edit(digits(), (x) => (x.coreMetricsSource = "default"));
    const rows = criteriaRowsEd4(d);
    expect(rows.map((r) => r[3])).toEqual(["핵심(기본값)", "—", "—", "핵심(기본값)", "—", "—", "—", "—"]);
  });
});

describe("3.2 시험항목과 산정식", () => {
  it("bc_strong — 공통·이진 전용 두 묶음, 산정식은 저장된 판 4 글", () => {
    const groups = formulaGroupsEd4(bc());
    expect(groups.map((g) => g.title)).toEqual(["공통 지표 (이진 분류 / 다중 클래스 분류 / 다중 레이블 분류 모두 적용)", "이진 분류 전용 지표"]);
    expect(groups[0].rows.map((r) => r[0])).toEqual(["M1", "M2", "M3", "M4", "M23"]);
    expect(groups[1].rows).toEqual([
      ["M9", "AUROC", "모든 임계값에서 양성과 음성을 얼마나 잘 가르는지 봅니다.", "Area under ROC Curve"],
      ["M10", "AUPRC", "모든 임계값에서 정밀도와 재현율이 맞바뀌는 정도를 봅니다.", "평균 정밀도(Average Precision): Σ (Rₙ − Rₙ₋₁) · Pₙ"],
      ["M19", "Log Loss", "확신했지만 틀린 확률 예측에 큰 벌점을 줍니다.", "−(1/N) Σ [y·log(p) + (1−y)·log(1−p)]"],
    ]);
    expect(groups[0].rows[0]).toEqual(["M1", "Accuracy", "모델이 맞게 예측한 비율입니다.", "(TP + TN) / Total"]);
  });

  it("산정식 칸은 저장값을 읽는다(다시 만들지 않음)", () => {
    const d = edit(bc(), (x) => (x.metricFormulas.find((f) => f.metricId === "M10")!.formula = "〔저장된 산정식〕"));
    expect(formulaGroupsEd4(d)[1].rows[1][3]).toBe("〔저장된 산정식〕");
  });

  it("다중(digits)·멀티(yeast) — 묶음 이름과 행", () => {
    const dg = formulaGroupsEd4(digits());
    expect(dg.map((g) => g.title)).toEqual(["공통 지표 (이진 분류 / 다중 클래스 분류 / 다중 레이블 분류 모두 적용)", "다중 클래스 분류 전용 지표"]);
    expect(dg[0].rows.map((r) => r[0])).toEqual(["M1", "M2", "M3", "M4", "M6", "M23"]);
    expect(dg[1].rows).toEqual([
      ["M11", "Macro Average", "클래스별 지표를 같은 비중으로 평균합니다.", "클래스별 P·R·F1의 매크로 평균 — (Class1 + … + ClassN) / N"],
      ["M12", "Micro Average", "모든 표본을 한데 모아 지표를 계산합니다.", "마이크로 평균 — 전 클래스의 TP·FP·FN을 합산해 P·R·F1을 계산"],
    ]);
    const ml = formulaGroupsEd4(yeast());
    expect(ml.map((g) => g.title)).toEqual(["공통 지표 (이진 분류 / 다중 클래스 분류 / 다중 레이블 분류 모두 적용)", "다중 레이블 분류 전용 지표"]);
    expect(ml[0].rows.map((r) => r[0])).toEqual(["M2", "M3", "M4", "M23"]);
    expect(ml[1].rows.map((r) => r[0])).toEqual(["M15", "M16", "M17", "M18"]);
    expect(ml[1].rows[0]).toEqual(["M15", "Hamming Loss", "멀티레이블에서 레이블 단위로 틀린 비율입니다.", "∑ (y_true ≠ y_pred) / (Samples * Labels)"]);
  });

  it("전용 지표가 없으면 공통 묶음 하나", () => {
    const d = edit(bc(), (x) => (x.metricList = x.metricList.filter((m) => ["M1", "M3"].includes(m.metricId))));
    const groups = formulaGroupsEd4(d);
    expect(groups).toHaveLength(1);
    expect(groups[0].rows.map((r) => r[0])).toEqual(["M1", "M3"]);
  });
});

describe("3.3 산출 기준", () => {
  it("bc_strong — 예시본 3.3 네 항목 순서", () => {
    expect(basisItemsEd4(bc())).toEqual({
      first: "본 평가의 예측값은 제출된 확률값에 결정 임계값 0.5를 적용하여 산출하였습니다. (점수 컬럼: score_malignant)",
      rest: [
        "본 시험성적서의 이진 분류 평가 지표는 의뢰자가 지정한 양성 클래스 malignant 기준으로 산출되었습니다.",
        FIXED_23_ROUNDING,
        BC_CI_NOTE,
      ],
    });
    expect(derivationEd4(bc())!.perLabelRows).toEqual([]);
  });

  it("다중(digits) — 파생 예측 없음, 평균 방식 B7 충족 글, 23번, M6 줄, 신뢰구간 방식", () => {
    expect(basisItemsEd4(digits())).toEqual({
      first: null,
      rest: [
        DIGITS_B7,
        FIXED_23_ROUNDING,
        ED3_M6_NOTE,
        "판정 대상 지표의 95% 신뢰구간은 Wilson 점수 구간(M1), 다항 재표집 부트스트랩(2,000회, 시드 4213, 백분위 구간; M4, M6)으로 산출하였습니다.",
      ],
    });
    expect(ED3_M6_NOTE).toBe(
      "KL Divergence(M6) 지표는 예측 확률(Probability) 분포가 아닌, 정답 레이블과 모델이 예측한 클래스 레이블 간의 분포 차이(Target Drift)를 기반으로 산출되었습니다.",
    );
  });

  it("멀티(yeast) — 레이블 공통 임계값 0.5 는 한 임계값 글 + 점수 컬럼, 양성 클래스·평균 방식 문장 없음", () => {
    const items = basisItemsEd4(yeast());
    expect(items.first).toBe(
      "본 평가의 예측값은 제출된 확률값에 결정 임계값 0.5를 적용하여 산출하였습니다. (점수 컬럼: score_Class1, score_Class2, score_Class3, score_Class4, score_Class5, score_Class6, score_Class7, score_Class8, score_Class9, score_Class10, score_Class11, score_Class12, score_Class13, score_Class14)",
    );
    expect(items.rest).toEqual([
      FIXED_23_ROUNDING,
      "판정 대상 지표의 95% 신뢰구간은 행 재표집 부트스트랩(2,000회, 시드 4213, 백분위 구간; M4, M15, M17)으로 산출하였습니다.",
    ]);
    expect(derivationEd4(yeast())!.perLabelRows).toEqual([]);
  });

  it("멀티 레이블별 임계값 — 9번 레이블별 글(점수 컬럼 덧붙임 없음)과 표(임계값은 받은 글자)", () => {
    const d = edit(yeast(), (x) => {
      x.meta.derivedPrediction!.threshold = { score_Class1: 0.35, score_Class2: 0.5, score_Class3: 1e-7 };
    });
    const derivation = derivationEd4(d)!;
    expect(derivation.statement).toBe("본 평가의 예측값은 제출된 확률값에 레이블별 결정 임계값(아래 표)을 적용하여 산출하였습니다.");
    expect(derivation.statement).toBe(FIXED_9_PER_LABEL_ED4);
    expect(derivation.perLabelRows.length).toBeGreaterThan(0);
    expect(derivation.perLabelRows).toEqual([
      ["score_Class1", "0.35"],
      ["score_Class2", "0.5"],
      ["score_Class3", "0.0000001"],
    ]);
  });

  it("다중 argmax 파생 — 결정 임계값 없음 글 + 점수 컬럼", () => {
    const d = edit(digits(), (x) => {
      x.meta.derivedPrediction = { method: "argmax", threshold: null, source_columns: ["p0", "p1"], target_role: "y_pred" };
    });
    expect(basisItemsEd4(d).first).toBe(
      "본 평가의 예측값은 제출된 클래스별 확률값 중 가장 큰 값의 클래스를 택하여 산출하였습니다(결정 임계값 없음). (점수 컬럼: p0, p1)",
    );
  });

  it("결정 임계값 조사는 찍힌 숫자로(0.3을)", () => {
    const d = edit(bc(), (x) => (x.meta.derivedPrediction!.threshold = 0.3));
    expect(basisItemsEd4(d).first).toBe("본 평가의 예측값은 제출된 확률값에 결정 임계값 0.3을 적용하여 산출하였습니다. (점수 컬럼: score_malignant)");
  });

  it("양성 클래스 문장 — 이진이고 양성 클래스가 저장됐을 때만", () => {
    expect(positiveClassSentenceEd4(bc())).toBe("본 시험성적서의 이진 분류 평가 지표는 의뢰자가 지정한 양성 클래스 malignant 기준으로 산출되었습니다.");
    expect(positiveClassSentenceEd4(digits())).toBeNull();
    expect(positiveClassSentenceEd4(edit(bc(), (x) => delete x.meta.positiveClass))).toBeNull();
    expect(positiveClassSentenceEd4(edit(digits(), (x) => (x.meta.positiveClass = "3")))).toBeNull();
  });

  it("B7 충족 — 재료는 목적별 점검 줄(선언 값)과 평균 방식 표, 조사는 선언 값 끝소리", () => {
    expect(averagingMetMaterialsEd4(digits())).toEqual({ averaging: "매크로 평균", declared: "모든 클래스가 동등" });
    expect(averagingSentenceEd4(digits())).toBe(DIGITS_B7);
    const larger = edit(digits(), (x) => {
      const line = x.materialCheck!.purpose.lines.find((l) => l.id === "averaging")!;
      line.declared = "다수 클래스 우선";
    });
    expect(averagingSentenceEd4(larger)).toBe(
      '다중 클래스 지표의 평균 방식은 가중 평균을 기준으로 합니다. 의뢰자가 클래스 중요도를 "다수 클래스 우선"으로 밝혔기 때문입니다.',
    );
    const samples = edit(digits(), (x) => {
      x.materialCheck!.purpose.lines.find((l) => l.id === "averaging")!.declared = "샘플 단위로 중요";
    });
    expect(averagingSentenceEd4(samples)).toBe(
      '다중 클래스 지표의 평균 방식은 마이크로 평균을 기준으로 합니다. 의뢰자가 클래스 중요도를 "샘플 단위로 중요"로 밝혔기 때문입니다.',
    );
    expect(B7_AVERAGING_MET).toContain('"{선언 값}"(으)로');
  });

  it("B7 미충족 — 저장된 materialCheck.printed.averagingSentence 를 그대로", () => {
    const unmet =
      '의뢰자가 클래스 중요도를 "모든 클래스가 동등"으로 밝혔으나, 이에 맞는 매크로 평균 지표는 시험 항목에 없습니다(1.3 참조).';
    const d = edit(digits(), (x) => {
      x.materialCheck!.printed.averagingSentence = unmet;
      x.materials!.averagingSentence = unmet;
      x.materialCheck!.purpose.lines.find((l) => l.id === "averaging")!.met = false;
    });
    expect(averagingSentenceEd4(d)).toBe(unmet);
    expect(basisItemsEd4(d).rest[0]).toBe(unmet);
  });

  it("평균 방식 문장을 그리지 않는 경우 — 이진·멀티, 클래스 중요도 문장 없음, 재료 없음", () => {
    expect(averagingSentenceEd4(bc())).toBeNull();
    expect(averagingSentenceEd4(yeast())).toBeNull(); // 멀티레이블은 고정 문구 4 가 없다(purpose 줄은 있어도)
    expect(averagingSentenceEd4(edit(digits(), (x) => delete x.materials!.averagingSentence))).toBeNull();
    const noLine = edit(digits(), (x) => {
      x.materialCheck!.purpose.lines = x.materialCheck!.purpose.lines.filter((l) => l.id !== "averaging");
    });
    expect(averagingMetMaterialsEd4(noLine)).toBeNull();
    expect(averagingSentenceEd4(noLine)).toBeNull();
    const unknownLabel = edit(digits(), (x) => {
      x.materialCheck!.purpose.lines.find((l) => l.id === "averaging")!.declared = "모르는 선언";
    });
    expect(averagingSentenceEd4(unknownLabel)).toBeNull();
    // 점검 줄이 미충족인데 미충족 글이 저장되지 않은 어긋난 데이터 — 충족 글을 지어 그리지 않는다.
    const unmetNoText = edit(digits(), (x) => {
      x.materialCheck!.purpose.lines.find((l) => l.id === "averaging")!.met = false;
    });
    expect(averagingMetMaterialsEd4(unmetNoText)).toBeNull();
    expect(averagingSentenceEd4(unmetNoText)).toBeNull();
  });

  it("M6 줄은 M6 을 골랐을 때만, 신뢰구간 방식은 저장 글이 있을 때만", () => {
    expect(basisItemsEd4(bc()).rest).not.toContain(ED3_M6_NOTE);
    const noCi = edit(bc(), (x) => delete x.confidenceIntervalNote);
    expect(basisItemsEd4(noCi).rest).toEqual([
      "본 시험성적서의 이진 분류 평가 지표는 의뢰자가 지정한 양성 클래스 malignant 기준으로 산출되었습니다.",
      FIXED_23_ROUNDING,
    ]);
  });
});

describe("3.4 판정 규칙", () => {
  it("bc_strong — 예시본 두 문단", () => {
    const [rule, margin] = verdictRuleParagraphsEd4(bc());
    expect(rule).toBe(
      "목표값이 설정되고 산출에 성공한 지표를 판정 대상으로 하며, 핵심 지표는 의뢰자가 지정하였다(Recall(M3)). 핵심 지표가 하나라도 목표에 미달하면 불합격, 핵심 지표가 산출되지 않았거나 판정 대상 지표가 없으면 판정 불가, 핵심 지표는 모두 충족하였으나 그 외 지표 중 미달이 있으면 조건부 합격, 모든 판정 대상 지표가 목표를 충족하면 합격으로 판정한다. 판정은 측정값을 목표값과 직접 비교하였으며 측정 불확도는 반영하지 않았다.",
    );
    expect(margin).toBe(FIXED_10_MARGIN_PARAGRAPH_ED4);
  });

  it("핵심 지표 둘·기본값 출처·핵심 없음", () => {
    expect(coreMetricsTextEd4(digits())).toBe("Accuracy(M1), F1 Score(M4)");
    expect(coreMetricsTextEd4(yeast())).toBe("Hamming Loss(M15), Jaccard Index(M17)");
    const [dflt] = verdictRuleParagraphsEd4(edit(digits(), (x) => (x.coreMetricsSource = "default")));
    expect(dflt).toContain("핵심 지표는 분류 유형의 기본값을 의뢰자가 바꾸지 않고 사용하였다(Accuracy(M1), F1 Score(M4)).");
    expect(dflt).not.toContain("의뢰자가 지정하였다");
    expect(dflt.startsWith("목표값이 설정되고 산출에 성공한 지표를 판정 대상으로 하며, 핵심 지표는 분류 유형의")).toBe(true);
    const [client] = verdictRuleParagraphsEd4(digits());
    expect(client).toContain("핵심 지표는 의뢰자가 지정하였다(Accuracy(M1), F1 Score(M4)).");
    const [none] = verdictRuleParagraphsEd4(edit(bc(), (x) => x.kpiResults.forEach((r) => (r.isCore = false))));
    expect(none).toContain("핵심 지표는 의뢰자가 지정하였다(지정 없음).");
  });
});

describe("3.5 시험 절차와 평가 환경", () => {
  it("단계별 수행 일시(B8) — 발급본은 발급 일시, 미발급은 '(미발급)'", () => {
    expect(scheduleRowsEd4(bcIssued())).toEqual([
      ["접수·업로드·점검", "의뢰 정보 입력, 데이터 업로드와 컬럼 지정, 데이터 점검과 입력 점검", "2026-10-22"],
      ["산출·작성·점검", "지표와 신뢰구간 산출, 판정, 소견 작성과 점검", "2026-10-22"],
      ["확인·발급", "의뢰자의 입력 내용 확인, 시험성적서(PDF) 자동 발급", "2026-10-22 18:46"],
    ]);
    expect(scheduleRowsEd4(bc()).map((r) => r[2])).toEqual(["2026-10-22", "2026-10-22", "(미발급)"]);
  });

  it("B8 각 행의 출처 — 1행 의뢰일, 2행 평가 수행 일시의 날짜, 3행 발급 일시", () => {
    const d = edit(bcIssued(), (x) => {
      x.meta.contractDate = "2026-10-01";
      x.evalEnv.environment!.evaluated_at = "2026-10-05T23:59:00+09:00";
      x.meta.evaluationPeriod = { from: "2026-09-01", to: "2026-09-30" };
      x.meta.issuedAt = "2026-10-07 10:00";
    });
    expect(scheduleRowsEd4(d).map((r) => r[2])).toEqual(["2026-10-01", "2026-10-05", "2026-10-07 10:00"]);
    // 의뢰일·평가 시각이 없으면 시험 기간의 시작·끝.
    const bare = edit(d, (x) => {
      delete x.meta.contractDate;
      delete x.evalEnv.environment;
    });
    expect(scheduleRowsEd4(bare).map((r) => r[2])).toEqual(["2026-09-01", "2026-09-30", "2026-10-07 10:00"]);
  });

  it("주요 라이브러리 — 소문자 키 코드포인트 순 뒤 표시 이름(계획 9절)", () => {
    expect(librariesTextEd4({ "scikit-learn": "1.9.0", python: "3.12.7", pandas: "2.2.3", numpy: "2.5.1" })).toBe(
      "numpy 2.5.1, pandas 2.2.3, Python 3.12.7, scikit-learn 1.9.0",
    );
    // 표시 이름(Python)으로 정렬하면 P 가 앞에 온다 — 키 소문자로 정렬해야 예시본 순서.
    expect(librariesTextEd4({ Python: "3.12.7", numpy: "2.5.1" })).toBe("numpy 2.5.1, Python 3.12.7");
    expect(librariesTextEd4({ zlib: "1", Abc: "2" })).toBe("abc 2, zlib 1");
    expect(librariesTextEd4({})).toBe("—");
    expect(librariesTextEd4(undefined)).toBe("—");
  });

  it("평가 시스템 환경 표 — bc_strong 값, 엔진 버전은 저장된 engineVersion(모델 버전 아님)", () => {
    expect(systemRowsEd4(bc())).toEqual([
      { label: "평가 플랫폼", value: "분류 성능 평가 시스템" },
      { label: "평가 실행 방식", value: "서버 사이드 자동 연산 (Python 기반 metric 산출)" },
      { label: "적용 기준 표준", value: "ISO/IEC TS 4213:2022" },
      { label: "주요 라이브러리", value: "numpy 2.5.1, pandas 2.2.3, Python 3.12.7, scikit-learn 1.9.0" },
      { label: "평가 수행 일시", value: "2026-10-22T16:23:38+09:00" },
      { label: "평가 엔진 버전", value: "1.0.0" },
    ]);
    const other = edit(bc(), (x) => (x.evalEnv.engineVersion = "2.3.4"));
    expect(systemRowsEd4(other)[5].value).toBe("2.3.4");
    expect(systemRowsEd4(other)[5].value).not.toBe(other.evalScope.version);
  });

  it("엔진 버전 없음 → '—', 평가 시각 없음 → '{시험 기간 끝} (시각 미기록)'", () => {
    const d = edit(bc(), (x) => {
      x.evalEnv.engineVersion = null;
      delete x.evalEnv.environment;
    });
    const rows = systemRowsEd4(d);
    expect(rows[5]).toEqual({ label: "평가 엔진 버전", value: "—" });
    expect(rows[4]).toEqual({ label: "평가 수행 일시", value: "2026-10-22 (시각 미기록)" });
    expect(rows[3]).toEqual({ label: "주요 라이브러리", value: "—" });
    expect(systemRowsEd4(edit(bc(), (x) => delete x.evalEnv.engineVersion))[5].value).toBe("—");
  });
});
