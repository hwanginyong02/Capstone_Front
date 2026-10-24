/**
 * 판 4 렌더러 검토 지적 고침(fix1) — 검토자(rv1·rv3) 재현을 옮긴 시험. 평가 전 초안은 실제 매퍼 결과(`draftEd4.ts`)로 그린다.
 */
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { ReportSections } from "../../../components/report/ReportSections";
import { Ed4Narrative } from "../../../components/report/edition4/shared/Ed4Paragraph";

import { buildThresholdTableEd4, f1ThresholdGainTextsEd4, type F1ThresholdGainRawEd4 } from "../../../lib/report/edition4/thresholdGainEd4";
import { coverIssuerLine } from "../../../lib/report/edition4/render/cover";
import { purposeParagraph } from "../../../lib/report/edition4/render/overview";
import { ed4RuleTail } from "../../../lib/report/edition4/render/recordLines";
import { evaluationDataRows, fileSizeText } from "../../../lib/report/edition4/render/target";
import { NO_PROBLEM_SENTENCE } from "../../../lib/report/reportConstants";
import type { FinalReportData } from "../../../types/finalReport.types";
import { draftReport } from "./draftEd4";
import { loadEd4 } from "./ed4Fixtures";
import { SECTION_SOURCE_BADGE_TEXT } from "../../../components/report/shared/SectionSourceBadge";
import { printText, screenText } from "./renderEd4";

const after = (text: string, head: string) => text.slice(text.indexOf(`\n${head}\n`) + 1);
const between = (text: string, head: string, next: string) => {
  const start = text.indexOf(`\n${head}\n`);
  const end = text.indexOf(`\n${next}\n`, start + 1);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  return text.slice(start + 1, end).split("\n");
};

describe("지적 1 — 평가 전 초안(문제 목록 없음)의 6절은 판 3 초안 자리표시(문제 0개 글 아님)", () => {
  for (const tag of ["bc_strong", "digits_strong", "yeast_strong"]) {
    it(tag, () => {
      const draft = draftReport(tag);
      expect(draft.problems).toBeUndefined();
      const lines = after(screenText(draft), "6. 개선 권고").split("\n");
      expect(lines.slice(0, 7)).toEqual([
        "6. 개선 권고",
        "6.1 데이터",
        "자동 서술 생성 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.",
        "6.2 모델과 운영",
        "자동 서술 생성 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.",
        "권고 항목은 자동 서술 생성 연동 시 표시됩니다.",
        "— 끝 —",
      ]);
      expect(screenText(draft)).not.toContain(NO_PROBLEM_SENTENCE);
    });
  }

  it("판 3 같은 입력 초안도 같은 자리표시 글(글자 출처 확인)", () => {
    const text = screenText(draftReport("bc_strong", "3"));
    expect(text).toContain("\n자동 서술 생성 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.\n");
    expect(text).toContain("\n권고 항목은 자동 서술 생성 연동 시 표시됩니다.\n");
  });
});

describe("지적 2 — 평가 전 초안 3.1 합격 기준 방향은 지표 정의(낮을수록 좋음)에서", () => {
  it("bc_strong 초안: Log Loss(M19) 는 '≤ 0.100'(저장된 metricList passCriteria·판 3 초안과 같음)", () => {
    const draft = draftReport("bc_strong");
    expect(draft.kpiResults).toHaveLength(0);
    expect(draft.metricList.find((m) => m.metricId === "M19")?.passCriteria).toBe("≤ 0.100");
    const lines = between(screenText(draft), "선택 지표와 합격 기준", "3.2 시험항목과 산정식");
    expect(lines).toContain("| M19 | Log Loss | ≤ 0.100 | —");
    expect(lines).toContain("| M1 | Accuracy | ≥ 0.950 | —");
    expect(lines.filter((l) => /^\| M\d/.test(l))).toHaveLength(8);
  });

  it("yeast_strong 초안: 낮을수록 좋은 지표는 모두 ≤", () => {
    const draft = draftReport("yeast_strong");
    const lines = between(screenText(draft), "선택 지표와 합격 기준", "3.2 시험항목과 산정식").filter((l) => /^\| M\d/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    for (const metric of draft.metricList.filter((m) => m.threshold !== null && !["M21", "M22"].includes(m.metricId))) {
      const row = lines.find((l) => l.startsWith(`| ${metric.metricId} |`));
      expect(row?.split(" | ")[2]).toBe(metric.passCriteria);
    }
  });
});

/**
 * rv1 갈래 bc_p_eq_r_extend — Recall 목표 0.9842(넷째 자리 목표, 정해진 것 7), Precision 원값 = Recall 원값 0.984375(이진에서 FP = FN).
 * Recall 은 판정 대상이라 늘린 표기 0.9844, Precision(참고 지표)은 같은 원값이니 같은 글자 0.9844 여야 한다(D2).
 */
function pEqRExtend(): { data: FinalReportData; raw: F1ThresholdGainRawEd4 } {
  const data = structuredClone(loadEd4("bc_strong", "final"));
  const recall = data.kpiResults.find((r) => r.metricId === "M3")!;
  const precision = data.kpiResults.find((r) => r.metricId === "M2")!;
  recall.threshold = 0.9842;
  data.metricList.find((m) => m.metricId === "M3")!.threshold = 0.9842;
  precision.value = recall.value;
  expect(precision.threshold).toBeNull();
  const raw: F1ThresholdGainRawEd4 = {
    bestThresholdText: "0.6166",
    maxF1: 0.984375,
    currentF1: data.kpiResults.find((r) => r.metricId === "M4")!.value,
    gain: 0.0076,
    bestRecall: 0.984375,
    bestPrecision: 0.984375,
    currentRecall: recall.value,
    currentPrecision: precision.value,
  };
  const ed3 = { max_f1: 0.9844, current_f1: 0.9767, gain: 0.0076, best_threshold: 0.6166, notable: false };
  data.edition4Values!.thresholdTable = buildThresholdTableEd4(raw, ed3, data.kpiResults, data.meta.derivedPrediction);
  return { data, raw };
}

describe("지적 3 — 같은 수는 같은 글자(4.3·4.4·4.6, 사실 시트)", () => {
  it("bc_p_eq_r_extend: Precision 원값 0.984375 가 4.3·4.4(지금·F1 최대 칸)·4.6 에서 모두 0.9844", () => {
    const { data } = pEqRExtend();
    const text = screenText(data);
    const at43 = between(text, "4.3 지표별 결과", "4.4 오분류");
    expect(at43).toContain("| M3 | Recall (핵심) | 0.9844 | [0.917, 0.997] | ≥ 0.9842 | 합격 | 작음");
    expect(at43).toContain("| M2 | Precision | 0.9844 | — | — | 참고 지표 | —");
    const at44 = between(text, "4.4 오분류", "4.5 데이터 분포");
    const precision44 = at44.filter((l) => l.startsWith("| Precision |"));
    expect(precision44).toEqual(["| Precision | 0.9844 | 0.9844"]);
    expect(at44.filter((l) => l.startsWith("| Recall |"))).toEqual(["| Recall | 0.9844 | 0.9844"]);
    const at46 = between(text, "4.6 참조 범위 비교", "4.7 곡선");
    const precision46 = at46.filter((l) => l.startsWith("| Precision |"));
    expect(precision46).toHaveLength(1);
    expect(precision46[0].split(" | ")[1]).toBe("0.9844");
  });

  it("사실 시트 *_text 가 4.4 표와 같은 글자(같은 cells)", () => {
    const { data, raw } = pEqRExtend();
    const sheet = f1ThresholdGainTextsEd4(raw, data.kpiResults, "fn");
    const rows = data.edition4Values!.thresholdTable!.rows;
    expect(sheet.current_precision_text).toBe("0.9844");
    expect(sheet.best_precision_text).toBe("0.9844");
    expect(rows.find((r) => r.metricId === "M2")).toMatchObject({ current: sheet.current_precision_text, best: sheet.best_precision_text });
    expect(rows.find((r) => r.metricId === "M3")).toMatchObject({ current: sheet.current_recall_text, best: sheet.best_recall_text });
    expect(rows.find((r) => r.metricId === "M4")).toMatchObject({ current: sheet.current_f1_text, best: sheet.max_f1_text });
  });

  it("같은 원값이 아니면 셋째 자리 그대로(bc_strong 4.6 Precision 0.969)", () => {
    const at46 = between(screenText(loadEd4("bc_strong", "final")), "4.6 참조 범위 비교", "4.7 곡선");
    expect(at46.find((l) => l.startsWith("| Precision |"))?.split(" | ")[1]).toBe("0.969");
  });
});

describe("지적 4 — 평가 전 초안·랜딩의 빈 표와 4.1 모순", () => {
  it("bc_strong 초안: 4.3 은 행 0개 표를 그리지 않는다(머리 행만 있는 표 없음)", () => {
    const draft = draftReport("bc_strong");
    const at43 = between(screenText(draft), "4.3 지표별 결과", "4.4 오분류");
    expect(at43[0]).toBe("4.3 지표별 결과");
    expect(at43.filter((l) => l.startsWith("|"))).toEqual([]);
    // 평가 뒤에는 그대로 표가 있다.
    const final43 = between(screenText(loadEd4("bc_strong", "final")), "4.3 지표별 결과", "4.4 오분류");
    expect(final43[1]).toBe("| Metric ID | 시험항목 | 산출 결과 | 95% 신뢰구간 | 합격 기준 | 판정 | 판정 여유");
  });

  it("검증 결과가 없으면 4.1 요약 표에 '항목별 결과는 아래 표' 줄을 찍지 않는다(판 3 안내 글만)", () => {
    const draft = draftReport("bc_strong");
    draft.dataValidation = [];
    const at41 = between(screenText(draft), "4.1 데이터 점검", "4.2 종합 판정");
    expect(at41).toEqual([
      "4.1 데이터 점검",
      "| 항목 | 값 | 비고",
      "| 총 평가 건수 | 171건 | 업로드 데이터 전체 행(row) 수 = 고유 ID 수",
      "| 유효 예측 건수 | 171건 | 누락값·오류 제외 후 실제 metric 산출에 사용된 건수",
      "| 제외된 샘플 수 | 0건 | 누락값/오류로 인해 평가에서 제외된 건수",
      "데이터 검증 결과가 없습니다. (검증 단계를 수행한 평가에서만 표시됩니다.)",
    ]);
  });

  it("검증 결과가 있으면 그 줄은 그대로(bc_strong 초안·발급본)", () => {
    for (const data of [draftReport("bc_strong"), loadEd4("bc_strong", "issued")]) {
      const at41 = between(screenText(data), "4.1 데이터 점검", "4.2 종합 판정");
      expect(at41).toContain("| 데이터 검증 결과 | 오류 0건 / 경고 0건 | 항목별 결과는 아래 표");
    }
  });

  it("학습 데이터 재료·정보가 하나도 없으면 2.3 은 판 3 글 '등록된 학습 데이터셋 정보가 없습니다.'", () => {
    const draft = draftReport("bc_strong");
    delete draft.materials;
    delete draft.trainingDatasetInfo;
    const at23 = between(screenText(draft), "2.3 학습 데이터", "3. 시험 방법");
    expect(at23).toEqual(["2.3 학습 데이터", "등록된 학습 데이터셋 정보가 없습니다."]);
    // 재료가 있으면 그 표(평가 전 초안도 같은 표)
    const withMaterials = between(screenText(draftReport("bc_strong")), "2.3 학습 데이터", "3. 시험 방법");
    expect(withMaterials).toContain("| 학습 샘플 수 | 398개");
    expect(withMaterials).not.toContain("등록된 학습 데이터셋 정보가 없습니다.");
    // 판 3 조건 그대로 — 옛 학습 데이터 정보만 있어도 안내 글은 찍지 않는다.
    const legacyOnly = draftReport("bc_strong");
    delete legacyOnly.materials;
    expect(legacyOnly.trainingDatasetInfo).toBeTruthy();
    expect(screenText(legacyOnly)).not.toContain("등록된 학습 데이터셋 정보가 없습니다.");
  });
});

const FIXED_19 = '판정 여유 "작음"은 95% 신뢰구간이 합격 기준을 포함하거나, 신뢰구간이 없는 지표에서는 목표값과의 차이가 목표값의 3% 미만이라는 뜻입니다(3.4).';

describe("지적 5 — 고정 문구 19(4.3 표 아래)는 판정 대상 지표가 있을 때만", () => {
  it("bc_no_targets: 목표값을 모두 비워 판정 대상 0개(저장된 verdict.judgedCount 0)면 찍지 않는다", () => {
    const data = structuredClone(loadEd4("bc_strong", "final"));
    for (const r of data.kpiResults) r.threshold = null;
    for (const m of data.metricList) m.threshold = null;
    data.edition4Values!.verdict = { ...data.edition4Values!.verdict, verdict: "INCONCLUSIVE", judgedCount: 0, passedCount: 0, countText: "—" };
    const at43 = between(screenText(data), "4.3 지표별 결과", "4.4 오분류");
    expect(at43.filter((l) => /^\| M\d/.test(l))).toHaveLength(8);
    expect(at43.every((l) => !/^\| M\d/.test(l) || l.endsWith("| —"))).toBe(true);
    expect(at43).not.toContain(FIXED_19);
  });

  it("평가 전 초안(판정 값 없음)에도 찍지 않는다", () => {
    expect(screenText(draftReport("bc_strong"))).not.toContain(FIXED_19);
  });

  for (const tag of ["bc_strong", "digits_strong", "yeast_strong"] as const) {
    it(`${tag}: 판정 대상이 있으면 그대로(저장된 judgedCount = 판정 대상 지표 수 > 0)`, () => {
      const data = loadEd4(tag, "final");
      const judged = data.kpiResults.filter((r) => r.threshold !== null && r.status !== "unavailable").length;
      expect(data.edition4Values!.verdict.judgedCount).toBe(judged);
      expect(judged).toBeGreaterThan(0);
      expect(between(screenText(data), "4.3 지표별 결과", "4.4 오분류")).toContain(FIXED_19);
    });
  }
});

describe("지적 6 — 4.3 판정 칸 미달 지표는 판 3 같은 칸 글자 '불합격'(표지 21번 '충족/미달'은 그대로)", () => {
  it("yeast_strong: 미달 지표 F1 Score 줄의 판정 칸은 '불합격', 4.2 판정 근거(고정 문구 20)의 '미달'은 그대로", () => {
    const text = screenText(loadEd4("yeast_strong", "issued"));
    expect(between(text, "4.2 종합 판정", "4.3 지표별 결과")).toContain(
      "핵심 지표 Hamming Loss(M15), Jaccard Index(M17)는 목표를 충족하였으나 F1 Score(M4)가 목표에 미달하여, 3.4의 판정 규칙에 따라 조건부 합격으로 판정하였다.",
    );
    const at43 = between(text, "4.3 지표별 결과", "4.4 오분류");
    expect(at43).toContain("| M4 | F1 Score | 0.399 | [0.376, 0.425] | ≥ 0.450 | 불합격 | 충분");
    expect(at43.filter((l) => l.includes("| 미달 |"))).toEqual([]);
  });

  it("bc_fail_core: 핵심 지표 Recall 미달 줄", () => {
    const data = structuredClone(loadEd4("bc_strong", "final"));
    const recall = data.kpiResults.find((r) => r.metricId === "M3")!;
    recall.value = 0.984375;
    recall.threshold = 0.99;
    recall.status = "fail";
    const at43 = between(screenText(data), "4.3 지표별 결과", "4.4 오분류");
    expect(at43).toContain("| M3 | Recall (핵심) | 0.984 | [0.917, 0.997] | ≥ 0.990 | 불합격 | 작음");
  });

  it("판 3 같은 칸 글자와 같다(판 3 정답 RPT-2026-0004 지표 표 칸)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const golden = readFileSync(resolve(__dirname, "../../archive/issued/golden/RPT-2026-0004.sections.txt"), "utf8");
    expect(golden.split("\n")).toContain("| 불합격");
  });
});

describe("지적 7 — 의뢰자·데이터 값 속 $&·$'·$$·$` 를 그대로 찍는다(문자열 치환 특수 패턴)", () => {
  const SPECIALS = ["Net$&X", "a$'b", "c$$d", "e$`f", "{조사}g", "h{목록}"];

  it("rv3 dollarModel: 1.2 목적 문단 모델명, 2.2 클래스 목록 — 화면 글", () => {
    const data = structuredClone(loadEd4("bc_strong", "final"));
    data.evalScope.targetModel = "Net$&X";
    data.datasetInfo.classLabels = ["a$'b", "c$$d", "e$`f"];
    data.datasetInfo.classCount = 3;
    const text = screenText(data);
    const purpose = text.split("\n").find((l) => l.startsWith("본 시험성적서는 "));
    expect(purpose?.startsWith('본 시험성적서는 "Net$&X"를 대상으로 ')).toBe(true);
    expect(text).toContain("\n| 감지된 클래스 수 | 3개 — 클래스 목록: a$'b, c$$d, e$`f | 시스템 확인\n");
  });

  for (const value of SPECIALS) {
    it(`값 ${value} — 순수 함수마다 받은 글자 그대로`, () => {
      const data = structuredClone(loadEd4("bc_strong", "final"));
      data.evalScope.targetModel = value;
      data.datasetInfo.classLabels = [value, "z"];
      data.performer.orgName = value;
      expect(purposeParagraph(data)).toContain(`"${value}"`);
      expect(purposeParagraph(data)).not.toMatch(/\{모델\}/);
      const classes = evaluationDataRows(data).find((r) => r[0] === "감지된 클래스 수")!;
      expect(classes[1]).toBe(`2개 — 클래스 목록: ${value}, z`);
      expect(coverIssuerLine(data)).toBe(`발급 기관: ${value}`);
      expect(ed4RuleTail(value)).toContain(`(입력 점검 규칙 ${value})`);
    });
  }

  it("숫자 칸도 함수 치환(파일 크기)", () => {
    expect(fileSizeText(loadEd4("bc_strong", "final"))).toBe("3,727바이트");
  });
});

describe("지적 8 — 판 4 서술 문단의 홑 줄바꿈 보존(판 3 schema3 서술 문단과 같은 whitespace-pre-line)", () => {
  it("Ed4Narrative: 빈 줄은 문단 나눔, 홑 줄바꿈은 문단 안에 남고 줄바꿈 보존 클래스", () => {
    const view = render(<Ed4Narrative text={"첫 줄\n둘째 줄\n\n새 문단"} />);
    const ps = Array.from(view.container.querySelectorAll("p"));
    expect(ps.map((p) => p.textContent)).toEqual(["첫 줄\n둘째 줄", "새 문단"]);
    for (const p of ps) expect(p.classList.contains("whitespace-pre-line")).toBe(true);
    view.unmount();
  });

  it("성적서 화면: 5.1 서술(홑 줄바꿈 포함)의 문단이 줄바꿈 보존", () => {
    const data = structuredClone(loadEd4("bc_strong", "final"));
    data.conclusion.narrative = "판정 문장.\n둘째 줄 문장.";
    const view = render(
      <MemoryRouter>
        <ReportSections data={data} />
      </MemoryRouter>,
    );
    const p = Array.from(view.container.querySelectorAll("p")).find((el) => el.textContent === "판정 문장.\n둘째 줄 문장.");
    expect(p).toBeTruthy();
    expect(p!.classList.contains("whitespace-pre-line")).toBe(true);
    view.unmount();
  });
});

describe("rv2 지적 1 — 인쇄 입구(ReportPrint)가 판 4 를 mode=print 로 그린다", () => {
  const inspectPrint = async (tag: "bc_strong" | "digits_strong") => {
    let pageBreaks = -1;
    let badges = -1;
    await printText(loadEd4(tag, "issued"), undefined, {
      inspect: (root) => {
        pageBreaks = [...root.querySelectorAll("div")].filter((d) => d.style.pageBreakBefore === "always").length;
        badges = [...root.querySelectorAll("*")].filter((el) => el.textContent === SECTION_SOURCE_BADGE_TEXT).length;
      },
    });
    return { pageBreaks, badges };
  };

  it("digits_strong(8.1 규칙 기반 칸): ReportPrint 경로 DOM 에 PageBreak 6개, 칸 배지 요소 0개(print:hidden 으로 가린 것도 없음)", async () => {
    // 같은 데이터의 화면에는 배지가 있다(위 0 단정이 빈 이빨이 아님).
    expect(screenText(loadEd4("digits_strong", "issued"))).toContain(SECTION_SOURCE_BADGE_TEXT);
    expect(await inspectPrint("digits_strong")).toEqual({ pageBreaks: 6, badges: 0 });
  });

  it("bc_strong: ReportPrint 경로 PageBreak 6개", async () => {
    expect((await inspectPrint("bc_strong")).pageBreaks).toBe(6);
  });
});
