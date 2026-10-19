/**
 * 성적서 화면의 상태 안내(서술 라운드 S3b) — 찾을 수 없음 · 파일 다시 올리기 · 다시 평가 필요 · 서술 진행/실패 ·
 * 저장 실패 · 서술 없이 발급된 성적서 · 인쇄할 수 없음.
 *
 * 문구가 화면마다 흩어지면 같은 상태를 다르게 부르게 된다. 한곳에 모은다.
 */
import { useId, useRef } from "react";
import { AlertTriangle, FileUp, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router";

import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import type { FileFingerprint } from "../../lib/report/evaluationRequest";
import type { NarrativeFailure, NarrativeJobStage } from "../../lib/report/narrativeJobApi";

/** 진행 단계 이름(화면용). */
export const NARRATIVE_STAGE_LABEL: Record<NarrativeJobStage, string> = {
  queued: "대기 중",
  generating: "생성 중",
  checking: "검사 중",
  regenerating: "다시 만드는 중",
  done: "완료",
  failed: "실패",
};

/** 실패 종류별 안내(화면용). */
export const NARRATIVE_FAILURE_TEXT: Record<NarrativeFailure, string> = {
  timeout: "서술이 제한 시간(10분) 안에 끝나지 않았습니다.",
  lost: "서버가 다시 시작되는 등으로 서술 작업이 멈췄습니다.",
  error: "서술을 만드는 중 서버에서 오류가 났습니다.",
  expired: "서술 결과의 보관 시간이 지났습니다.",
  unreachable: "서버에 연결되지 않아 서술 진행을 확인하지 못했습니다.",
  create_failed: "서술 작업을 시작하지 못했습니다.",
};

/** 인쇄·PDF·발급을 잠근 이유(화면용). */
export const NARRATIVE_LOCK_REASON = "서술이 끝나지 않아 인쇄·발급할 수 없습니다.";

function CenteredState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="mt-3 text-sm leading-relaxed text-foreground-secondary">{children}</div>
    </div>
  );
}

const linkClass =
  "mt-6 inline-block rounded border border-border-strong px-4 py-2 text-sm text-foreground-secondary hover:bg-muted";

/** 없는 평가 번호 — 평가를 시작하지 않는다(점검 유-9). */
export function ReportNotFoundState() {
  return (
    <CenteredState title="성적서를 찾을 수 없습니다">
      <p>이 브라우저의 워크스페이스에 이 평가가 없습니다. 주소를 다시 확인하거나 워크스페이스에서 평가를 열어 주세요.</p>
      <Link to="/workspaces" className={linkClass}>
        워크스페이스로 이동
      </Link>
    </CenteredState>
  );
}

/** 평가할 파일이 없거나 다른 파일이다 — 이 평가를 만들 때의 파일을 다시 올려야 한다(점검 유-8). */
export function ReportNeedsFileState({
  expected,
  onFile,
  mismatch,
}: {
  expected: FileFingerprint | null | undefined;
  onFile: (file: File) => void;
  /** 방금 올린 파일이 지문과 달랐다. */
  mismatch?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <CenteredState title="이 평가의 파일을 다시 올려 주세요">
      <p>
        성적서를 만들려면 이 평가를 만들 때 쓴 파일이 필요합니다. 파일은 브라우저에 저장되지 않아 새로고침하거나 다른
        평가를 연 뒤에는 다시 올려야 합니다.
      </p>
      {expected && (
        <p className="mt-2 text-xs text-muted-foreground">
          필요한 파일: <span className="font-mono">{expected.name}</span> ({expected.bytes.toLocaleString()} 바이트)
        </p>
      )}
      {mismatch && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          올린 파일이 이 평가의 파일과 다릅니다(이름·크기·수정 시각이 모두 같아야 합니다).
        </p>
      )}
      <label htmlFor={inputId} className="sr-only">
        평가 파일 선택
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <Button className="mt-6 gap-1.5" onClick={() => inputRef.current?.click()}>
        <FileUp className="size-4" />
        파일 다시 올리기
      </Button>
    </CenteredState>
  );
}

/** 평가 요청 스냅샷이 없는 옛 평가, 또는 저장소 이행이 다시 평가하라고 표시한 평가. */
export function ReportNeedsReevaluationState() {
  return (
    <CenteredState title="이 평가는 다시 평가해야 합니다">
      <p>
        이전 판에서 만든 평가라 성적서를 다시 만드는 데 필요한 입력이 남아 있지 않거나, 서술이 빈 채로 저장된 평가입니다.
        데이터 검증 화면에서 평가를 다시 실행해 주세요.
      </p>
      <Link to="/app/data-validation" className={linkClass}>
        검증 화면으로 이동
      </Link>
    </CenteredState>
  );
}

/** 서술 진행 띠(pending) 또는 실패 띠(failed) + "서술 다시 만들기". */
export function NarrativeStatusBanner({
  phase,
  stage,
  failure,
  retrying,
  onRetry,
}: {
  phase: "none" | "pending" | "done" | "failed";
  stage: NarrativeJobStage | null;
  failure?: NarrativeFailure;
  retrying: boolean;
  onRetry: () => void;
}) {
  if (phase === "pending") {
    return (
      <div
        role="status"
        className="mb-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary-subtle px-4 py-2.5 text-sm text-primary"
      >
        <Loader2 className="size-4 animate-spin" />
        <span>
          AI 정성 서술(7·8·9절)을 만드는 중입니다 — <strong>{NARRATIVE_STAGE_LABEL[stage ?? "queued"]}</strong>. 아래
          지표·차트는 이미 확정된 결과이며, 서술은 끝나는 대로 채워집니다. 그동안 인쇄·발급은 잠깁니다.
        </span>
      </div>
    );
  }
  if (phase === "failed") {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {failure ? NARRATIVE_FAILURE_TEXT[failure] : "서술을 만들지 못했습니다."} 지표·차트는 확정됐지만 서술이 없어
            인쇄·발급할 수 없습니다.
          </span>
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5" disabled={retrying} onClick={onRetry}>
            <RefreshCw className="size-4" />
            {retrying ? "다시 만드는 중..." : "서술 다시 만들기"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

/** 저장 실패(저장 공간 초과 등) — 화면에는 보이지만 새로고침하면 사라진다(점검 유-10). */
export function SaveErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/** 서술이 빈 채로 발급된 옛 성적서(저장소 판 3 이행 표시) — 보관본은 그대로 두고 고치는 길을 알린다. */
export function IssuedEmptyNarrativeNotice() {
  return (
    <Alert className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        이 성적서는 서술(7·8·9절)이 비어 있는 채로 발급됐습니다. 발급본은 바꿀 수 없으므로 정정 발급으로만 고칠 수
        있습니다.
      </AlertDescription>
    </Alert>
  );
}

/** 인쇄 화면 — 서술까지 끝난 완성본만 인쇄한다. */
export function NotPrintableState() {
  return (
    <CenteredState title="서술이 끝나지 않아 인쇄할 수 없습니다">
      <p>성적서 화면에서 서술이 끝난 뒤(또는 서술을 다시 만든 뒤) PDF 다운로드를 다시 눌러 주세요.</p>
    </CenteredState>
  );
}
