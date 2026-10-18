import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, Search, TriangleAlert } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { ComposerFieldInput } from "../composer-input/ComposerFieldInput";
import { getCardFields } from "../../data/reportComposer";
import { cn } from "../../utils/styling/styles";
import type { ComposerFieldValue, ComposerValueMap } from "../../types/reportComposer.types";
import type { FieldIssue } from "../../utils/domain/composerFieldGate";
import type { MaterialCheckLine } from "../../types/finalReport.types";
import {
  getAvailableMetrics,
  getMetricDisplayId,
  getRecommendedMetricIds,
  getRequiredColumnsForMetric,
  getRequiredColumnsForTaskType,
  TASK_TYPE_LABELS_KO,
  type RequiredColumnCode,
  type TaskType,
} from "../../data/evaluationData";

interface TestItemsProps {
  taskType?: TaskType | "";
  /**
   * 고른 지표. 스토어의 값을 그대로 받는다 — 화면이 따로 들고 처음 그릴 때 비우던 종전 방식은
   * 검증에서 돌아올 때마다 고른 지표를 지웠다. 넘기지 않으면 화면 안에서만 든다(테스트).
   */
  selectedMetricIds?: string[];
  onSelectedMetricsChange?: (ids: string[]) => void;
  /**
   * F-beta(M5)의 β. **평가 입력이다** — `/api/evaluate` 페이로드에 실린다.
   * 종전에는 지표 상세(구 3단계)에서 받았는데, 그 화면의 나머지(목표값)는 성적서
   * 전용이라 뒤로 갔다. β 만 평가에 필요해 여기 남는다.
   */
  beta?: string;
  onBetaChange?: (value: string) => void;
  /** 빈 필수 칸(지표 선택 이유)을 빨갛게 칠할지. 페이지가 다음을 누른 뒤에 켠다. */
  showErrors?: boolean;
  /**
   * ② 지표와 합격 기준 카드 중 레지스트리로 그리는 필드의 값(멀티레이블의 지표 선택 이유).
   * 값과 setter 를 함께 넘겨야 그려진다. ⑤ 평가 관점은 바로 앞 단계가 받는다.
   */
  metricCardValues?: ComposerValueMap;
  onMetricCardChange?: (fieldId: string, next: ComposerFieldValue) => void;
  metricCardIssues?: FieldIssue[];
  /** 지표 격자와 선택 이유 아래에 붙일 합격 기준 표(`PassCriteriaCard`). */
  passCriteria?: ReactNode;
  /**
   * 지금 매핑으로 계산할 수 없는 지표와 그 이유 한 줄(`unavailableMetricReasons`). 이 지표는
   * 고를 수 없고, 추천·전체 선택도 건너뛴다(docs/MATERIAL_PICKER.md §3). 넘기지 않으면 모두
   * 고를 수 있다.
   */
  unavailableReasons?: Record<string, string>;
  /** 제목 아래에 붙일 안내(들어올 때 선택에서 뺀 지표 알림). */
  notice?: ReactNode;
  /**
   * "추천 지표"가 고를 지표. 평가 관점의 답과 불균형 비율을 반영한 세트다(`recommendedMetricIdsFor`).
   * 넘기지 않으면 유형별 기본 세트.
   */
  recommendedMetricIds?: string[];
  /**
   * 목적별 점검 미리보기 — 지금 고른 지표로 본 재료 선택 점검 3층 줄(적용되는 줄만). 판정은 하지 않고
   * 결과를 읽기만 한다. 넘기지 않거나 비어 있으면 그리지 않는다.
   */
  purposeLines?: MaterialCheckLine[];
}

export function TestItems({
  taskType,
  selectedMetricIds,
  onSelectedMetricsChange,
  beta = "1.0",
  onBetaChange,
  showErrors = false,
  metricCardValues,
  onMetricCardChange,
  metricCardIssues = [],
  passCriteria,
  unavailableReasons = {},
  notice,
  recommendedMetricIds,
  purposeLines = [],
}: TestItemsProps) {
  const availableMetrics = useMemo(() => getAvailableMetrics(taskType), [taskType]);
  const resolvedTaskType = taskType || "";
  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const selectedMetrics = selectedMetricIds ?? localSelected;
  const setSelected = (next: string[]) => {
    setLocalSelected(next);
    onSelectedMetricsChange?.(next);
  };
  const [metricQuery, setMetricQuery] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<RequiredColumnCode[]>([]);

  const visibleColumns = useMemo(
    () => (resolvedTaskType ? getRequiredColumnsForTaskType(resolvedTaskType) : []),
    [resolvedTaskType],
  );

  const filteredMetrics = useMemo(() => {
    const query = metricQuery.trim().toLowerCase();
    const selectedColumnSet = new Set(selectedColumns);

    if (!resolvedTaskType) {
      return availableMetrics;
    }

    return availableMetrics.filter((metric) => {
      const requiredColumns = getRequiredColumnsForMetric(resolvedTaskType, metric.id);
      const matchesSelectedColumns =
        selectedColumnSet.size === 0 ||
        [...selectedColumnSet].every((columnCode) =>
          requiredColumns.some((column) => column.code === columnCode),
        );
      const searchableText = [
        metric.id,
        getMetricDisplayId(metric.id),
        metric.name,
        metric.subtitle,
        metric.description,
        ...requiredColumns.flatMap((column) => [column.code, column.label, column.description]),
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !query || searchableText.includes(query);

      return matchesSelectedColumns && matchesQuery;
    });
  }, [availableMetrics, metricQuery, resolvedTaskType, selectedColumns]);

  // 유형이 바뀌면 검색과 컬럼 거르기만 비운다. 고른 지표는 스토어가 비운다(`setTaskType`) —
  // 여기서 비우면 화면을 다시 열 때마다 고른 지표가 지워졌다.
  useEffect(() => {
    setMetricQuery("");
    setSelectedColumns([]);
  }, [taskType]);

  const isUnavailable = (metricId: string) => metricId in unavailableReasons;

  const handleToggleMetric = (metricId: string) => {
    // 계산할 수 없는 지표는 고를 수 없다. 이미 골라져 있으면 빼는 것만 된다.
    if (isUnavailable(metricId) && !selectedMetrics.includes(metricId)) return;
    setSelected(
      selectedMetrics.includes(metricId)
        ? selectedMetrics.filter((id) => id !== metricId)
        : [...selectedMetrics, metricId],
    );
  };

  const handleRecommended = () =>
    setSelected((recommendedMetricIds ?? getRecommendedMetricIds(taskType)).filter((id) => !isUnavailable(id)));

  /** 목적별 점검 줄의 "추가" — 계산할 수 있는 추천 지표만 넣는다. */
  const handleAddMetrics = (ids: string[]) =>
    setSelected([...selectedMetrics, ...ids.filter((id) => !isUnavailable(id) && !selectedMetrics.includes(id))]);
  const metricLabel = (id: string) => availableMetrics.find((metric) => metric.id === id)?.name ?? id;

  const handleSelectAll = () =>
    setSelected(availableMetrics.map((m) => m.id).filter((id) => !isUnavailable(id)));

  const handleClear = () => setSelected([]);

  // ② 카드에서 이 화면이 받는 필드. 지금은 멀티레이블의 지표 선택 이유 하나뿐이다.
  const metricCardFields = resolvedTaskType
    ? getCardFields("metrics", resolvedTaskType).filter((field) => field.step === "metrics")
    : [];

  const handleToggleColumn = (columnCode: RequiredColumnCode) => {
    setSelectedColumns((prev) =>
      prev.includes(columnCode) ? prev.filter((code) => code !== columnCode) : [...prev, columnCode],
    );
  };

  const handleClearColumns = () => {
    setSelectedColumns([]);
  };

  return (
    <>
      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">지표와 합격 기준</h1>
          <p className="text-sm text-muted-foreground">
            성적서에 넣을 지표를 고르고, 지표마다 넘어야 할 목표값을 정하세요.
          </p>
        </div>

        {notice}

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold">{selectedMetrics.length}</span>개 선택
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRecommended} disabled={!taskType}>
              추천 지표
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={!taskType}>
              전체 선택
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              선택 해제
            </Button>
          </div>
        </div>

        {purposeLines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">목적별 점검</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                평가 관점에서 답한 내용에 맞는 지표가 있는지 봅니다. 맞지 않아도 진행할 수 있지만, 성적서
                1.4에 부족한 점으로 적힙니다.
              </p>
              <ul aria-label="목적별 점검" className="flex flex-col">
                {purposeLines.map((line) => {
                  const addable = line.recommended.filter((id) => !isUnavailable(id));
                  return (
                    <li
                      key={line.id}
                      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border py-3 first:border-t-0"
                    >
                      <span className="flex items-center gap-2">
                        {line.met ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="맞음" />
                        ) : (
                          <TriangleAlert className="h-4 w-4 shrink-0 text-warning" aria-label="맞지 않음" />
                        )}
                        <span className="text-foreground">
                          {line.title} <span className="text-muted-foreground">({line.declared})</span>
                        </span>
                      </span>
                      {!line.met &&
                        (line.recommended.length === 0 ? (
                          <span className="text-muted-foreground">컬럼 매핑에서 응답시간(latency) 컬럼을 지정해야 채워집니다.</span>
                        ) : addable.length > 0 ? (
                          <Button variant="outline" size="sm" onClick={() => handleAddMetrics(addable)}>
                            추가: {addable.map(metricLabel).join(", ")}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">
                            추천 지표({line.recommended.map(metricLabel).join(", ")})는 지금 매핑으로 계산할 수 없습니다.
                          </span>
                        ))}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        <div>
          <span className="text-sm text-muted-foreground">분류 유형: </span>
          <Badge variant="secondary">{taskType ? TASK_TYPE_LABELS_KO[taskType] : "정하지 않음"}</Badge>
        </div>

        {/* β 는 M5 를 골랐을 때만 물어본다. 목표값과 달리 **평가에 쓰이는 값**이라
            성적서 구간으로 미룰 수 없다 — F-beta 의 정의 자체가 β 로 정해진다. */}
        {selectedMetrics.includes("M5") && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">F-beta 가중치 (β)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                className="max-w-[200px] font-mono tabular-nums"
                inputMode="decimal"
                value={beta}
                onChange={(event) => onBetaChange?.(event.target.value)}
                aria-label="β"
              />
              <p className="text-xs text-muted-foreground">
                β &gt; 1 이면 재현율을, β &lt; 1 이면 정밀도를 더 무겁게 봅니다. β = 1 은 F1 과 같습니다.
              </p>
              {(() => {
                const parsed = Number(beta);
                const invalid = beta.trim() === "" || !Number.isFinite(parsed) || parsed <= 0;
                return invalid ? (
                  <p className="text-xs text-destructive">β는 0보다 큰 숫자여야 합니다.</p>
                ) : null;
              })()}
            </CardContent>
          </Card>
        )}

        {taskType && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">쓸 수 있는 컬럼</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  고른 분류 유형에서 지표 계산에 쓸 수 있는 컬럼입니다.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleColumns.map((column) => (
                  <div key={column.code} className="min-h-[118px] rounded-lg border border-border bg-muted/20 p-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {column.code}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground">{column.label}</span>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">{column.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {taskType && (
          <Card>
            <CardContent className="flex flex-col gap-4 py-4 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full max-w-xs shrink-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={metricQuery}
                    onChange={(event) => setMetricQuery(event.target.value)}
                    placeholder="지표 검색"
                    className="pl-9"
                  />
                </div>

                <div className="flex min-w-0 flex-nowrap items-center gap-2">
                  {visibleColumns.map((column) => (
                    <label
                      key={column.code}
                      className={cn(
                        "flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors",
                        selectedColumns.includes(column.code)
                          ? "border-primary bg-primary-subtle text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
                      )}
                    >
                      <Checkbox
                        checked={selectedColumns.includes(column.code)}
                        onCheckedChange={() => handleToggleColumn(column.code)}
                      />
                      <span className="font-mono text-xs">{column.code}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">맞는 지표 {filteredMetrics.length}개</Badge>
                <Button variant="outline" size="sm" onClick={handleClearColumns} disabled={selectedColumns.length === 0}>
                  컬럼 선택 해제
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!taskType ? (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              지표를 고르기 전에 분류 유형을 정하세요.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredMetrics.map((metric) => {
              const isSelected = selectedMetrics.includes(metric.id);
              const requiredColumns = getRequiredColumnsForMetric(taskType, metric.id);
              const reason = unavailableReasons[metric.id];
              const disabled = Boolean(reason) && !isSelected;
              const reasonId = `metric-${metric.id}-reason`;

              return (
                <label
                  key={metric.id}
                  aria-disabled={disabled || undefined}
                  className={cn(
                    "relative flex flex-col p-5 rounded-lg border-2 transition-colors min-h-[180px]",
                    disabled
                      ? "cursor-not-allowed border-border bg-muted"
                      : isSelected
                        ? "cursor-pointer border-primary bg-primary-subtle"
                        : "cursor-pointer border-border bg-card hover:border-border-strong",
                  )}
                >
                  <div className="flex items-start gap-2 mb-3">
                    <Checkbox
                      checked={isSelected}
                      disabled={disabled}
                      onCheckedChange={() => handleToggleMetric(metric.id)}
                      aria-label={metric.name}
                      aria-describedby={reason ? reasonId : undefined}
                      className="mt-0.5"
                    />
                    <div className="ml-auto flex flex-wrap justify-end gap-1">
                      {requiredColumns.map((column) => (
                        <Badge key={column.code} variant="outline" className="font-mono text-[10px] leading-4">
                          {column.code}
                        </Badge>
                      ))}
                      {metric.additionalFields?.includes("beta") && (
                        <Badge variant="outline" className="text-xs">
                          beta
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="font-mono text-xs uppercase font-medium text-muted-foreground">
                      {getMetricDisplayId(metric.id)}
                    </div>
                    <h3 className={cn("text-base font-semibold leading-tight", disabled && "text-muted-foreground")}>
                      {metric.name}
                    </h3>
                    {reason && (
                      <p id={reasonId} className="text-sm text-muted-foreground">
                        {reason}
                      </p>
                    )}
                    <div className={cn("text-sm", disabled ? "text-muted-foreground" : "text-foreground")}>
                      {metric.subtitle}
                    </div>
                    <p className="text-xs text-muted-foreground leading-[1.5]">{metric.description}</p>
                  </div>
                </label>
              );
            })}
            {filteredMetrics.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                  <CardContent className="py-10 text-sm text-muted-foreground">
                  고른 컬럼 조합을 쓰는 지표가 없습니다.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 고른 지표 바로 아래에서 고른 이유를 묻는다. 재료 선택 점검 2층이라 빈 칸은 막지 않고 알리기만
            한다(빨갛게 칠하지 않는다). */}
        {onMetricCardChange && metricCardFields.length > 0 && (
          <Card className="gap-0 rounded-lg border-border bg-card">
            <CardContent className="space-y-5 p-6">
              {metricCardFields.map((field) => {
                const issue = metricCardIssues.find((item) => item.fieldId === field.id);
                const missing = issue?.reason === "missing";
                return (
                  <div key={field.id}>
                    <ComposerFieldInput
                      field={field}
                      value={metricCardValues?.[field.id]}
                      onChange={(next) => onMetricCardChange(field.id, next)}
                      siblingValues={metricCardValues}
                      invalid={showErrors && Boolean(issue) && !missing}
                    />
                    {missing && (
                      <p className="mt-1 text-body-small text-muted-foreground">
                        비어 있으면 성적서에 "제공되지 않음"으로 표시됩니다. 진행은 막지 않습니다.
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {passCriteria}

        {selectedMetrics.includes("M5") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">F-beta 안내</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex gap-3 p-4 bg-primary-subtle rounded-lg border border-primary/30">
                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p>M5 를 고르면 위의 β 값이 필요합니다.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">고르는 규칙</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>M5 (F-beta Score)는 β 값이 필요합니다.</div>
            <div>이진 분류의 일부 지표는 양성 클래스도 정해야 합니다.</div>
            <div>매핑한 컬럼으로 계산할 수 없는 지표는 고를 수 없습니다. 이유는 지표 이름 아래에 적혀 있습니다.</div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
