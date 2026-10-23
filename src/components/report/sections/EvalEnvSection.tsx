import type {
  EvalEnvironment,
  EvalScope,
  FinalReportMeta,
  ReportMaterials,
} from "../../../types/finalReport.types";
import { buildEvalEnvironment } from "../../../lib/report/reportEnvironment";
import { SectionTitle } from "../shared/SectionTitle";
import { TwoColTable } from "../shared/TwoColTable";
import { materialText, toTableRows } from "../shared/materialRows";

interface EvalEnvSectionProps {
  meta: FinalReportMeta;
  evalScope: EvalScope;
  evalEnv: EvalEnvironment;
  /** ⑨ 의 가속 사용(환경 표)과 하이퍼파라미터(표 아래). 옛 성적서에는 없다. */
  materials?: ReportMaterials;
  /** 판 3 성적서인가(`usesSchema3`) — 소절 번호 등 판 3 모양을 이 판에만 그린다. 판 1·2 보관본은 발급 당시 모양. */
  schema3?: boolean;
}

export function EvalEnvSection({ meta, evalScope, evalEnv, materials, schema3 }: EvalEnvSectionProps) {
  // 서버가 확정한 실측 환경. 구 스냅샷(환경 정보 없음)은 종전 상수로 폴백한다 —
  // 결정 4 에 따라 이미 발급된 성적서의 표시를 바꾸지 않기 위해서다.
  const environment = buildEvalEnvironment(evalEnv.environment);

  return (
    <section className="space-y-6 border-t border-slate-200 py-10">
      <SectionTitle
        number={4}
        title="평가 수행 환경"
        subtitle="본 시험은 의뢰자가 업로드한 추론 결과 데이터를 기반으로, 당사 자동화 평가 엔진이 ISO/IEC TS 4213:2022 기준에 따라 서버 사이드에서 지표를 자동 산출하였다."
      />

      <TwoColTable
        rows={[
          // 판 3 본문에는 AI 표현을 쓰지 않는다(서술 라운드 세션 B, 사용자 결정 2). 판 1·2 보관본은 발급 당시 문구.
          { label: "평가 플랫폼",      value: schema3 ? "분류 성능 평가 시스템" : "AI 분류 성능 평가 시스템" },
          // 이 값은 사용자가 입력한 **대상 모델**의 버전이다. 종전 라벨("평가 엔진 버전")은
          // 평가 시스템의 버전인 것처럼 읽혀, 성적서가 평가 도구를 잘못 증언했다(F-08).
          // 값을 지우는 대신 라벨을 바로잡는다 — 모델 버전은 성적서 다른 곳에 인쇄되지 않는다.
          { label: "대상 모델 버전",   value: evalScope.version },
          { label: "평가 실행 방식",   value: evalEnv.method },
          { label: "적용 기준 표준",   value: "ISO/IEC TS 4213:2022" },
          { label: "운영체제",         value: evalEnv.systemSpec.os },
          { label: "CPU",              value: evalEnv.systemSpec.cpu },
          { label: "GPU",              value: evalEnv.systemSpec.gpu },
          { label: "메모리",           value: evalEnv.systemSpec.memory },
          { label: "소프트웨어",       value: evalEnv.systemSpec.software },
          // 학습이나 시험 중 가속 사용(TS 4213 5.3.12) — 실행 환경에 합친 2층 항목.
          ...(materials ? toTableRows(materials.environment) : []),
          { label: "주요 라이브러리",  value: environment.tools.join(", ") },
          // 평가 수행 시각은 서버가 확정한다. 종전에는 "09:00/18:00 KST" 라는 고정 문자열을
          // 붙여 실제 수행 시각과 무관한 시간을 인쇄했다(F-09).
          {
            label: "평가 수행 일시",
            value: environment.evaluatedAt ?? `${meta.evaluationPeriod.to} (시각 미기록)`,
          },
        ]}
      />

      {/* 하이퍼파라미터(TS 4213 5.3.10) — 4절 환경 표 아래(서술 설계 D35). 2층 항목. */}
      {materials && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">하이퍼파라미터</h3>
          <TwoColTable
            rows={[{ label: "알고리즘", value: materialText(materials.hyperparameters.algorithm) }]}
          />
          {materials.hyperparameters.rows ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-4 text-left font-medium text-slate-500 w-48">이름</th>
                  <th className="py-2 text-left font-medium text-slate-500">값</th>
                </tr>
              </thead>
              <tbody>
                {materials.hyperparameters.rows.map((row) => (
                  <tr key={row.name} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-2 pr-4 font-mono text-xs text-slate-700">{row.name}</td>
                    <td className="py-2 font-mono text-xs text-slate-900">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">하이퍼파라미터: {materialText(null)}</p>
          )}
        </div>
      )}
    </section>
  );
}
