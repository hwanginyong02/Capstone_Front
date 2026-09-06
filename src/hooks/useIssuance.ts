/**
 * useIssuance — 성적서 발급/재발급 상태 관리 (P2-11 Phase D).
 *
 * useReportData 는 setter 를 노출하지 않으므로, 발급 결과를 반영하기 위해
 * (1) 로컬 override 로 즉시 화면 갱신하고 (2) 워크스페이스 스토어의 run.reportData 에
 * 병합·영속한다(재오픈 시 유지, 인쇄 탭도 스토어에서 읽음).
 *
 * 발급 상태 판별: meta.reportId 가 비어 있으면 초안(미발급), 채워지면 발급됨(설계 §7).
 */
import { useState } from "react";

import type { FinalReportData } from "../types/finalReport.types";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import {
  formatKstDate,
  formatKstDateTime,
  issueReport,
  reissueReport,
  type IssuanceResult,
} from "../lib/report/issuanceApi";

export interface UseIssuanceResult {
  /** 발급 반영본(있으면) 또는 원본 리포트 데이터 */
  data: FinalReportData | null;
  /** 발급 완료 여부(meta.reportId 존재) */
  issued: boolean;
  /** 발급 버튼 노출 가능 여부(미리보기 제외 + 데이터 존재) */
  canIssue: boolean;
  /** 발급/재발급 호출 진행 중 */
  busy: boolean;
  issue: () => Promise<void>;
  reissue: (note: string) => Promise<void>;
}

/** 백엔드 발급 결과(IssuanceResult)를 리포트 데이터에 병합. */
function applyIssuance(report: FinalReportData, r: IssuanceResult): FinalReportData {
  return {
    ...report,
    meta: {
      ...report.meta,
      reportId: r.reportNo,
      issuedAt: formatKstDateTime(r.issuedAt),
    },
    performer: {
      orgName: r.organization.orgName || report.performer.orgName,
      evaluator: r.organization.evaluator ?? report.performer.evaluator,
      contact: r.organization.contact ?? report.performer.contact,
    },
    signature: {
      issuer: r.issuer,
      signedAt: formatKstDate(r.issuedAt),
      history: r.history.map((h) => ({
        version: h.version,
        issuedAt: formatKstDate(h.issuedAt),
        note: h.note ?? "",
      })),
    },
  };
}

export function useIssuance(
  id: string,
  reportData: FinalReportData | null,
): UseIssuanceResult {
  const [override, setOverride] = useState<FinalReportData | null>(null);
  const [busy, setBusy] = useState(false);

  // override 는 이번 세션에서 방금 발급한 결과. 없으면 훅 입력(스토어/평가 결과)을 사용.
  const data = override ?? reportData;
  const issued = !!data?.meta.reportId;
  // 발급은 "평가가 완료된(isEvaluated)" 리포트에만 허용 — 재로드 후 미평가 draft(빈 결과)에
  // 번호가 발급되는 것을 막는다(useReportData 는 미평가 run 도 data 로 세팅할 수 있음).
  const canIssue = id !== "preview" && !!data && !!(data as any).isEvaluated;

  function persist(merged: FinalReportData) {
    setOverride(merged);
    if (id === "preview") return;
    // useReportData 의 영속 패턴과 동일하게 run.reportData / run.reportId 갱신.
    useWorkspaceStore.setState((state) => ({
      evaluationRuns: state.evaluationRuns.map((r) =>
        r.id === id
          ? { ...r, reportId: merged.meta.reportId, reportData: merged }
          : r,
      ),
    }));
  }

  async function issue() {
    if (!data || busy || id === "preview") return;
    const run = useWorkspaceStore
      .getState()
      .evaluationRuns.find((r) => r.id === id);
    setBusy(true);
    try {
      const result = await issueReport({
        runId: id,
        modelName: run?.modelName,
        modelVersion: run?.versionName,
        // 발급 시점의 성적서 원본을 서버에 보관한다 — 이것이 없으면 번호로 문서를
        // 복원할 수도, 인쇄물의 진위를 대조할 수도 없다(ISSUES.md F-01).
        content: data,
      });
      persist(applyIssuance(data, result));
    } catch (e: any) {
      alert(`발급 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function reissue(note: string) {
    if (!data || busy || !issued) return;
    setBusy(true);
    try {
      // run 식별자는 소지 증명으로 필수다(G-02). 라우트의 id 가 발급 때 보낸 runId 와 같다.
      const result = await reissueReport(data.meta.reportId, note, {
        runId: id,
        content: data,
      });
      persist(applyIssuance(data, result));
    } catch (e: any) {
      alert(`재발급 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return { data, issued, canIssue, busy, issue, reissue };
}
