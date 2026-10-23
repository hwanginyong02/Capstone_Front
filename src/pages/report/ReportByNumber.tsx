/**
 * /report/no/:reportNo — 성적서 번호로 서버에 보관된 원본을 복원해 보여준다.
 *
 * ISSUES.md F-04 — 종전에는 성적서의 실체가 브라우저 localStorage 에만 있었다.
 * 저장소를 지우거나 다른 기기에서 접속하면 발급된 문서가 **영구히 사라졌고**,
 * 번호를 알아도 되살릴 방법이 없었다. 의뢰자·심사기관이 번호로 문서를 조회하는
 * 정상적인 검증 절차가 성립하지 않았다.
 *
 * 이 화면은 읽기 전용이다 — 발급·정정은 원본 run 을 가진 워크스페이스에서만 한다.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { ReportSections } from "../../components/report/ReportSections";
import { NarrativeRecordPanel } from "../../components/report/NarrativeRecordPanel";
import { ReportLoadingState } from "../../components/report/ReportLoadingState";
import {
  applyIssuance,
  formatKstDateTime,
  getIssuance,
  getReportContent,
} from "../../lib/report/issuanceApi";
import { normalizeReportContent } from "../../lib/report/normalizeReportContent";
import type { FinalReportData } from "../../types/finalReport.types";

/**
 * 보관본에 발급 기록을 덧입힌다. 발급 때 보낸 원본은 번호를 받기 전 데이터라 문서 번호·발급 일시·
 * 서명이 비어 있어, 그대로 그리면 표지에 "(미발급)", 서명란에 "초안 — 미발급"이 찍혔다. 재발급
 * 보관본은 한 차수 전의 발급 정보를 담고 있었다. 그리는 데이터만 바꾸고 보관본·검증 코드는 그대로다.
 * 발급 기록을 못 받으면 적어도 번호와 이 차수의 발급 일시는 채운다.
 */
function withIssuance(
  content: FinalReportData,
  reportNo: string,
  issuedAt: string,
  issuance: Awaited<ReturnType<typeof getIssuance>>,
): FinalReportData {
  if (issuance) return applyIssuance(content, issuance);
  return {
    ...content,
    meta: {
      ...content.meta,
      reportId: content.meta.reportId || reportNo,
      issuedAt: issuedAt ? formatKstDateTime(issuedAt) : content.meta.issuedAt,
    },
  };
}

type State =
  | { kind: "loading" }
  | { kind: "found"; data: FinalReportData; version: string; issuedAt: string; hash: string }
  | { kind: "missing" };

export function ReportByNumber() {
  const { reportNo = "" } = useParams();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    setState({ kind: "loading" });

    Promise.all([getReportContent(reportNo), getIssuance(reportNo)]).then(([result, issuance]) => {
      if (!active) return;
      if (!result || !result.content) {
        setState({ kind: "missing" });
        return;
      }
      // 옛 판의 보관본은 지금 뜻으로 옮겨 읽는다(보관본 자체는 그대로).
      const content = normalizeReportContent(result.content as FinalReportData);
      setState({
        kind: "found",
        data: withIssuance(content, reportNo, result.issuedAt, issuance),
        version: result.version,
        issuedAt: result.issuedAt,
        hash: result.contentHash,
      });
    });

    return () => {
      active = false;
    };
  }, [reportNo]);

  if (state.kind === "loading") return <ReportLoadingState />;

  if (state.kind === "missing") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-lg font-semibold text-foreground">
          성적서를 찾을 수 없습니다
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">
          <span className="font-mono">{reportNo}</span> 번호로 서버에 보관된 성적서가 없습니다.
          번호를 다시 확인해 주세요.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          성적서 내용 보관은 2026-09-05 발급분부터 적용됩니다. 그 이전에 발급된 문서는
          서버에 사본이 없어 발급 당시 사용한 브라우저에서만 열 수 있습니다.
        </p>
        <Link
          to="/workspaces"
          className="mt-6 inline-block rounded border border-border-strong px-4 py-2 text-sm text-foreground-secondary hover:bg-muted"
        >
          워크스페이스로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-10">
      <div className="mb-6 rounded border border-border bg-muted px-4 py-3 text-xs text-foreground-secondary">
        <p>
          <span className="font-semibold text-foreground-secondary">서버 보관본</span> · 발급 차수{" "}
          {state.version} · 발급 일시 {formatKstDateTime(state.issuedAt)} (KST)
        </p>
        <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
          문서 검증 코드 {state.hash}
        </p>
        <p className="mt-1 text-muted-foreground">
          발급 시점에 서버가 보관한 원본입니다. 이 화면에서는 발급·정정을 할 수 없습니다.
        </p>
      </div>
      {/* 작성 기록(판 3) — 머리 상자와 같이 화면에만. 본문(ReportSections)에는 없다(사용자 결정 4). */}
      <NarrativeRecordPanel data={state.data} />
      <ReportSections data={state.data} />
    </div>
  );
}
