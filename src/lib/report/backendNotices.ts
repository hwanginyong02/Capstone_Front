/**
 * 백엔드가 '사용자 안내용'으로 내려보내는 값들을 화면이 읽는 한 곳.
 *
 * ISSUES.md B-03 · B-04 · D-16 · A-12 — 백엔드는 세 종류의 안내를 명시적으로
 * 내려보내는데 프론트에 소비처가 **하나도 없었다**(`column_notes`·
 * `available_metric_ids`·`unavailable_metric_ids` grep 0건, evaluate 의
 * `warnings` 도 참조 0건). 값을 잘못 만드는 쪽이 아니라 **버리는 쪽**의 결함이다.
 *
 * 세 안내는 서로 다른 단계에서 도착한다(평가 데이터 단계의 분석 · 매핑 확정 · 평가).
 * 결정문대로 **검증 단계 상단에 합쳐서** 보여준다 — 매핑 단계는 안내가 도착하는 순간 이미
 * 다음 화면으로 넘어가 있다.
 */

/** `/api/analyze-columns` 의 컬럼명 대조 안내. */
export interface ColumnNote {
  llm_column: string;
  matched_column: string | null;
  status: string;
  message: string;
}

/** `/api/confirm-mapping` 의 경고. */
export interface MappingWarning {
  code: string;
  message: string;
}

export interface BackendNotices {
  columnNotes?: ColumnNote[];
  mappingWarnings?: MappingWarning[];
  evaluationWarnings?: string[];
}

export type NoticeSource = "columns" | "mapping" | "evaluation";

export interface BackendNotice {
  source: NoticeSource;
  message: string;
}

/**
 * 세 출처의 안내를 도착 순서(분석 → 매핑 → 평가)대로 하나의 목록으로 합친다.
 * 같은 문구가 여러 출처에서 오면 한 번만 남긴다 — 반복되는 배너는 읽히지 않는다.
 */
export function collectBackendNotices(notices: BackendNotices): BackendNotice[] {
  const collected: BackendNotice[] = [
    ...(notices.columnNotes ?? []).map((n) => ({ source: "columns" as const, message: n.message })),
    ...(notices.mappingWarnings ?? []).map((w) => ({ source: "mapping" as const, message: w.message })),
    ...(notices.evaluationWarnings ?? []).map((message) => ({ source: "evaluation" as const, message })),
  ];

  const seen = new Set<string>();
  return collected.filter((n) => {
    if (!n.message?.trim() || seen.has(n.message)) return false;
    seen.add(n.message);
    return true;
  });
}

/*
 * `countComputableMetrics` 는 제거했다(2026-09-19).
 *
 * "계산 가능한 지표 N/M"(구 SPEC §6 · ISSUES.md A-12)을 만들던 함수다. 전부 계산
 * 가능할 때도 'N/N' 이 떠서 사용자가 읽고 할 일이 없는 문구였다.
 *
 * 지표 선택이 매핑보다 앞이던 때는 매핑 화면이 고른 지표의 필수 역할 누락을 직접 막았다
 * (`resolveMissingRoleCodes` → `getMappingValidityReason`). 이제 매핑이 지표보다 앞이라
 * (docs/MATERIAL_PICKER.md §3) 매핑은 유형 기준 역할만 막는다. 매핑으로 계산할 수 없는 지표는
 * 지표 화면이 비활성으로 두어야 하며(§3), 그 전까지는 성적서에 측정 불가로 찍힌다.
 */
