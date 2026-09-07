import { AlertTriangle } from "lucide-react";
import { Link } from "react-router";

import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";

/**
 * 아직 평가가 끝나지 않은 성적서를 보고 있다는 안내 (ISSUES.md E-03).
 *
 * LLM 서술 병합은 최대 160초 걸린다. 그 사이에 새로고침하면 워크스페이스에 저장된
 * run 은 있지만 `isEvaluated` 가 아직 false 인 **미평가 draft** 가 그대로 렌더된다.
 * 종전에는 그 화면에 안내가 **0건**이었다 — 사용자는 지표가 비어 있는 성적서를 보고
 * 그것이 완성본이라고 믿거나, 무엇을 해야 하는지 모른 채 갇혔다.
 * (`FileReuploadNotice` 는 매핑·검증 두 화면에만 마운트돼 있고 성적서에는 없었다.)
 *
 * 발급 버튼은 이미 `isEvaluated` 를 보고 잠기므로, 여기서 할 일은 **사실을 말하고
 * 되돌아갈 길을 주는 것**이다.
 */
export function UnevaluatedDraftNotice({ isEvaluated }: { isEvaluated: boolean }) {
  if (isEvaluated) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          아직 평가가 끝나지 않은 성적서입니다. 지표·차트가 비어 있거나 옛 값일 수 있으며
          이 상태로는 발급할 수 없습니다.
        </span>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/app/data-validation">6단계로 돌아가 평가 다시 실행</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
