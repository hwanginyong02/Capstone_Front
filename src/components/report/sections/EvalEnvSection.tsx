import type { EvalEnvironment, EvalScope, FinalReportMeta } from "../../../types/finalReport.types";
import { SectionTitle } from "../shared/SectionTitle";
import { TwoColTable } from "../shared/TwoColTable";

interface EvalEnvSectionProps {
  meta: FinalReportMeta;
  evalScope: EvalScope;
  evalEnv: EvalEnvironment;
}

export function EvalEnvSection({ meta, evalScope, evalEnv }: EvalEnvSectionProps) {
  return (
    <section className="space-y-6 border-t border-slate-200 py-10">
      <SectionTitle
        number={4}
        title="평가 수행 환경"
        subtitle="본 시험은 의뢰자가 업로드한 추론 결과 데이터를 기반으로, 당사 자동화 평가 엔진이 ISO/IEC TS 4213:2022 기준에 따라 서버 사이드에서 지표를 자동 산출하였다."
      />

      <TwoColTable
        rows={[
          { label: "평가 플랫폼",      value: "AI 분류 성능 평가 시스템" },
          { label: "평가 엔진 버전",   value: evalScope.version },
          { label: "평가 실행 방식",   value: evalEnv.method },
          { label: "적용 기준 표준",   value: "ISO/IEC TS 4213:2022" },
          { label: "운영체제",         value: evalEnv.systemSpec.os },
          { label: "CPU",              value: evalEnv.systemSpec.cpu },
          { label: "GPU",              value: evalEnv.systemSpec.gpu },
          { label: "메모리",           value: evalEnv.systemSpec.memory },
          { label: "소프트웨어",       value: evalEnv.systemSpec.software },
          { label: "주요 라이브러리",  value: evalEnv.tools.join(", ") },
          { label: "평가 요청 일시",   value: `${meta.evaluationPeriod.from} 09:00 KST` },
          { label: "평가 완료 일시",   value: `${meta.evaluationPeriod.to} 18:00 KST` },
        ]}
      />
    </section>
  );
}
