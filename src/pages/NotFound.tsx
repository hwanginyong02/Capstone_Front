/**
 * 정의되지 않은 URL 을 위한 안내 화면.
 *
 * ISSUES.md E-12 — `routes.ts` 에 catch-all 이 없어 미매칭 URL 이 아무것도 렌더하지
 * 않았다. 오타나 오래된 북마크로 들어온 사용자는 안내 없는 백지를 만나고 되돌아갈
 * 링크조차 없었다.
 */
import { Link, useLocation } from "react-router";

export function NotFound() {
  const { pathname } = useLocation();

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-lg font-semibold text-slate-800">페이지를 찾을 수 없습니다</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        <span className="font-mono break-all">{pathname}</span> 경로는 존재하지 않습니다.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          to="/workspaces"
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          워크스페이스
        </Link>
        <Link
          to="/"
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
