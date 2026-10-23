import { useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, BadgeCheck, Download, Home, LayoutDashboard, RefreshCw, Stamp } from "lucide-react";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import { ISSUANCE_TEXT_MAX_CHARS } from "../../../lib/report/issuanceApi";
import { cn } from "../../../utils/styling/styles";

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
  /** 발급. `note` 는 발급 비고(선택, 앞뒤 공백을 뗀 값 — 비면 ""). */
  onIssue?: (note: string) => void;
  /** 정정 발급. `note` 는 정정 사유(필수, 앞뒤 공백을 뗀 값). */
  onReissue?: (note: string) => void;
  /**
   * 인쇄(PDF)·발급·정정 발급을 잠근 이유(서술 라운드 S3b — 서술이 끝나지 않은 성적서). 있으면 세 버튼을 잠그고 이유를
   * 보여 준다. 발급 버튼은 숨기지 않고 잠근다 — 왜 못 하는지 보여야 한다.
   */
  lockReason?: string;
  /** 인쇄(PDF)만 잠근 이유(예: 결과 저장 실패). 발급은 서버 보관이라 막지 않는다. */
  printLockReason?: string;
}

/** 대화상자 안의 여러 줄 입력 칸. 상한은 백엔드와 같은 `ISSUANCE_TEXT_MAX_CHARS` 다. */
function IssuanceTextField({
  label,
  value,
  onChange,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={ISSUANCE_TEXT_MAX_CHARS}
        rows={3}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint`}
        className={cn(
          "border-input bg-input-background placeholder:text-muted-foreground min-h-20 w-full rounded-md border px-3 py-2 text-sm outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:border-destructive",
        )}
      />
      <div id={`${id}-hint`} className="flex items-start justify-between gap-3 text-xs">
        <span className={error ? "text-destructive" : "text-muted-foreground"}>{error ?? hint}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {value.length}/{ISSUANCE_TEXT_MAX_CHARS}
        </span>
      </div>
    </div>
  );
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
  lockReason,
  printLockReason,
}: ReportLayoutProps) {
  const pdfLockReason = lockReason ?? printLockReason;
  const navigate = useNavigate();
  const lockNoteId = useId();
  // 발급·정정 발급은 화면 안 대화상자로 받는다(B16). 종전 window.prompt 는 빈 사유를 말없이 버리고
  // 글자 수 상한도 알리지 못했다.
  const [dialog, setDialog] = useState<"issue" | "reissue" | null>(null);
  const [note, setNote] = useState("");
  const trimmedNote = note.trim();
  // 대화상자를 연 버튼. 버튼이 Radix 의 DialogTrigger 가 아니라 닫힐 때 Radix 가 포커스를 돌려줄 곳을
  // 모른다 — 그대로 두면 Esc·취소 뒤 포커스가 문서 맨 앞(body)으로 가서 키보드 사용자가 자리를 잃는다.
  const openerRef = useRef<HTMLElement | null>(null);

  const openDialog = (kind: "issue" | "reissue") => {
    if (busy) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNote("");
    setDialog(kind);
  };

  // 닫히면 연 버튼으로 포커스를 돌린다. 발급이 끝나 버튼이 바뀌었으면(화면에 없으면) Radix 기본 동작에 맡긴다.
  const restoreFocus = (event: Event) => {
    const opener = openerRef.current;
    openerRef.current = null;
    if (!opener?.isConnected) return;
    event.preventDefault();
    opener.focus();
  };

  const confirmIssue = () => {
    setDialog(null);
    onIssue?.(trimmedNote);
  };

  // 정정 사유는 필수다 — 비면 확인 버튼이 잠긴다(아래 disabled 한 곳에서 판정).
  const confirmReissue = () => {
    setDialog(null);
    onReissue?.(trimmedNote);
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
                  disabled={busy || !!lockReason}
                  title={lockReason}
                  onClick={() => openDialog("reissue")}
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
              {onIssue && (canIssue || lockReason) && (
                <Button
                  size="sm"
                  disabled={busy || !canIssue || !!lockReason}
                  title={lockReason}
                  onClick={() => openDialog("issue")}
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
            disabled={!!pdfLockReason}
            title={pdfLockReason}
            aria-describedby={pdfLockReason ? lockNoteId : undefined}
            className="gap-1.5"
          >
            <Download className="size-4" />
            PDF 다운로드
          </Button>
          {pdfLockReason && (
            <span id={lockNoteId} className="text-xs text-muted-foreground">
              {pdfLockReason}
            </span>
          )}
        </div>
      </header>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent onCloseAutoFocus={restoreFocus}>
          {dialog === "issue" && (
            <>
              <DialogHeader>
                <DialogTitle>성적서 발급</DialogTitle>
                <DialogDescription>발급하면 성적서 번호가 확정됩니다.</DialogDescription>
              </DialogHeader>
              <IssuanceTextField
                label="발급 비고 (선택)"
                value={note}
                onChange={setNote}
                hint="발급 이력에 인쇄됩니다. 비우면 '최초 발급'으로 적힙니다."
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">취소</Button>
                </DialogClose>
                <Button onClick={confirmIssue}>발급</Button>
              </DialogFooter>
            </>
          )}
          {dialog === "reissue" && (
            <>
              <DialogHeader>
                <DialogTitle>정정 발급</DialogTitle>
                <DialogDescription>같은 번호로 차수를 올려 다시 발급합니다.</DialogDescription>
              </DialogHeader>
              <IssuanceTextField
                label="정정 사유"
                value={note}
                onChange={setNote}
                hint="발급 이력에 인쇄됩니다."
                error={trimmedNote === "" ? "정정 사유를 적어 주세요." : undefined}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">취소</Button>
                </DialogClose>
                <Button onClick={confirmReissue} disabled={trimmedNote === ""}>
                  정정 발급
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
