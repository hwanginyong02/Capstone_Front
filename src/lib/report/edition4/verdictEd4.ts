/**
 * 판 4 의 종합 판정 글 — 4.2 표·판정 근거 문장(고정 문구 20, 부록 B12·B13)과 표지 시험 결과 요약의 종합 판정·핵심 지표 줄
 * (고정 문구 21, 부록 B2·B3). 생성 때(평가 뒤) 만들어 판 4 run 에만 저장한다(`FinalReportData.edition4Values`).
 *
 * 판정은 다시 하지 않는다 — 판정·판정 대상·사유는 사실 시트 `verdict_detail`(`computeVerdict` 한 곳의 결과), 판정 여유는
 * `KpiResult.judgmentMargin`, 값 표기는 사실 시트 `value_text` 와 같은 함수(`ed4Judged`)다. 같은 성적서의 표지·4.2·4.3·5.1 이
 * 서로 다른 판정을 찍지 않게.
 *
 * 고정 문구 20 의 조건부 합격·불합격·판정 불가 세 갈래는 예시본을 만들며 정한 초안이다(판 4 를 켜기 전 확인 목록).
 */
import type { KpiResult } from "../../../types/finalReport.types";
import { isJudged } from "../computeVerdict";
import type { MetricRef, NarrativeFacts } from "../narrativeFacts";
import { ed4Judged, ed4TargetCriteria } from "./edition4Number";
import {
  COVER_CORE_ROW,
  COVER_CORE_UNAVAILABLE,
  COVER_ROW_CORE,
  COVER_ROW_VERDICT,
  COVER_VERDICT_NONE,
  COVER_VERDICT_ROW,
  fillTemplate,
  INCONCLUSIVE_CAUSE_NO_JUDGED,
  INCONCLUSIVE_CAUSE_NO_TARGET,
  INCONCLUSIVE_CAUSE_NOT_COMPUTED,
  JUDGMENT_MARGIN_LABEL,
  VERDICT_BASIS_CONDITIONAL_DRAFT,
  VERDICT_BASIS_FAIL_DRAFT,
  VERDICT_BASIS_INCONCLUSIVE_DRAFT,
  VERDICT_BASIS_PASS,
  VERDICT_BASIS_PASS_CORE_ONLY,
  VERDICT_COUNT_CELL,
  VERDICT_COUNT_NONE,
  VERDICT_LABEL_ED4,
} from "./edition4Text";

type VerdictDetail = NarrativeFacts["verdict_detail"];
type VerdictCode = keyof typeof VERDICT_LABEL_ED4;

/** 4.2 종합 판정(표 한 줄과 근거 문장). */
export interface VerdictEd4 {
  /** 판정 코드(사실 시트 verdict 와 같음). */
  verdict: VerdictCode;
  /** 표의 종합 판정 칸("최종 합격"). */
  label: string;
  judgedCount: number;
  passedCount: number;
  /** 표의 "판정 대상 지표 중 충족" 칸("5개 중 5개", 판정 대상이 없으면 "—"). */
  countText: string;
  /**
   * 표 아래 근거 문장(고정 문구 20·부록 B13). 핵심 지표가 하나도 없는데 합격·조건부 합격이면 20번의 "핵심 지표 {…}" 자리를
   * 채울 이름이 없어 null(승인된 글이 없다 — 인계 질문).
   */
  basis: string | null;
}

/** "이름(ID)" 를 쉼표로 잇는다(부록 B13). 조사는 `fillTemplate` 이 마지막 이름으로 고른다. */
function namesWithId(refs: MetricRef[]): string {
  return refs.map((r) => `${r.display_name}(${r.metric_id})`).join(", ");
}

function inconclusiveCause(detail: VerdictDetail): string {
  const names = namesWithId(detail.inconclusive_metrics);
  if (detail.inconclusive_cause === "core_not_computed") return fillTemplate(INCONCLUSIVE_CAUSE_NOT_COMPUTED, { 이름: names });
  if (detail.inconclusive_cause === "no_target") return fillTemplate(INCONCLUSIVE_CAUSE_NO_TARGET, { 이름: names });
  return INCONCLUSIVE_CAUSE_NO_JUDGED;
}

/** 판정 대상인 핵심 지표(4.3 순서). 합격·조건부 합격 문장의 {핵심 지표}. */
function judgedCore(kpiResults: KpiResult[]): MetricRef[] {
  return kpiResults.filter((r) => r.isCore && isJudged(r)).map((r) => ({ metric_id: r.metricId, display_name: r.name }));
}

/**
 * 4.2 종합 판정. `detail` 은 사실 시트의 판정 근거(`verdictDetail` — 판정과 같은 한 곳), `kpiResults` 는 판 4 run 의 지표 결과.
 */
export function buildVerdictEd4(detail: VerdictDetail, kpiResults: KpiResult[]): VerdictEd4 {
  const verdict = detail.verdict as VerdictCode;
  const core = judgedCore(kpiResults);
  let basis: string | null = null;
  if (verdict === "FAIL") {
    basis = fillTemplate(VERDICT_BASIS_FAIL_DRAFT, { "미달 핵심 지표": namesWithId(detail.failed_core) });
  } else if (verdict === "INCONCLUSIVE") {
    basis = fillTemplate(VERDICT_BASIS_INCONCLUSIVE_DRAFT, { 원인: inconclusiveCause(detail) });
  } else if (core.length > 0 && verdict === "CONDITIONAL_PASS") {
    basis = fillTemplate(VERDICT_BASIS_CONDITIONAL_DRAFT, {
      "핵심 지표": namesWithId(core),
      "미달 지표": namesWithId(detail.failed_noncore),
    });
  } else if (core.length > 0) {
    // 핵심 지표만 판정 대상이면 "그 밖의 판정 대상 지표" 가 없다(부록 B13).
    const onlyCore = core.length === detail.judged_count;
    basis = fillTemplate(onlyCore ? VERDICT_BASIS_PASS_CORE_ONLY : VERDICT_BASIS_PASS, { "핵심 지표": namesWithId(core) });
  }
  return {
    verdict,
    label: VERDICT_LABEL_ED4[verdict],
    judgedCount: detail.judged_count,
    passedCount: detail.passed_count,
    countText:
      detail.judged_count > 0
        ? fillTemplate(VERDICT_COUNT_CELL, { N: String(detail.judged_count), n: String(detail.passed_count) })
        : VERDICT_COUNT_NONE,
    basis,
  };
}

/** 합격 기준 칸("≥ 0.970", 넷째 자리 목표는 "≥ 0.8124") — 3.1·4.3 과 같은 함수(`ed4TargetCriteria`, D1). */
function criteria(r: KpiResult): string | null {
  return r.threshold === null ? null : ed4TargetCriteria(r.threshold, r.higherIsBetter);
}

/**
 * 표지 시험 결과 요약의 종합 판정 줄 하나와 핵심 지표 줄(핵심 지표마다 하나, 4.3 순서). 보고 항목·주요 제약 줄은 재료 점검
 * (`materialCheck.printed.coverRows`)이 만들고, 표지는 이 줄들 뒤에 그 두 줄을 잇는다(고정 문구 21 의 4줄 순서).
 *
 * 목표값이 없는 핵심 지표(판정 불가 "목표값 부재")는 21번·B3 어느 틀에도 맞지 않아 줄을 두지 않는다(인계 질문).
 */
export function buildCoverResultRows(verdict: VerdictEd4, kpiResults: KpiResult[]): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    {
      label: COVER_ROW_VERDICT,
      value:
        verdict.judgedCount > 0
          ? fillTemplate(COVER_VERDICT_ROW, {
              판정: verdict.label,
              N: String(verdict.judgedCount),
              n: String(verdict.passedCount),
            })
          : COVER_VERDICT_NONE,
    },
  ];
  for (const r of kpiResults.filter((k) => k.isCore)) {
    const standard = criteria(r);
    if (standard === null) continue;
    if (r.status === "unavailable") {
      rows.push({ label: COVER_ROW_CORE, value: fillTemplate(COVER_CORE_UNAVAILABLE, { 이름: r.name, 기준: standard }) });
      continue;
    }
    if (!isJudged(r) || r.threshold === null || !r.judgmentMargin) continue;
    const pass = r.status === "pass";
    rows.push({
      label: COVER_ROW_CORE,
      value: fillTemplate(COVER_CORE_ROW, {
        이름: r.name,
        값: ed4Judged(r.value, r.threshold, r.higherIsBetter !== false, pass),
        기준: standard,
        "충족/미달": pass ? "충족" : "미달",
        "작음/충분": JUDGMENT_MARGIN_LABEL[r.judgmentMargin],
      }),
    });
  }
  return rows;
}
