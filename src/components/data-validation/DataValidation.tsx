import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  TASK_TYPE_LABELS_KO,
  type TaskType,
} from "../../data/evaluationData";
import { checkNameKo, summaryItemKo, validationResultText } from "../../lib/report/mapValidationResultToReport";
import type {
  ValidationDetailItem as ValidationCheckItem,
  ValidateDataResponseData,
} from "../../types/validation.types";

// ── 백엔드 응답 타입은 types/validation.types.ts 단일 진실에서 가져온다 ──────
export type { ValidateDataResponseData };

// ── 컴포넌트 Props ──────────────────────────────────────────────────────────

interface DataValidationProps {
  /** 백엔드 /api/validate-data 응답 데이터 */
  validationData: ValidateDataResponseData | null;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 메시지 (있으면 에러 화면 표시) */
  error?: string | null;
  /**
   * 제목 바로 아래에 놓는 안내(입력 누락·재업로드·백엔드 안내·생성 전 안내). 페이지가 조립해 넘긴다.
   * 본문 칸(`max-w`·좌우 여백) 안에 있어야 제목과 줄이 맞는다 — 종전에는 페이지가 이것들을 셸에
   * 바로 넣어 화면 왼쪽 끝에 붙고 제목보다 위에 떴다.
   */
  notices?: ReactNode;
}

// ── 내부 UI 컴포넌트 ────────────────────────────────────────────────────────

type ValidationGroup = "common" | "multiclass" | "binary" | "multilabel" | "latency";

const GROUP_META: Record<ValidationGroup, { label: string; description: string }> = {
  common:     { label: "공통 검사",          description: "모든 분류 유형에 적용" },
  // 유형 이름은 성적서 6.0(DataValidationSection)과 같은 한국어 표(W9) — 종전에는 '다중 클래스'로 짧았다.
  multiclass: { label: `${TASK_TYPE_LABELS_KO.multiclass} 검사`, description: `분류 유형이 ${TASK_TYPE_LABELS_KO.multiclass}일 때 적용` },
  binary:     { label: `${TASK_TYPE_LABELS_KO.binary} 검사`,     description: `분류 유형이 ${TASK_TYPE_LABELS_KO.binary}일 때 적용` },
  multilabel: { label: `${TASK_TYPE_LABELS_KO.multilabel} 검사`, description: `분류 유형이 ${TASK_TYPE_LABELS_KO.multilabel}일 때 적용` },
  latency:    { label: "지연시간 검사",      description: "지연시간 컬럼이 있을 때 적용" },
};

const GROUP_ORDER: ValidationGroup[] = ["common", "multiclass", "binary", "multilabel", "latency"];

function getStatusBadge(status: string) {
  if (status === "error") return <Badge variant="destructive">오류</Badge>;
  if (status === "warning") return <Badge variant="outline">경고</Badge>;
  return <Badge variant="secondary">통과</Badge>;
}

function GroupStatBadge({ count, label, variant }: { count: number; label: string; variant: "error" | "warning" | "pass" }) {
  const colorClass =
    variant === "error"   ? "text-destructive" :
    variant === "warning" ? "text-warning" :
                            "text-muted-foreground";
  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {count} {label}
    </span>
  );
}

function ValidationGroupSection({ items, group }: { items: ValidationCheckItem[]; group: ValidationGroup }) {
  const meta = GROUP_META[group];
  const errorCount = items.filter((i) => i.status === "error").length;
  const warningCount = items.filter((i) => i.status === "warning").length;
  const passCount = items.filter((i) => i.status === "pass").length;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{meta.label}</p>
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        </div>
        <div className="flex items-center gap-3">
          {errorCount > 0 && <GroupStatBadge count={errorCount} label="오류" variant="error" />}
          {warningCount > 0 && <GroupStatBadge count={warningCount} label="경고" variant="warning" />}
          <GroupStatBadge count={passCount} label="통과" variant="pass" />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/10">
            <TableHead className="w-[280px]">검사</TableHead>
            <TableHead className="w-[180px]">결과</TableHead>
            <TableHead>처리</TableHead>
            <TableHead className="w-[100px]">상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={`${item.name}-${idx}`}>
              <TableCell className="align-top whitespace-normal font-medium">{checkNameKo(item.name)}</TableCell>
              <TableCell className="align-top whitespace-normal">{validationResultText(item)}</TableCell>
              <TableCell className="align-top whitespace-normal text-muted-foreground">{item.handling}</TableCell>
              <TableCell className="align-top">{getStatusBadge(item.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── 메인 컴포넌트 ───────────────────────────────────────────────────────────

export function DataValidation({
  validationData,
  isLoading,
  error,
  notices,
}: DataValidationProps) {

  // 로딩 상태
  if (isLoading) {
    return (
      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pb-24 pt-12">
        <div>{notices}</div>
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">데이터를 검증하는 중…</p>
          <p className="text-xs text-muted-foreground">올린 파일을 확인하고 있습니다.</p>
        </div>
      </main>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pb-24 pt-12">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">데이터 검증</h1>
        </div>
        <div>{notices}</div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            데이터 검증에 실패했습니다: {error}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  // 데이터 없음
  if (!validationData) {
    return (
      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pb-24 pt-12">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">데이터 검증</h1>
          <p className="text-sm text-muted-foreground">검증 결과를 불러오지 못했습니다.</p>
        </div>
        <div>{notices}</div>
      </main>
    );
  }

  // 정상 렌더링
  const { validation_details, error_count, warning_count, task_type, selected_metric_ids, execution_summary } = validationData;
  const passCount = validation_details.filter((i) => i.status === "pass").length;
  const hasBlockingError = error_count > 0;

  const groupedSections = GROUP_ORDER
    .map((group) => ({ group, items: validation_details.filter((i) => i.group === group) }))
    .filter(({ items }) => items.length > 0);

  return (
    <main className="mx-auto max-w-[1344px] space-y-6 px-8 pb-24 pt-12">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">데이터 검증</h1>
        <p className="text-sm text-muted-foreground">
          평가를 실행하기 전에 검증 결과를 확인하세요.
        </p>
      </div>
      {/* 블록 div 로 감싸 안내의 아래 여백(mb-6)이 목록 간격과 겹쳐 접히게 한다. 비어도 간격이 늘지 않는다. */}
      <div>{notices}</div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{TASK_TYPE_LABELS_KO[task_type as TaskType] || task_type}</Badge>
        {selected_metric_ids.map((id) => (
          <Badge key={id} variant="outline">{id}</Badge>
        ))}
      </div>

      {hasBlockingError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            검증 오류가 있습니다. 넘어가기 전에 아래 내용을 확인하세요.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            모든 검증을 통과했습니다. 다음으로 넘어갈 수 있습니다.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">실행 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[220px]">항목</TableHead>
                  <TableHead className="w-[180px]">값</TableHead>
                  <TableHead>비고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {execution_summary.map((item) => (
                  <TableRow key={item.label}>
                    <TableCell className="align-top whitespace-normal font-semibold">{summaryItemKo(item).label}</TableCell>
                    <TableCell className="align-top whitespace-normal">{summaryItemKo(item).value}</TableCell>
                    <TableCell className="align-top whitespace-normal text-muted-foreground">{item.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">검증 상세</CardTitle>
            <div className="flex items-center gap-4">
              {error_count > 0 && <GroupStatBadge count={error_count} label="오류" variant="error" />}
              {warning_count > 0 && <GroupStatBadge count={warning_count} label="경고" variant="warning" />}
              <GroupStatBadge count={passCount} label="통과" variant="pass" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {groupedSections.map(({ group, items }) => (
            <ValidationGroupSection key={group} group={group} items={items} />
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
