import { Link } from "react-router";

/**
 * 존재하지 않는 run 을 열었을 때의 화면 (ISSUES.md H-03 파생).
 *
 * 종전에는 `Report.tsx` 가 `if (!data) return null` 이라 **아무 설명 없는 흰 화면**이었다.
 * 도달 경로는 평범하다 — run 을 지운 뒤 남은 링크·북마크, 혹은 다른 브라우저에서
 * 열린 `/report/:id`(run 은 localStorage 에만 있다). 사용자는 무엇이 잘못됐는지,
 * 어디로 가야 하는지 알 수 없었다.
 *
 * 발급된 성적서라면 **번호로 서버 보관본을 복원할 수 있다**(F-01·F-04) — 그 길을 함께 준다.
 */
export function ReportNotFoundState() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-center text-lg font-semibold text-slate-800">
          성적서를 찾을 수 없습니다
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          이 링크가 가리키는 평가 실행 기록이 이 브라우저에 없습니다. 기록을 삭제했거나,
          다른 브라우저·기기에서 만든 성적서일 수 있습니다.
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          <strong>이미 발급된 성적서라면 번호로 복원할 수 있습니다</strong> —
          발급본은 서버에 보관됩니다. 주소창에 <code>/report/no/성적서번호</code> 를
          입력하세요.
        </p>
        <Link
          to="/workspaces"
          className="block w-full rounded bg-slate-800 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          워크스페이스 목록으로
        </Link>
      </div>
    </div>
  );
}
