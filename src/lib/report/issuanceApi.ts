/**
 * issuanceApi — 성적서 발급/채번 백엔드(P2-11) 호출.
 *
 * 백엔드 응답(snake_case) → 프론트(camelCase) 매핑. fetchNarrative 와 동일하게 상대경로 fetch 사용.
 * - getOrganization/getIssuance: 조회 실패 시 null(graceful).
 * - issueReport/reissueReport: 실패 시 백엔드 detail 을 담아 throw(호출부가 사용자 오류로 표시).
 *
 * 시각(issued_at)은 백엔드가 offset 포함 ISO8601('...+00:00')로 준다.
 * 여기서 KST 표시 문자열로 변환해, 리포트의 기존 로컬 날짜 표기 규약과 일치시킨다(단일 출처=백엔드).
 */
import { apiUrl } from "@/lib/apiBase";

export interface OrganizationInfo {
  orgName: string;
  department: string | null;
  evaluator: string | null;
  contact: string | null;
  address: string | null;
}

export interface IssuanceHistoryEntry {
  version: string;
  /** offset 포함 ISO8601 (백엔드 원본) */
  issuedAt: string;
  note: string | null;
}

export interface IssuanceResult {
  reportNo: string;
  version: string;
  issuer: string;
  /** offset 포함 ISO8601 (백엔드 원본) */
  issuedAt: string;
  organization: OrganizationInfo;
  history: IssuanceHistoryEntry[];
}

export interface IssuePayload {
  runId: string;
  modelName?: string;
  modelVersion?: string;
  note?: string;
  issuer?: string;
  /**
   * 발급 시점의 성적서 원본(FinalReportData). 서버가 그대로 보관해 번호로 복원하고
   * 인쇄물 진위를 대조할 수 있게 한다(ISSUES.md F-01). 상한 1 MiB.
   */
  content?: unknown;
}

export interface ReissueOptions {
  /**
   * 발급 시 사용한 run 식별자 — **소지 증명**(ISSUES.md G-02).
   * report_no 는 RPT-{연도}-{순번} 이라 전수 열거가 가능하지만 run_id 는
   * crypto.randomUUID 라 추측할 수 없다. 백엔드가 불일치 시 403 을 낸다.
   */
  runId: string;
  /** 정정된 성적서 원본. 이전 차수 스냅샷은 서버가 보존한다. */
  content?: unknown;
  issuer?: string;
}

// ── KST 표시 포맷터 ────────────────────────────────────────────────────────────
// 백엔드 offset ISO → Asia/Seoul 기준 문자열. 파싱 실패 시 원본을 그대로 돌려준다.

/** "2026-07-04T08:10:52+00:00" → "2026-07-04" (KST) */
export function formatKstDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // en-CA 로케일은 YYYY-MM-DD 형식을 보장한다.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** "2026-07-04T08:10:52+00:00" → "2026-07-04 17:10" (KST) */
export function formatKstDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${formatKstDate(iso)} ${time}`;
}

// ── 매핑 ───────────────────────────────────────────────────────────────────────

function mapOrganization(o: any): OrganizationInfo {
  return {
    orgName: String(o?.org_name ?? ""),
    department: o?.department ?? null,
    evaluator: o?.evaluator ?? null,
    contact: o?.contact ?? null,
    address: o?.address ?? null,
  };
}

function mapIssuance(j: any): IssuanceResult {
  return {
    reportNo: String(j?.report_no ?? ""),
    version: String(j?.version ?? ""),
    issuer: String(j?.issuer ?? ""),
    issuedAt: String(j?.issued_at ?? ""),
    organization: mapOrganization(j?.organization),
    history: Array.isArray(j?.history)
      ? j.history.map((h: any) => ({
          version: String(h?.version ?? ""),
          issuedAt: String(h?.issued_at ?? ""),
          note: h?.note ?? null,
        }))
      : [],
  };
}

async function errorDetail(resp: Response, fallback: string): Promise<string> {
  try {
    const body = await resp.json();
    if (body && typeof body.detail === "string") return body.detail;
  } catch {
    /* JSON 아님 — fallback 사용 */
  }
  return fallback;
}

// ── API ────────────────────────────────────────────────────────────────────────

/** 수행기관(performer) 조회. 실패/미시드 시 null. */
export async function getOrganization(): Promise<OrganizationInfo | null> {
  try {
    const resp = await fetch(apiUrl("/api/organization"));
    if (!resp.ok) return null;
    return mapOrganization(await resp.json());
  } catch {
    return null;
  }
}

/** 발급정보 조회(재오픈). 미발급/실패 시 null. */
export async function getIssuance(reportNo: string): Promise<IssuanceResult | null> {
  try {
    const resp = await fetch(apiUrl(`/api/reports/${encodeURIComponent(reportNo)}`));
    if (!resp.ok) return null;
    return mapIssuance(await resp.json());
  } catch {
    return null;
  }
}

/** 발급(채번). 같은 runId 재호출 시 기존 발급본을 그대로 돌려받는다(멱등). */
export async function issueReport(payload: IssuePayload): Promise<IssuanceResult> {
  const resp = await fetch(apiUrl("/api/reports/issue"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      run_id: payload.runId,
      model_name: payload.modelName ?? null,
      model_version: payload.modelVersion ?? null,
      note: payload.note ?? null,
      issuer: payload.issuer ?? null,
      content: payload.content ?? null,
    }),
  });
  if (!resp.ok) throw new Error(await errorDetail(resp, "발급에 실패했습니다."));
  return mapIssuance(await resp.json());
}

/** 재발급(정정). 같은 번호 유지 + 버전 차수 증가. */
export async function reissueReport(
  reportNo: string,
  note: string,
  options: ReissueOptions,
): Promise<IssuanceResult> {
  const resp = await fetch(apiUrl(`/api/reports/${encodeURIComponent(reportNo)}/reissue`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      run_id: options.runId,
      note,
      issuer: options.issuer ?? null,
      content: options.content ?? null,
    }),
  });
  if (!resp.ok) throw new Error(await errorDetail(resp, "재발급에 실패했습니다."));
  return mapIssuance(await resp.json());
}
