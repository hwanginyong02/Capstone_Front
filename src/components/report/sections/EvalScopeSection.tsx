import type { FinalReportMeta } from "../../../types/finalReport.types";
import { SectionTitle } from "../shared/SectionTitle";

const EVAL_PROCEDURE_STEPS = [
  { step: "시험신청서 제출", desc: "신규 프로젝트 생성 및 요구되는 형식에 맞춘 데이터셋 업로드" },
  { step: "시험신청서 검토", desc: "업로드 데이터의 정합성, 포맷 유효성 및 결측치 자동 검증" },
  { step: "시험 계약",       desc: "서비스 이용 약관 동의 및 평가 실행 승인" },
  { step: "시험·평가·작성", desc: "자동화 평가 엔진을 통한 분류 성능 지표 산출 및 종합 진단 리포트 생성" },
  { step: "결과서 상호확인", desc: "플랫폼 대시보드를 통한 산출 지표 및 세부 분석 결과 검토" },
  { step: "결과서 확정",     desc: "의뢰자의 최종 결과 확인 및 정식 시험결과서 발급 승인" },
  { step: "결과서 송부",     desc: "확정된 시험결과서(PDF) 발급 및 다운로드 제공" },
];

interface EvalScopeSectionProps {
  meta: FinalReportMeta;
}

export function EvalScopeSection({ meta }: EvalScopeSectionProps) {
  return (
    <section className="space-y-6 border-t border-slate-200 py-10">
      <SectionTitle number={2} title="시험 목적 및 절차" />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">시험 목적</h3>
        <p className="text-sm leading-relaxed text-slate-600">
          본 시험의 목적은 의뢰자가 제출한 기계학습 분류 모델의 추론 결과 데이터(Inference Result Dataset)를
          바탕으로, 국제 표준인 ISO/IEC TS 4213:2022에 명시된 평가 지표를 적용하여 객관적인 분류 성능을
          측정하고 신뢰성 수준을 정량적으로 확인하는 데 있다.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">시험 절차</h3>
        <ol className="space-y-2">
          {EVAL_PROCEDURE_STEPS.map(({ step, desc }, i) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="shrink-0 font-mono text-slate-400">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="font-medium text-slate-700">{step}:</span>{" "}
                <span className="text-slate-600">{desc}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">수행내용 및 시험기간</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-2 pr-4 text-left font-medium text-slate-500">시험 단계</th>
              <th className="py-2 pr-4 text-left font-medium text-slate-500">수행내용</th>
              <th className="py-2 text-left font-medium text-slate-500">시험기간</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 pr-4 font-medium text-slate-700">신청·검토·계약</td>
              <td className="py-2.5 pr-4 text-slate-600">데이터셋 업로드, 데이터 구조 및 유효성 자동 검증, 서비스 이용 동의 및 평가 승인</td>
              <td className="py-2.5 text-slate-600">{meta.contractDate ?? meta.evaluationPeriod.from}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 pr-4 font-medium text-slate-700">시험·평가·작성</td>
              <td className="py-2.5 pr-4 text-slate-600">ISO/IEC TS 4213 기반 분류 성능 지표 자동 연산, 종합 분석 소견 및 결과서 생성</td>
              <td className="py-2.5 text-slate-600">{meta.evaluationPeriod.from} ~ {meta.evaluationPeriod.to}</td>
            </tr>
            <tr>
              <td className="py-2.5 pr-4 font-medium text-slate-700">확인·확정·송부</td>
              <td className="py-2.5 pr-4 text-slate-600">대시보드를 통한 산출 결과 검토, 최종 확인 후 결과서(PDF) 생성 및 다운로드</td>
              <td className="py-2.5 text-slate-600">{meta.issuedAt || "(미발급)"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
