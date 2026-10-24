/**
 * 판 4 4절 시험 결과의 뒷부분(4.4 오분류 ~ 4.8 응답시간). 절 제목은 `Ed4ResultsCore` 가 그린다.
 *
 * 표·문장 재료는 순수 함수(`lib/report/edition4/render/resultsDetail.ts`)가 저장값에서 읽어 만든다 — 이 부품은 그 결과를 예시본
 * 모양으로 놓기만 한다(다시 계산하지 않음). 화면·인쇄가 같은 부품이다(mode 로 가르는 것 없음).
 *
 * - 4.4: 혼동 행렬 건수 → 고정 문구 17(저장 문장) → M21 그림(골랐을 때, 행렬 칸만 — 영어 머리글·요약 상자 없음) → 최약 클래스 → 예측 편향 → (다중) 최다 오분류 쌍 →
 *   임계값 조정 여지(표가 없으면 소제목째 없음).
 * - 4.5: 분포·(멀티 고정 문구 7)·불균형 문장 → 학습·평가 클래스 비율(표, 또는 B16·B33 문장) → 고정 문구 24.
 * - 4.6: 참조 범위 표 → ※ 출처 줄 → 기준 없는 지표 문장.
 * - 4.7: 곡선 제목 줄 + 그림(판 3 차트 부품의 그림 부분 복사 — 판 3 부품은 자기 제목 상자를 그려 판 4 제목 한 줄과 겹친다),
 *   곡선이 없으면 부록 B17.
 * - 4.8: 지연시간 표, 없으면 예시본 "제공되지 않음 — …".
 */
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  benchmarkView,
  confusionCountsTable,
  confusionPairsTable,
  curveLines,
  curvePointsEd4,
  distributionView,
  latencyView,
  NO_CURVES_TEXT,
  predictionBiasTable,
  thresholdTable,
  weakestClassTable,
  type CurvePointEd4,
  type DetailTable,
} from "../../../lib/report/edition4/render/resultsDetail";
import { ConfusionMatrixChart } from "../sections/ConfusionMatrixChart";
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SubsectionTitle, Ed4TableTitle } from "./shared/Ed4Headings";
import { Ed4Paragraph } from "./shared/Ed4Paragraph";
import { Ed4Table } from "./shared/Ed4Table";

/** 표 하나 — 소제목(있으면), 표, 표 아래 줄. */
function DetailTableBlock({ table }: { table: DetailTable | null }) {
  if (!table) return null;
  return (
    <>
      {table.title !== null && <Ed4TableTitle>{table.title}</Ed4TableTitle>}
      <Ed4Table columns={table.columns} rows={table.rows} />
      {table.notes.map((note) => (
        <Ed4Paragraph key={note} className="text-xs text-slate-600">
          {note}
        </Ed4Paragraph>
      ))}
    </>
  );
}

/** 곡선 그림(판 3 `RocCurveChart`·`PrCurveChart` 의 그림 부분 복사 — 제목 상자 없이). jsdom 에서는 크기가 0 이라 글이 없다. */
function Ed4CurvePlot({ kind, points }: { kind: "roc" | "pr"; points: CurvePointEd4[] }) {
  const roc = kind === "roc";
  return (
    // data-ed4-curve-head: 앞 두 점(시험이 축 배선을 본다 — jsdom 에서는 그림 크기가 0 이라 그림 글이 없다).
    <div
      className="mt-2 h-[280px] min-h-[280px] w-full"
      data-ed4-curve={kind}
      data-ed4-curve-head={JSON.stringify(points.slice(0, 2))}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 15, right: 25, bottom: 25, left: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, 1]}
            tickCount={6}
            label={{ value: roc ? "FPR" : "Recall", position: "insideBottom", offset: -15, fontSize: 11, fill: "#64748b" }}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <YAxis
            domain={[0, 1]}
            tickCount={6}
            label={{ value: roc ? "TPR" : "Precision", angle: -90, position: "insideLeft", offset: -10, fontSize: 11, fill: "#64748b" }}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <Tooltip formatter={(v: number) => v.toFixed(3)} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }} />
          {roc && <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#cbd5e1" strokeDasharray="4 4" />}
          <Line type="monotone" dataKey="y" stroke={roc ? "#0f766e" : "#7e22ce"} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Ed4ResultsDetail({ data }: Ed4PartProps) {
  const kpis = data.kpiResults ?? [];
  const taskType = data.meta.taskType;
  const facts = data.narrativeFacts;
  const descriptions = data.datasetInfo?.classLabelDescriptions;
  const ed4 = data.edition4Values;

  const distribution = distributionView(ed4?.distribution, taskType);
  const benchmark = benchmarkView(data);
  const curves = curveLines(data.charts, kpis);
  const latency = latencyView(data.latency);

  return (
    <section data-ed4-part="Ed4ResultsDetail">
      <Ed4SubsectionTitle number="4.4" />
      <DetailTableBlock table={confusionCountsTable(data.confusionCounts)} />
      {data.errorRatioSentence && <Ed4Paragraph>{data.errorRatioSentence}</Ed4Paragraph>}
      {data.charts?.confusionMatrix && (
        <div className="mt-3" data-ed4-figure="M21">
          {/* 그림만 — 판 3 부품의 영어 머리글·요약 상자는 빼고(S6 질문 3), 판 3 부품의 판 3 모양은 그대로 */}
          <ConfusionMatrixChart data={data.charts.confusionMatrix} figureOnly />
        </div>
      )}
      <DetailTableBlock table={weakestClassTable(facts, kpis, descriptions, taskType)} />
      <DetailTableBlock table={predictionBiasTable(facts, descriptions)} />
      <DetailTableBlock table={confusionPairsTable(facts, taskType, descriptions)} />
      <DetailTableBlock table={thresholdTable(ed4?.thresholdTable)} />

      <Ed4SubsectionTitle number="4.5" />
      {distribution.paragraph && <Ed4Paragraph>{distribution.paragraph}</Ed4Paragraph>}
      <DetailTableBlock table={distribution.table} />
      {distribution.replacement && (
        <>
          <Ed4TableTitle>{distribution.replacement.title}</Ed4TableTitle>
          <Ed4Paragraph>{distribution.replacement.text}</Ed4Paragraph>
        </>
      )}
      <Ed4Paragraph>{distribution.closing}</Ed4Paragraph>

      <Ed4SubsectionTitle number="4.6" />
      <DetailTableBlock table={benchmark.table} />
      {benchmark.noBenchmark && <Ed4Paragraph>{benchmark.noBenchmark}</Ed4Paragraph>}

      <Ed4SubsectionTitle number="4.7" />
      {curves.length === 0 ? (
        <Ed4Paragraph>{NO_CURVES_TEXT}</Ed4Paragraph>
      ) : (
        curves.map((c) => {
          // 점 배열(축 배선)은 순수 함수 `curvePointsEd4` 가 정한다 — 그림 부품은 받은 점을 그리기만.
          const points = curvePointsEd4(data.charts, c.kind);
          return (
            <div key={c.kind}>
              <Ed4Paragraph>{c.title}</Ed4Paragraph>
              {points && <Ed4CurvePlot kind={c.kind} points={points} />}
            </div>
          );
        })
      )}

      <Ed4SubsectionTitle number="4.8" />
      <DetailTableBlock table={latency.table} />
      {latency.missing && <Ed4Paragraph>{latency.missing}</Ed4Paragraph>}
    </section>
  );
}
