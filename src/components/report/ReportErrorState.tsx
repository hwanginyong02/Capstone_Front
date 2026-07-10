/**
 * 성적서 평가 연산 실패 시 표시하는 전체 화면 에러 상태.
 * Report 페이지에서 useReportData 가 에러를 반환할 때 렌더한다.
 */
interface ReportErrorStateProps {
  error: string;
  onBack: () => void;
}

export function ReportErrorState({ error, onBack }: ReportErrorStateProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg border border-red-200 shadow-sm p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
          <span className="text-xl font-bold">!</span>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">평가 연산 실패</h2>
          <p className="text-sm text-red-600 font-mono bg-red-50 p-3 rounded border border-red-100 break-all text-left">
            {error}
          </p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-2 px-4 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          이전 단계로 돌아가기
        </button>
      </div>
    </div>
  );
}
