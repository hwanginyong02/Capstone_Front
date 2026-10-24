/**
 * 다중(digits_strong)·멀티(yeast_strong) 판 4 자리 단정(판 4 라운드 S6 ③) — 예시본(이진)에 없는 자리를, 앱 흐름으로 다시 만든 판 4
 * run(`fixtures/` — `generate.test.tsx` 가 지금 코드로 다시 만들어 바이트 대조)을 **세 경로 그린 글**(화면·인쇄 × 미발급·발급본, 번호
 * 열기)에서 본다. 자리마다 "그 소절 안에 이 줄들이 이 순서로 붙어서 정확히 한 번" 있음을 단정한다.
 *
 * 기대 글은 렌더러 함수·상수를 부르지 않고 손으로 옮겨 적었다.
 * - 틀 글: 설계 문서 고정 문구 탭(4·5·7·9·17·23·24번), 예시본(4.4 최약 표 머리·각주, 4.5 비율 표 머리), 계획 부록 B(B5·B6·B7·B16·B33),
 *   판 3 글(최다 오분류 쌍·예측 편향·M11~M13·M22 표 제목 — 계획 4절 "판 3 표 제목 그대로").
 *   - 고정 문구 4: "다중 클래스 지표의 평균 방식은 {평균 방식}을 기준으로 한다. 의뢰자가 클래스 중요도를 "{선언 값}"(으)로 밝혔기
 *     때문이다." — 3.3 은 안내문 자리라 끝을 합니다체로(부록 A8, B7).
 *   - 고정 문구 5: "지표 선택 기준: {지표 선택 이유}"(멀티, 3.1).
 *   - 고정 문구 7: "다중 레이블에서 불균형 비율은 레이블 등장 빈도의 최다값 대 최소값의 비로 정의한다."(멀티, 4.5 불균형 비율 문장 앞).
 *   - B16: "제공되지 않음 — 학습 클래스 분포가 제공되지 않아 학습·평가 비율을 비교하지 않았다."
 *   - B33: "제공되지 않음 — 학습 표본 수가 제공되지 않아 학습·평가 비율을 비교하지 않았다."(초안, 2026-10-24 승인)
 * - 값: 판 4 생성값(픽스처 저장값)과 4.4 혼동 행렬 건수에서 손으로 계산해 옮겼다(예: 클래스 5 F1 = 2·53/(2·53+1+2) = 0.97248,
 *   클래스 9 = 2·52/(2·52+1+2) = 0.97196 — 셋째 자리로는 같아 보여 넷째 자리 0.9725·0.9720, 결정 D3).
 * - 픽스처에 없는 갈래(M22 클래스별 표, 레이블별 임계값 표, B33)는 픽스처 복사본에 그 칸만 넣어 그린다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildClassReportTable } from "../../../lib/report/classReportTable";
import { applyIssuance } from "../../../lib/report/issuanceApi";
import type { FinalReportData } from "../../../types/finalReport.types";
import { loadEd4, loadEd4Issuance, type Ed4Tag } from "./ed4Fixtures";
import { byNumberText, printText, screenText } from "./renderEd4";

/* ------------------------------------------------------------------ *
 * 세 경로 × 상태
 * ------------------------------------------------------------------ */
type Draw = [name: string, draw: () => Promise<string>];

/** 픽스처(또는 그 복사본 — `edit` 를 미발급 final 에 적용하고 발급본은 실제 applyIssuance 로)를 다섯 갈래로 그린다. */
function draws(tag: Ed4Tag, edit: (d: FinalReportData) => void = () => {}): Draw[] {
  const final = () => {
    const d = structuredClone(loadEd4(tag, "final"));
    edit(d);
    return d;
  };
  const issued = () => applyIssuance(final(), loadEd4Issuance(tag));
  return [
    ["화면·미발급", async () => screenText(final())],
    ["화면·발급본", async () => screenText(issued())],
    ["인쇄·미발급", () => printText(final())],
    ["인쇄·발급본", () => printText(issued())],
    ["번호 열기", () => byNumberText(final(), loadEd4Issuance(tag))],
  ];
}

const SUBSECTIONS = [
  "3.1 의뢰자 요구사항", "3.2 시험항목과 산정식", "3.3 산출 기준", "3.4 판정 규칙",
  "4.3 지표별 결과", "4.4 오분류", "4.5 데이터 분포", "4.6 참조 범위 비교",
] as const;
type Sub = (typeof SUBSECTIONS)[number];

/** 그린 글에서 소절 하나(제목 줄 ~ 다음 소절 제목 앞). 제목이 정확히 한 번이어야 한다. */
function subsection(text: string, sub: Sub): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  const starts = lines.flatMap((l, i) => (l === sub ? [i] : []));
  expect(starts, `소절 제목 "${sub}"`).toHaveLength(1);
  let end = starts[0] + 1;
  while (end < lines.length && !/^\d\.\d /.test(lines[end]) && !/^\d\. /.test(lines[end])) end += 1;
  return lines.slice(starts[0], end);
}

/** 소절 안에 `block` 줄들이 붙어서 정확히 한 번. */
function expectBlock(lines: string[], block: string[], label: string) {
  const hits = lines.flatMap((_, i) => (block.every((b, j) => lines[i + j] === b) ? [i] : []));
  expect(hits.length, `${label}: 붙은 블록이 정확히 한 번 있어야 한다\n찾은 블록:\n  ${block.join("\n  ")}\n소절:\n  ${lines.join("\n  ")}`).toBe(1);
}

interface Place {
  name: string;
  sub: Sub;
  block: string[];
}

function checkPlaces(tag: Ed4Tag, places: Place[], edit?: (d: FinalReportData) => void) {
  for (const [path, draw] of draws(tag, edit)) {
    it(`${path}`, async () => {
      const text = await draw();
      for (const p of places) expectBlock(subsection(text, p.sub), p.block, `${p.name}(${p.sub})`);
    });
  }
}

/* ------------------------------------------------------------------ *
 * 공통 틀 글(손으로 옮김)
 * ------------------------------------------------------------------ */
const FIXED_23 =
  "본 시험성적서의 지표 산출 결과와 합격 기준은 원본 데이터에서 소수점 셋째 자리로 반올림 표기되었습니다. 다만 판정 대상 지표의 값 중 셋째 자리로 반올림하면 판정과 어긋나 보이는 값과, 신뢰구간 경계 중 반올림하면 목표값과 같아 보이는 값은 자릿수를 늘려 표기하였습니다. 결정 임계값은 그 값을 그대로 적용해도 같은 예측이 나오는 자릿수로 표기하였습니다. 소견 문장의 숫자도 같은 규칙을 따릅니다. 표기한 값끼리 계산한 차이는 반올림 때문에 끝자리가 다를 수 있습니다.";
const FIXED_24 = "불균형과 분포 차이가 성능에 준 영향은 5.3에서 해석합니다.";
const WEAKEST_HEAD = "| 클래스 | F1 | 표본 수 | 비율 | 매크로 F1과의 차이 | 작은 표본";

/* ------------------------------------------------------------------ *
 * 다중 — digits_strong
 * ------------------------------------------------------------------ */
const DIGITS: Place[] = [
  {
    name: "B6 다중 전용 산정식(M11·M12)",
    sub: "3.2 시험항목과 산정식",
    block: [
      "다중 클래스 분류 전용 지표",
      "| Metric ID | 시험항목 | 시험목표 | 시험방법 및 산정식",
      "| M11 | Macro Average | 클래스별 지표를 같은 비중으로 평균합니다. | 클래스별 P·R·F1의 매크로 평균 — (Class1 + … + ClassN) / N",
      "| M12 | Micro Average | 모든 표본을 한데 모아 지표를 계산합니다. | 마이크로 평균 — 전 클래스의 TP·FP·FN을 합산해 P·R·F1을 계산",
    ],
  },
  {
    // 파생 예측이 없어(다중 확률 + 예측 컬럼) 9번이 없고, 4번이 첫 항목, 그다음 23번.
    name: "고정 문구 4(B7 충족, 합니다체)",
    sub: "3.3 산출 기준",
    block: [
      "3.3 산출 기준",
      '다중 클래스 지표의 평균 방식은 매크로 평균을 기준으로 합니다. 의뢰자가 클래스 중요도를 "모든 클래스가 동등"으로 밝혔기 때문입니다.',
      FIXED_23,
    ],
  },
  {
    name: "M11·M12 세부 표(판 3 표 제목)",
    sub: "4.3 지표별 결과",
    block: [
      "Average 지표 세부 결과 (M11 / M12 / M13)",
      "M11 — Macro Average",
      "| Metric | 값",
      "| Precision | 0.989",
      "| Recall | 0.989",
      "| F1 Score | 0.989",
      "M12 — Micro Average",
      "| Metric | 값",
      "| Precision | 0.989",
      "| Recall | 0.989",
      "| F1 Score | 0.989",
    ],
  },
  {
    name: "고정 문구 17 다중 갈래",
    sub: "4.4 오분류",
    block: [
      "| 9 | 52 | 485 | 1 | 2",
      "클래스마다 그 클래스를 양성, 나머지를 음성으로 본 건수입니다.",
      "확률이 있는 오분류 6건 중 경계 오류(예측·정답 클래스 확률 차가 0.1 미만)는 2건(33.3%), 확신 오류(예측 클래스 확률 0.9 이상)는 0건(0.0%)이다.",
    ],
  },
  {
    name: "최약 클래스(넷째 자리 0.9720 — 클래스 5 의 0.9725 와 갈리게)",
    sub: "4.4 오분류",
    block: [
      "최약 클래스(F1 최저)",
      WEAKEST_HEAD,
      "| 9 | 0.9720 | 54 | 10.0% | 0.017 | 아니오",
      "매크로 F1과의 차이 = 매크로 F1 − 이 클래스의 F1. 작은 표본은 표본 수 30건 미만 또는 전체의 5% 미만입니다.",
    ],
  },
  {
    // 오분류 6건 = FN 합(0+0+0+0+0+2+1+1+0+2). 비대각 칸 상위 3, 같으면 정답 클래스·예측 클래스 순. 1/6 = 16.7%.
    name: "최다 오분류 쌍(상위 3) — 4.4 끝",
    sub: "4.4 오분류",
    block: [
      "최다 오분류 쌍(상위 3)",
      "| 실제 → 예측 | 건수 | 오분류 중 비율",
      "| 5 → 6 | 1 | 16.7%",
      "| 5 → 9 | 1 | 16.7%",
      "| 6 → 1(숫자 1) | 1 | 16.7%",
    ],
  },
  {
    name: "4.5 학습·평가 비율 표(10클래스) + 24번",
    sub: "4.5 데이터 분포",
    block: [
      "학습·평가 클래스 비율",
      "| 클래스 | 학습 비율 | 평가 비율 | 차이",
      "| 0 | 9.9% | 10.0% | +0.1%p",
      "| 1 | 10.1% | 10.2% | +0.1%p",
      "| 2 | 9.9% | 9.8% | 0.0%p",
      "| 3 | 10.2% | 10.2% | 0.0%p",
      "| 4 | 10.1% | 10.0% | −0.1%p",
      "| 5 | 10.1% | 10.2% | +0.1%p",
      "| 6 | 10.1% | 10.0% | −0.1%p",
      "| 7 | 9.9% | 10.0% | +0.1%p",
      "| 8 | 9.7% | 9.6% | −0.1%p",
      "| 9 | 10.0% | 10.0% | 0.0%p",
      FIXED_24,
    ],
  },
];

describe("digits_strong(다중) — 3.2 B6·3.3 고정 문구 4·4.3 세부 표·4.4 최약 클래스·최다 오분류 쌍·4.5 비율 표", () => {
  checkPlaces("digits_strong", DIGITS);
});

describe("digits_strong — 다중에 없어야 하는 멀티 자리", () => {
  it.each(draws("digits_strong"))("%s: 고정 문구 5·7·최약 레이블·전체 레이블 없음", async (_n, draw) => {
    const text = await draw();
    expect(text).not.toContain("지표 선택 기준:");
    expect(text).not.toContain("다중 레이블에서 불균형 비율은");
    expect(text).not.toContain("최약 레이블(F1 최저)");
    expect(text).not.toContain("| 전체 레이블 |");
  });
});

/* M22(복사본) — 다중 run 에 M22 를 고르고 평가 응답의 class_report 를 저장한 것처럼. 값은 4.4 건수에서 손으로 계산:
 * P = TP/(TP+FP), R = TP/(TP+FN), F1 = 2TP/(2TP+FP+FN). 5·9 의 F1(0.97248·0.97196)은 셋째 자리로 같아 보여 넷째 자리. */
const DIGITS_EVALUATE = resolve(__dirname, "../evaluateNewKeys/digits_strong.evaluate.json");
const withM22 = (d: FinalReportData) => {
  d.kpiResults.push({ metricId: "M22", name: "Class-wise Metric", value: 0, threshold: null, status: "pass", higherIsBetter: true, isCore: false });
  const raw = JSON.parse(readFileSync(DIGITS_EVALUATE, "utf8"));
  d.classReport = buildClassReportTable(raw.results.success_metrics.class_report, [..."0123456789"], "multiclass");
};

describe("digits_strong + M22(복사본) — 4.3 B5 행과 클래스별 표", () => {
  checkPlaces(
    "digits_strong",
    [
      { name: "B5 M22 행", sub: "4.3 지표별 결과", block: ["| M22 | Class-wise Metric | — | — | — | 참고 지표 | —"] },
      {
        name: "M22 클래스별 표(판 3 표 제목) — 판정 여유 설명 다음, M11~M13 세부 표 앞",
        sub: "4.3 지표별 결과",
        block: [
          '판정 여유 "작음"은 95% 신뢰구간이 합격 기준을 포함하거나, 신뢰구간이 없는 지표에서는 목표값과의 차이가 목표값의 3% 미만이라는 뜻입니다(3.4).',
          "M22 — Class-wise Metric (클래스별 세부 성능)",
          "| 클래스 | Precision | Recall | F1 | 표본 수",
          "| 0 | 1.000 | 1.000 | 1.000 | 54",
          "| 1 | 0.982 | 1.000 | 0.991 | 55",
          "| 2 | 0.981 | 1.000 | 0.991 | 53",
          "| 3 | 1.000 | 1.000 | 1.000 | 55",
          "| 4 | 1.000 | 1.000 | 1.000 | 54",
          "| 5 | 0.981 | 0.964 | 0.9725 | 55",
          "| 6 | 0.981 | 0.981 | 0.981 | 54",
          "| 7 | 1.000 | 0.981 | 0.991 | 54",
          "| 8 | 0.981 | 1.000 | 0.990 | 52",
          "| 9 | 0.981 | 0.963 | 0.9720 | 54",
          "| 매크로 평균 | 0.989 | 0.989 | 0.989 | 540",
          "| 가중 평균 | 0.989 | 0.989 | 0.989 | 540",
          "| 마이크로 평균 | 0.989 | 0.989 | 0.989 | 540",
          "Average 지표 세부 결과 (M11 / M12 / M13)",
        ],
      },
    ],
    withM22,
  );
});

/* ------------------------------------------------------------------ *
 * 멀티 — yeast_strong
 * ------------------------------------------------------------------ */
const YEAST_DISTRIBUTION =
  "평가 데이터셋은 총 917건이며, 클래스(레이블)별 분포는 Class1 286건(31.2%), Class10 92건(10.0%), Class11 91건(9.9%), Class12 688건(75.0%), Class13 683건(74.5%), Class14 13건(1.4%), Class2 393건(42.9%), Class3 385건(42.0%), Class4 330건(36.0%), Class5 281건(30.6%), Class6 219건(23.9%), Class7 167건(18.2%), Class8 191건(20.8%), Class9 80건(8.7%)이다.";

const YEAST: Place[] = [
  {
    name: "고정 문구 5 — 선언 표 바로 뒤, 합격 기준 표 앞",
    sub: "3.1 의뢰자 요구사항",
    block: [
      "| 사용 방식 | 배치 (의뢰자 제공: 주 1회 새 유전자 목록을 한꺼번에 돌린다.)",
      "지표 선택 기준: 겹치는 정도를 봄 (의뢰자 제공: 한 유전자의 기능 범주를 일부라도 맞히면 실험 후보로 쓸 수 있다.)",
      "선택 지표와 합격 기준",
    ],
  },
  {
    // 레이블마다 같은 임계값 0.5 로 저장된 run — 9번 한 임계값 글 + 점수 컬럼, 레이블별 표 없음, 평균 방식(4번)은 다중만이라 없음.
    name: "고정 문구 9(합니다체)·23번 — 4번 없음",
    sub: "3.3 산출 기준",
    block: [
      "3.3 산출 기준",
      "본 평가의 예측값은 제출된 확률값에 결정 임계값 0.5를 적용하여 산출하였습니다. (점수 컬럼: score_Class1, score_Class2, score_Class3, score_Class4, score_Class5, score_Class6, score_Class7, score_Class8, score_Class9, score_Class10, score_Class11, score_Class12, score_Class13, score_Class14)",
      FIXED_23,
    ],
  },
  {
    name: "고정 문구 17 멀티 갈래(칸 단위 '개', 서술 문장이라 쉼표 없음)",
    sub: "4.4 오분류",
    block: [
      "클래스마다 그 클래스를 양성, 나머지를 음성으로 본 건수입니다.",
      "확률이 있는 틀린 레이블 칸 2687개 중 경계 오류(확률과 결정 임계값 0.5의 차가 0.1 미만)는 637개(23.7%), 확신 오류(틀린 쪽 확률 0.9 이상)는 431개(16.0%)이다.",
    ],
  },
  {
    // Class9: TP 2·FP 2·FN 78 → F1 = 4/84 = 0.048. 비율 분모 = 표본 수(80/917 = 8.7%, 4.5 와 같음 — S6 질문 4), 30건 이상·5% 이상이라 작은 표본 아님.
    name: "최약 레이블",
    sub: "4.4 오분류",
    block: [
      "최약 레이블(F1 최저)",
      "| 레이블 | F1 | 표본 수 | 비율 | 매크로 F1과의 차이 | 작은 표본",
      "| Class9 | 0.048 | 80 | 8.7% | 0.352 | 아니오",
      "매크로 F1과의 차이 = 매크로 F1 − 이 레이블의 F1. 작은 표본은 표본 수 30건 미만 또는 전체의 5% 미만입니다.",
    ],
  },
  {
    // 예측 3,290 = 4.4 TP+FP 합, 실제 3,899 = TP+FN 합(= 4.5 분포 건수 합). 표의 수는 천 단위 쉼표(S6 질문 8).
    name: "예측 편향 전체 레이블 — 4.4 끝(최다 오분류 쌍 없음)",
    sub: "4.4 오분류",
    block: ["예측 편향(예측 수 대 실제 수)", "| 대상 | 예측 수 | 실제 수 | 차이(예측 − 실제)", "| 전체 레이블 | 3,290 | 3,899 | −609"],
  },
  {
    name: "4.5 분포 문장 + 고정 문구 7 + 불균형 비율 문장(한 문단), B16, 24번",
    sub: "4.5 데이터 분포",
    block: [
      "4.5 데이터 분포",
      `${YEAST_DISTRIBUTION} 다중 레이블에서 불균형 비율은 레이블 등장 빈도의 최다값 대 최소값의 비로 정의한다. 클래스 불균형 비율(Imbalance Ratio)은 52.923이다.`,
      "학습·평가 클래스 비율",
      "제공되지 않음 — 학습 클래스 분포가 제공되지 않아 학습·평가 비율을 비교하지 않았다.",
      FIXED_24,
    ],
  },
];

describe("yeast_strong(멀티) — 3.1 고정 문구 5·3.3·4.4 최약 레이블·예측 편향·4.5 고정 문구 7·B16", () => {
  checkPlaces("yeast_strong", YEAST);
});

describe("yeast_strong — 멀티에 없어야 하는 다중 자리", () => {
  it.each(draws("yeast_strong"))("%s: 평균 방식(4번)·최다 오분류 쌍·학습 비율 표 없음", async (_n, draw) => {
    const text = await draw();
    expect(text).not.toContain("다중 클래스 지표의 평균 방식은");
    expect(text).not.toContain("최다 오분류 쌍");
    expect(text).not.toContain("| 클래스 | 학습 비율 | 평가 비율 | 차이");
    expect(text).not.toContain("최약 클래스(F1 최저)");
  });
});

describe("yeast_strong + 레이블별 임계값(복사본) — 3.3 9번 레이블별 갈래와 표", () => {
  checkPlaces(
    "yeast_strong",
    [
      {
        name: "9번 레이블별 글(합니다체) + 레이블별 임계값 표, 점수 컬럼 덧붙임 없음",
        sub: "3.3 산출 기준",
        block: [
          "3.3 산출 기준",
          "본 평가의 예측값은 제출된 확률값에 레이블별 결정 임계값(아래 표)을 적용하여 산출하였습니다.",
          "| 점수 컬럼 | 결정 임계값",
          "| score_Class1 | 0.35",
          "| score_Class2 | 0.5",
          FIXED_23,
        ],
      },
    ],
    (d) => {
      d.meta.derivedPrediction!.threshold = { score_Class1: 0.35, score_Class2: 0.5 };
    },
  );
});

describe("yeast_strong + 학습 표본 수 없음(복사본) — 4.5 B33", () => {
  checkPlaces(
    "yeast_strong",
    [
      {
        name: "B33(초안) — B16 아님",
        sub: "4.5 데이터 분포",
        block: ["학습·평가 클래스 비율", "제공되지 않음 — 학습 표본 수가 제공되지 않아 학습·평가 비율을 비교하지 않았다.", FIXED_24],
      },
    ],
    (d) => {
      d.edition4Values!.distribution.training = { status: "training_samples_not_provided", rows: [] };
    },
  );
});
