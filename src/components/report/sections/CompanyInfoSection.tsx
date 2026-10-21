import type {
  ApplicantInfo,
  EvalScope,
  FinalReportMeta,
  MaterialCheckResult,
  PerformerInfo,
} from "../../../types/finalReport.types";
import { REPORT_PURPOSE_LABEL, REPORT_PURPOSE_OVERVIEW, constraintsFor } from "../../../lib/report/reportConstants";
import { SectionTitle } from "../shared/SectionTitle";
import { TwoColTable } from "../shared/TwoColTable";
import { SubsectionTitle } from "../shared/SubsectionTitle";

interface CompanyInfoSectionProps {
  applicant: ApplicantInfo;
  performer: PerformerInfo;
  evalScope: EvalScope;
  meta: FinalReportMeta;
  /** 재료 선택 점검 결과. 있으면 1.4 에 점검 결과 문구를 더한다(없는 옛 성적서는 종전 4항목). */
  materialCheck?: MaterialCheckResult;
  /** 신뢰구간을 찍은 성적서인지(`confidenceIntervalNote` 키). 그렇다면 1.4 에 고정 문구 3 을 더한다. */
  hasConfidenceIntervals?: boolean;
  /** 판 3 성적서인가(`usesSchema3`) — 소절 번호 등 판 3 모양을 이 판에만 그린다. 판 1·2 보관본은 발급 당시 모양. */
  schema3?: boolean;
}

export function CompanyInfoSection({
  applicant,
  performer,
  evalScope,
  meta,
  materialCheck,
  hasConfidenceIntervals = false,
  schema3,
}: CompanyInfoSectionProps) {
  const projectNumber = evalScope.projectNumber ?? evalScope.projectInfo?.projectNumber;
  return (
    <section className="space-y-8 border-t border-slate-200 py-10">
      <SectionTitle number={1} title="개요" />

      {/* 대상 */}
      <div className="space-y-2">
        <SubsectionTitle number="1.1" schema3={schema3} className="text-sm font-semibold text-slate-700">대상</SubsectionTitle>
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
        <SubsectionTitle number="1.2" schema3={schema3} className="text-sm font-semibold text-slate-700">회사 개요</SubsectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">신청인 (의뢰자)</p>
            <TwoColTable
              rows={[
                { label: "회사명",         value: applicant.companyName },
                { label: "대표자",         value: applicant.representative },
                { label: "사업자등록번호", value: applicant.businessNumber },
                { label: "전화번호",       value: applicant.contact },
                // 선택 항목은 값이 있을 때만 줄을 만든다(재료 목록 1절). 이전 보관본의 "—" 는
                // 값으로 보고 발급 당시처럼 찍는다.
                ...(applicant.fax ? [{ label: "FAX번호", value: applicant.fax }] : []),
                ...(applicant.homepage ? [{ label: "홈페이지", value: applicant.homepage }] : []),
                { label: "주소",           value: applicant.address },
                // 화면 칸 이름과 같은 '평가 의뢰일'(B1③). 저장 키 contractDate 는 발급본과 묶여 그대로 둔다.
                ...(meta.contractDate ? [{ label: "평가 의뢰일", value: meta.contractDate }] : []),
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
        <SubsectionTitle number="1.3" schema3={schema3} className="text-sm font-semibold text-slate-700">시험결과서 용도</SubsectionTitle>
        <TwoColTable
          rows={[
            { label: "용도", value: REPORT_PURPOSE_LABEL[evalScope.reportPurposeKey] },
            {
              label: "개요",
              value:
                (evalScope.purpose || REPORT_PURPOSE_OVERVIEW[evalScope.reportPurposeKey]) +
                // 덧붙인 글은 고치지 않고 싣되 우리 문장과 섞이지 않게 표시한다(재료 선택 점검 5절).
                (evalScope.purposeNote ? ` — 의뢰자 제공: ${evalScope.purposeNote}` : ""),
            },
            ...(evalScope.projectInfo
              ? [
                  { label: "과제명", value: evalScope.projectInfo.name },
                  { label: "과제 기관", value: evalScope.projectInfo.agency },
                ]
              : []),
            // 과제 번호는 용도와 무관하다. 이 칸이 생기기 전 보관본은 projectInfo 안에 적었다.
            ...(projectNumber ? [{ label: "과제 번호", value: projectNumber }] : []),
          ]}
        />
      </div>

      {/* 제약사항 */}
      <div className="space-y-3">
        <SubsectionTitle number="1.4" schema3={schema3} className="text-sm font-semibold text-slate-700">제약사항</SubsectionTitle>
        <p className="text-sm text-slate-500">
          본 시험결과서에서 기술한 내용은 다음의 전제 및 명시적 한계를 지닌다.
        </p>
        <ol className="space-y-3">
          {constraintsFor(materialCheck, hasConfidenceIntervals, schema3).map((c, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 font-semibold text-slate-700">{i + 1}.</span>
              <div className="space-y-1.5 text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-700">{c.title}:</strong> {c.body}
                </p>
                {c.details && c.details.length > 0 && (
                  <ul aria-label={`${c.title} 세부`} className="list-disc space-y-1 pl-5">
                    {c.details.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
