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
  TASK_TYPE_LABELS,
  type TaskType,
} from "../../data/evaluationData";
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
}

// ── 내부 UI 컴포넌트 ────────────────────────────────────────────────────────

type ValidationGroup = "common" | "multiclass" | "binary" | "multilabel" | "latency";

const GROUP_META: Record<ValidationGroup, { label: string; description: string }> = {
  common:     { label: "Common Checks",     description: "Applied to all task types" },
  multiclass: { label: "Multiclass Checks", description: "Applied when task type is Multiclass" },
  binary:     { label: "Binary Checks",     description: "Applied when task type is Binary" },
  multilabel: { label: "Multilabel Checks", description: "Applied when task type is Multilabel" },
  latency:    { label: "Latency Checks",    description: "Applied when a latency column is present" },
};

const GROUP_ORDER: ValidationGroup[] = ["common", "multiclass", "binary", "multilabel", "latency"];

function getStatusBadge(status: string) {
  if (status === "error") return <Badge variant="destructive">Error</Badge>;
  if (status === "warning") return <Badge variant="outline">Warning</Badge>;
  return <Badge variant="secondary">Pass</Badge>;
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
          {errorCount > 0 && <GroupStatBadge count={errorCount} label="Errors" variant="error" />}
          {warningCount > 0 && <GroupStatBadge count={warningCount} label="Warnings" variant="warning" />}
          <GroupStatBadge count={passCount} label="Passed" variant="pass" />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/10">
            <TableHead className="w-[280px]">Check</TableHead>
            <TableHead className="w-[180px]">Result</TableHead>
            <TableHead>Handling</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={`${item.name}-${idx}`}>
              <TableCell className="align-top whitespace-normal font-medium">{item.name}</TableCell>
              <TableCell className="align-top whitespace-normal">{item.result}</TableCell>
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
}: DataValidationProps) {

  // 로딩 상태
  if (isLoading) {
    return (
      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pb-24 pt-12">
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validating your data…</p>
          <p className="text-xs text-muted-foreground">Checking the file you uploaded.</p>
        </div>
      </main>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pb-24 pt-12">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Data validation</h1>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Data validation failed: {error}
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
          <h1 className="mb-2 text-2xl font-bold text-foreground">Data validation</h1>
          <p className="text-sm text-muted-foreground">Validation results could not be loaded.</p>
        </div>
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
        <h1 className="mb-2 text-2xl font-bold text-foreground">Data validation</h1>
        <p className="text-sm text-muted-foreground">
          Review the backend validation result before running the evaluation.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{TASK_TYPE_LABELS[task_type as TaskType] || task_type}</Badge>
        {selected_metric_ids.map((id) => (
          <Badge key={id} variant="outline">{id}</Badge>
        ))}
      </div>

      {hasBlockingError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Validation errors were found. Review the details below before continuing.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            All validation checks passed. You can proceed to run the evaluation.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Execution Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[220px]">Item</TableHead>
                  <TableHead className="w-[180px]">Value</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {execution_summary.map((item) => (
                  <TableRow key={item.label}>
                    <TableCell className="align-top whitespace-normal font-semibold">{item.label}</TableCell>
                    <TableCell className="align-top whitespace-normal">{item.value}</TableCell>
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
            <CardTitle className="text-lg font-semibold">Validation Details</CardTitle>
            <div className="flex items-center gap-4">
              {error_count > 0 && <GroupStatBadge count={error_count} label="Errors" variant="error" />}
              {warning_count > 0 && <GroupStatBadge count={warning_count} label="Warnings" variant="warning" />}
              <GroupStatBadge count={passCount} label="Passed" variant="pass" />
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
