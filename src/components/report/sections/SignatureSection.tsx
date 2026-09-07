import type {
  EvalScope,
  FinalReportMeta,
  PerformerInfo,
  SignatureData,
} from "../../../types/finalReport.types";

interface SignatureSectionProps {
  signature: SignatureData;
  meta: FinalReportMeta;
  evalScope: EvalScope;
  performer: PerformerInfo;
}

export function SignatureSection({ signature, meta, evalScope, performer }: SignatureSectionProps) {
  // 문서 번호가 없으면 미발급(초안) — 발급 전에는 서명/이력 대신 안내를 표시한다(설계 §6·§10).
  const issued = !!meta.reportId;
  if (!issued) {
    return (
      <section className="space-y-3 border-t border-slate-200 py-10 text-center">
        <p className="text-sm font-semibold text-slate-700">[ 초안 — 미발급 ]</p>
        <p className="text-xs text-slate-500">
          평가 결과는 확정되었으나 아직 발급되지 않았습니다. 상단의 “발급” 버튼으로 성적서 번호와 서명을 확정하세요.
        </p>
      </section>
    );
  }

  const issuanceFields: { label: string; value: string }[] = [
    { label: "발급 기관",      value: signature.issuer },
    { label: "발급 일시",      value: meta.issuedAt },
    // 사용자가 입력한 대상 모델의 버전이다(ISSUES.md F-08 — 라벨 정정).
    { label: "대상 모델 버전", value: evalScope.version },
    { label: "문서 번호",      value: meta.reportId },
    { label: "평가자",         value: performer.evaluator },
    { label: "서명일",         value: signature.signedAt },
  ];

  return (
    <section className="space-y-6 border-t border-slate-200 py-10">
      <p className="text-center text-sm font-semibold text-slate-700">[ 발급 완료 ]</p>
      <p className="text-center text-xs text-slate-500">
        본 시험결과서는 AI 자동화 평가 시스템에 의해 생성되었으며, 의뢰자의 최종 확인을 거쳐 정식 발급된 문서입니다.
      </p>

      {/* Signature box — 6필드 (3x2 grid) */}
      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
        {issuanceFields.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 p-4 space-y-1">
            <p className="text-xs font-medium text-slate-400">{label}</p>
            <p className="font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Issuance history */}
      {signature.history.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">발급 이력</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-1.5 pr-4 text-left font-medium text-slate-400 text-xs">버전</th>
                <th className="py-1.5 pr-4 text-left font-medium text-slate-400 text-xs">발급일</th>
                <th className="py-1.5 text-left font-medium text-slate-400 text-xs">비고</th>
              </tr>
            </thead>
            <tbody>
              {signature.history.map((h) => (
                <tr key={h.version} className="border-b border-slate-50 last:border-b-0">
                  <td className="py-1.5 pr-4 font-mono text-xs text-slate-600">{h.version}</td>
                  <td className="py-1.5 pr-4 text-slate-600">{h.issuedAt}</td>
                  <td className="py-1.5 text-slate-600">{h.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
