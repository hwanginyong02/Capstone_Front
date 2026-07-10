import type { ApplicantInfo, EvalScope, FinalReportMeta, PerformerInfo } from "../../../types/finalReport.types";
import { REPORT_PURPOSE_LABEL, REPORT_PURPOSE_OVERVIEW } from "../../../lib/report/reportConstants";
import { SectionTitle } from "../shared/SectionTitle";
import { TwoColTable } from "../shared/TwoColTable";

const CONSTRAINTS = [
  {
    title: "데이터 기반 평가의 국한성",
    body: "본 시험은 평가 대상 모델 자체가 아닌, 의뢰자가 당사 평가 시스템에 업로드한 추론 결과 데이터셋(Inference Result Dataset)을 기반으로 정량적 지표를 산출하였다. 따라서 본 결과서는 모델의 내부 아키텍처, 소스코드, 원본 학습 데이터의 무결성에 대한 직접적인 검증 결과를 포함하지 않는다.",
  },
  {
    title: "결과서 효력의 한계",
    body: "산출된 평가지표 및 종합 소견은 의뢰자가 제출한 특정 테스트 데이터셋 환경에 국한된 성능을 증명하며, 실제 서비스 배포 이후 발생하는 데이터 분포 변화(Data Drift)나 환경적 요인에 따른 성능 변동을 보장하지 않는다.",
  },
  {
    title: "자동화 진단 소견에 대한 면책",
    body: "종합 분석 소견은 산출된 통계 지표를 바탕으로 한 성능 해석 및 기술적 권고안으로, 모델 개선을 위한 보조적 참고 자료이다. 최종적인 서비스 운영 및 상용화 의사결정의 책임은 전적으로 평가 의뢰자에게 있다.",
  },
  {
    title: "LLM 생성 소견에 대한 면책",
    body: "본 결과서의 서술형 분석 소견(7절 이후)은 산출된 정량 지표를 바탕으로 LLM(Large Language Model) 및 RAG(Retrieval-Augmented Generation) 기술을 활용하여 자동 생성되었다. 해당 소견은 참고용이며, 전문가의 추가 검토를 권장한다.",
  },
];

interface CompanyInfoSectionProps {
  applicant: ApplicantInfo;
  performer: PerformerInfo;
  evalScope: EvalScope;
  meta: FinalReportMeta;
}

export function CompanyInfoSection({ applicant, performer, evalScope, meta }: CompanyInfoSectionProps) {
  return (
    <section className="space-y-8 border-t border-slate-200 py-10">
      <SectionTitle number={1} title="개요" />

      {/* 대상 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">대상</h3>
        <p className="text-sm leading-relaxed text-slate-600">
          본 시험결과서는 <strong>"{evalScope.targetModel}"</strong> 을 대상으로 ISO/IEC TS 4213:2022 기준에
          따른 기계학습 분류 성능 및 신뢰성 시험을 수행한 결과를 기술한 문서이다.
          {evalScope.modelCategory && (
            <> 본 모델은 <strong>{evalScope.modelCategory}</strong> 형식으로 구현되었으며</>
          )}
          {evalScope.modelPurpose && (
            <>{evalScope.modelCategory ? ", " : " 본 모델은 "}
              <strong>{evalScope.modelPurpose}</strong> 목적으로 개발되었다.
            </>
          )}
        </p>
      </div>

      {/* 회사 개요 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">회사 개요</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">신청인 (의뢰자)</p>
            <TwoColTable
              rows={[
                { label: "회사명",         value: applicant.companyName },
                { label: "대표자",         value: applicant.representative },
                { label: "사업자등록번호", value: applicant.businessNumber },
                { label: "전화번호",       value: applicant.contact },
                { label: "FAX번호",        value: applicant.fax },
                { label: "홈페이지",       value: applicant.homepage },
                { label: "주소",           value: applicant.address },
                ...(meta.contractDate ? [{ label: "계약일자", value: meta.contractDate }] : []),
              ]}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">수행기관</p>
            <TwoColTable
              rows={[
                { label: "기관명",  value: performer.orgName },
                { label: "평가자",  value: performer.evaluator },
                { label: "연락처",  value: performer.contact },
              ]}
            />
          </div>
        </div>
      </div>

      {/* 시험결과서 용도 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">시험결과서 용도</h3>
        <TwoColTable
          rows={[
            { label: "용도", value: REPORT_PURPOSE_LABEL[evalScope.reportPurposeKey] },
            { label: "개요", value: evalScope.purpose || REPORT_PURPOSE_OVERVIEW[evalScope.reportPurposeKey] },
            ...(evalScope.projectInfo
              ? [
                  { label: "프로젝트명", value: evalScope.projectInfo.name },
                  { label: "주관기관", value: evalScope.projectInfo.agency },
                  ...(evalScope.projectInfo.projectNumber
                    ? [{ label: "과제번호", value: evalScope.projectInfo.projectNumber }]
                    : []),
                ]
              : []),
          ]}
        />
      </div>

      {/* 제약사항 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">제약사항</h3>
        <p className="text-sm text-slate-500">
          본 시험결과서에서 기술한 내용은 다음의 전제 및 명시적 한계를 지닌다.
        </p>
        <ol className="space-y-3">
          {CONSTRAINTS.map((c, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 font-semibold text-slate-700">{i + 1}.</span>
              <span className="text-slate-600 leading-relaxed">
                <strong className="text-slate-700">{c.title}:</strong> {c.body}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
