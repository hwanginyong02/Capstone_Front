import { Download } from "lucide-react";
import { DemoPanel } from "./DemoPanel";

export function ReportDemo() {
  return (
    <DemoPanel index={6} action="mouse wheel">
      <div className="rounded-lg bg-slate-50">
        <div className="mb-5 flex items-center justify-end border-b border-slate-200 bg-white px-6 py-3">
          <button className="inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-sm text-primary-foreground">
            <Download className="h-4 w-4" />
            PDF 다운로드
          </button>
        </div>
        <div className="landing-report-scroll mx-auto max-h-[520px] max-w-4xl space-y-8 overflow-hidden px-6 pb-10 text-slate-700">
          <section className="bg-slate-50 px-10 py-8">
            <p className="text-center text-xs font-semibold tracking-wide text-slate-400">
              기준 표준: ISO/IEC TS 4213:2022
            </p>
            <h3 className="mt-6 text-center text-3xl font-bold text-slate-900">
              기계학습 분류 성능 시험결과서
            </h3>
            <div className="mx-auto mt-8 grid max-w-md grid-cols-[100px_1fr] gap-y-2 text-sm">
              <span>문서 번호</span>
              <strong>RPT-2025-0001</strong>
              <span>평가 유형</span>
              <strong>이진 분류 (Binary Classification)</strong>
              <span>평가 대상</span>
              <strong>ReviewClassifier-B</strong>
            </div>
          </section>
          {[
            [
              "SECTION 01",
              "1. 개요",
              "본 시험결과서는 ReviewClassifier-B를 대상으로 ISO/IEC TS 4213:2022 기준에 따른 이진 분류 성능 및 신뢰성 시험을 수행한 결과를 기술한 문서이다.",
            ],
            [
              "SECTION 02",
              "2. 데이터셋 정보",
              "학습 데이터 100건, 평가 데이터 100건을 기준으로 시험을 수행했으며 평가 데이터는 id, y_true, y_pred, score 컬럼을 포함한다.",
            ],
            [
              "SECTION 03",
              "3. 평가 지표",
              "Accuracy와 Precision을 주요 지표로 선정했으며 각 지표의 목표값은 0.95로 설정했다.",
            ],
            [
              "SECTION 04",
              "4. 데이터 검증 결과",
              "필수 컬럼, 결측치, 이진 클래스 값, 점수 범위 검증을 모두 통과했다.",
            ],
          ].map(([section, title, body]) => (
            <section key={title} className="border-t border-slate-200 bg-slate-50 py-7">
              <p className="text-xs font-semibold tracking-[0.28em] text-slate-400">
                {section}
              </p>
              <h4 className="mt-2 text-2xl font-bold text-slate-900">{title}</h4>
              <p className="mt-6 text-sm leading-7 text-slate-700">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </DemoPanel>
  );
}
