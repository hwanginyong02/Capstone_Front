import { Info } from "lucide-react";

import { Alert, AlertDescription } from "../ui/alert";
import {
  collectBackendNotices,
  countComputableMetrics,
  type BackendNotices,
} from "../../lib/report/backendNotices";

const SOURCE_LABEL: Record<string, string> = {
  columns: "컬럼 분석",
  mapping: "매핑 확인",
  evaluation: "평가 전처리",
};

interface BackendNoticePanelProps extends BackendNotices {
  /** '계산 가능한 지표 N/M' 표시용(SPEC §6, ISSUES.md A-12). */
  selectedMetricIds?: string[];
  availableMetricIds?: string[] | null;
}

/**
 * 백엔드가 사용자 안내용으로 내려보낸 값들을 한 자리에 모아 보여준다.
 *
 * ISSUES.md B-03·B-04·D-16·A-12 — 세 종류의 안내가 실제로 내려오는데 프론트에
 * 소비처가 **하나도 없었다.** 값을 잘못 만드는 쪽이 아니라 **버리는 쪽**의 결함이다.
 *
 * 결정문대로 **6단계 상단에 합친다** — 안내는 4·5단계에서 도착하지만, 그 화면에서
 * 띄우면 사용자는 이미 다음 단계로 넘어간 뒤라 읽지 못한다.
 */
export function BackendNoticePanel({
  columnNotes,
  mappingWarnings,
  evaluationWarnings,
  selectedMetricIds = [],
  availableMetricIds,
}: BackendNoticePanelProps) {
  const notices = collectBackendNotices({ columnNotes, mappingWarnings, evaluationWarnings });
  const computable = countComputableMetrics(selectedMetricIds, availableMetricIds);

  if (notices.length === 0 && !computable) return null;

  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertDescription className="space-y-2">
        {computable && (
          <p className="text-sm font-medium text-slate-700">
            계산 가능한 지표 {computable.computable}/{computable.selected}
            {computable.computable < computable.selected && (
              <span className="ml-1 font-normal text-slate-500">
                — 매핑된 컬럼으로는 일부 지표를 계산할 수 없습니다.
              </span>
            )}
          </p>
        )}
        {notices.length > 0 && (
          <ul className="list-disc space-y-1 pl-4 text-sm text-slate-600">
            {notices.map((notice) => (
              <li key={`${notice.source}:${notice.message}`}>
                <span className="mr-1 font-medium text-slate-500">
                  [{SOURCE_LABEL[notice.source] ?? notice.source}]
                </span>
                {notice.message}
              </li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
