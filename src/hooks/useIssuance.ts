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
import { saveRun, useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { ISSUE_CONTENT_MAX_BYTES, exceedsIssueLimit, jsonBytes } from "../utils/image/examplePreview";
import { applyIssuance, issueReport, reissueReport } from "../lib/report/issuanceApi";

export interface UseIssuanceResult {
  /** 발급 반영본(있으면) 또는 원본 리포트 데이터 */
  data: FinalReportData | null;
  /** 발급 완료 여부(meta.reportId 존재) */
  issued: boolean;
  /** 발급 버튼 노출 가능 여부(미리보기 제외 + 데이터 존재) */
  canIssue: boolean;
  /** 발급/재발급 호출 진행 중 */
  busy: boolean;
  /** 발급. `note` 는 발급 비고 — 비우면 서버가 '최초 발급'으로 적는다. */
  issue: (note?: string) => Promise<void>;
  reissue: (note: string) => Promise<void>;
}

export function useIssuance(
  id: string,
  reportData: FinalReportData | null,
  /** 서술까지 끝났는가(성적서 훅의 서술 상태 done). 아니면 발급·정정 발급 모두 잠근다(서술 라운드 S3b). */
  narrativeDone = true,
): UseIssuanceResult {
  const [override, setOverride] = useState<FinalReportData | null>(null);
  const [busy, setBusy] = useState(false);

  // override 는 이번 세션에서 방금 발급한 결과. 없으면 훅 입력(스토어/평가 결과)을 사용.
  const data = override ?? reportData;
  const issued = !!data?.meta.reportId;
  // 발급은 "평가가 완료된(isEvaluated)" 리포트에만 허용 — 재로드 후 미평가 draft(빈 결과)에
  // 번호가 발급되는 것을 막는다(useReportData 는 미평가 run 도 data 로 세팅할 수 있음).
  // 끝나지 않은 서술은 완성본이 아니다 — 서술이 done 이고 완성본(isEvaluated)일 때만.
  const complete = narrativeDone && !!data?.isEvaluated;
  const canIssue = !!id && !!data && complete;

  function persist(merged: FinalReportData) {
    setOverride(merged);
    if (!id) return;
    // run.reportData / run.reportId 갱신. 서버 발급은 이미 끝났으므로 저장 실패는 '발급 실패'가 아니라 저장 실패로 알린다.
    const err = saveRun(id, (r) => ({ ...r, reportId: merged.meta.reportId, reportData: merged }));
    if (err) alert(`발급은 완료됐지만 ${err}`);
  }

  /** 서버 상한(1 MiB)을 넘으면 서버의 422 대신 이유와 고칠 곳을 알린다(예전에 원본으로 올린 예시 이미지 대비). */
  function tooLargeToIssue(content: FinalReportData): boolean {
    if (!exceedsIssueLimit(content)) return false;
    const bytes = jsonBytes(content);
    alert(
      `성적서 데이터가 발급 용량 한도를 넘습니다(${Math.round(bytes / 1024).toLocaleString()} KB / ` +
        `${ISSUE_CONTENT_MAX_BYTES / 1024} KB). 대개 학습 데이터 예시 이미지 때문입니다. ` +
        "학습 데이터 화면에서 예시 이미지를 지우고 다시 올리면 인쇄용 크기로 줄어듭니다.",
    );
    return true;
  }

  async function issue(note?: string) {
    // 버튼만 잠그면 버튼 밖에서 부르는 경로가 새므로 여기서도 막는다(서술 라운드 S3b).
    if (!data || busy || !id || !canIssue) return;
    if (tooLargeToIssue(data)) return;
    const run = useWorkspaceStore
      .getState()
      .evaluationRuns.find((r) => r.id === id);
    setBusy(true);
    try {
      const result = await issueReport({
        runId: id,
        modelName: run?.modelName,
        modelVersion: run?.versionName,
        // 비고는 선택이다. 비거나 공백뿐이면 보내지 않아 서버 기본값('최초 발급')을 쓴다.
        note: note?.trim() || undefined,
        // 발급 시점의 성적서 원본을 서버에 보관한다 — 이것이 없으면 번호로 문서를
        // 복원할 수도, 인쇄물의 진위를 대조할 수도 없다(F-01).
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
    if (!data || busy || !issued || !complete) return;
    if (tooLargeToIssue(data)) return;
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
