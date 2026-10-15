import { Info } from "lucide-react";

import { Alert, AlertDescription } from "../ui/alert";
import { collectBackendNotices, type BackendNotices } from "../../lib/report/backendNotices";

const SOURCE_LABEL: Record<string, string> = {
  columns: "Column analysis",
  mapping: "Mapping",
  evaluation: "Preprocessing",
};

type BackendNoticePanelProps = BackendNotices;

/**
 * 백엔드가 사용자 안내용으로 내려보낸 값들을 한 자리에 모아 보여준다.
 *
 * ISSUES.md B-03·B-04·D-16 — 세 종류의 안내가 실제로 내려오는데 프론트에 소비처가
 * **하나도 없었다.** 값을 잘못 만드는 쪽이 아니라 **버리는 쪽**의 결함이다.
 *
 * 안내는 업로드·매핑 단계에서 도착하지만 **검증 화면 상단에 합쳐서** 보여준다 —
 * 도착한 화면에서 띄우면 사용자는 이미 다음 단계로 넘어간 뒤라 읽지 못한다.
 *
 * '계산 가능한 지표 N/M'(구 A-12)은 제거했다. 사용자가 읽고 할 일이 없는 문구였다.
 */
export function BackendNoticePanel({
  columnNotes,
  mappingWarnings,
  evaluationWarnings,
}: BackendNoticePanelProps) {
  const notices = collectBackendNotices({ columnNotes, mappingWarnings, evaluationWarnings });

  if (notices.length === 0) return null;

  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-4 text-sm text-foreground-secondary">
          {notices.map((notice) => (
            <li key={`${notice.source}:${notice.message}`}>
              <span className="mr-1 font-medium text-muted-foreground">
                [{SOURCE_LABEL[notice.source] ?? notice.source}]
              </span>
              {notice.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
