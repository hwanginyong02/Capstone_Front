import { useNavigate } from "react-router";
import { ArrowLeft, BadgeCheck, Download, Home, LayoutDashboard, RefreshCw, Stamp } from "lucide-react";
import { Button } from "../../ui/button";

interface ReportLayoutProps {
  children: React.ReactNode;
  onDownload: () => void;
  /** 발급 완료 여부(문서 번호 확정) */
  issued?: boolean;
  /** 발급 버튼 노출 가능 여부(미리보기 제외 + 데이터 존재) */
  canIssue?: boolean;
  /** 발급된 성적서 번호(배지 표기) */
  reportId?: string;
  /** 발급/재발급 호출 진행 중 */
  busy?: boolean;
  onIssue?: () => void;
  onReissue?: (note: string) => void;
}

export function ReportLayout({
  children,
  onDownload,
  issued = false,
  canIssue = false,
  reportId,
  busy = false,
  onIssue,
  onReissue,
}: ReportLayoutProps) {
  const navigate = useNavigate();

  const handleIssue = () => {
    if (busy) return;
    if (window.confirm("성적서를 발급하시겠습니까? 발급 시 성적서 번호가 확정됩니다.")) {
      onIssue?.();
    }
  };

  const handleReissue = () => {
    if (busy) return;
    const note = window.prompt("정정 발급 사유를 입력하세요:");
    if (note && note.trim()) onReissue?.(note.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1.5 text-slate-600"
          >
            <ArrowLeft className="size-4" />
            뒤로가기
          </Button>

          <div className="h-4 w-px bg-slate-200" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <Home className="size-4" />
            메인 홈
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/workspaces")}
            className="gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <LayoutDashboard className="size-4" />
            내 워크스페이스
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {issued ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <BadgeCheck className="size-3.5" />
                발급됨{reportId ? ` · ${reportId}` : ""}
              </span>
              {onReissue && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={handleReissue}
                  className="gap-1.5"
                >
                  <RefreshCw className="size-4" />
                  {busy ? "처리 중..." : "정정 발급"}
                </Button>
              )}
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                초안 · 미발급
              </span>
              {canIssue && onIssue && (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={handleIssue}
                  className="gap-1.5"
                >
                  <Stamp className="size-4" />
                  {busy ? "발급 중..." : "발급"}
                </Button>
              )}
            </>
          )}

          <Button
            size="sm"
            variant={issued ? "default" : "ghost"}
            onClick={onDownload}
            className="gap-1.5"
          >
            <Download className="size-4" />
            PDF 다운로드
          </Button>
        </div>
      </header>

      {/* Report body */}
      <main className="mx-auto max-w-4xl px-6 py-10">
        {issued && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 print:hidden">
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-5 text-emerald-600 shrink-0" />
              <span>성적서가 성공적으로 발급되었습니다. 발급 번호: <strong>{reportId ?? "확정 완료"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/")} className="gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                <Home className="size-3.5" /> 메인 홈
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/workspaces")} className="gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                <LayoutDashboard className="size-3.5" /> 내 워크스페이스
              </Button>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
