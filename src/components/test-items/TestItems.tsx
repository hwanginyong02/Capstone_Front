import { useEffect, useMemo, useState } from "react";
import { Info, Search } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { cn } from "../../utils/styling/styles";
import {
  getAvailableMetrics,
  getMetricDisplayId,
  getRecommendedMetricIds,
  getRequiredColumnsForMetric,
  getRequiredColumnsForTaskType,
  TASK_TYPE_LABELS,
  type RequiredColumnCode,
  type TaskType,
} from "../../data/evaluationData";

interface TestItemsProps {
  taskType?: TaskType | "";
  onSelectedMetricsChange?: (ids: string[]) => void;
}

export function TestItems({
  taskType,
  onSelectedMetricsChange,
}: TestItemsProps) {
  const availableMetrics = useMemo(() => getAvailableMetrics(taskType), [taskType]);
  const resolvedTaskType = taskType || "";
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
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

  useEffect(() => {
    setSelectedMetrics([]);
    setMetricQuery("");
    setSelectedColumns([]);
    onSelectedMetricsChange?.([]);
  }, [taskType, onSelectedMetricsChange]);

  const handleToggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) => {
      const next = prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId];
      onSelectedMetricsChange?.(next);
      return next;
    });
  };

  const handleRecommended = () => {
    const recommended = getRecommendedMetricIds(taskType);
    setSelectedMetrics(recommended);
    onSelectedMetricsChange?.(recommended);
  };

  const handleSelectAll = () => {
    const next = availableMetrics.map((m) => m.id);
    setSelectedMetrics(next);
    onSelectedMetricsChange?.(next);
  };

  const handleClear = () => {
    setSelectedMetrics([]);
    onSelectedMetricsChange?.([]);
  };

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
          <h1 className="text-2xl font-bold text-foreground mb-2">Metric selection</h1>
          <p className="text-sm text-muted-foreground">
            Choose the evaluation metrics that should be included in the report.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold">{selectedMetrics.length}</span> selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRecommended} disabled={!taskType}>
              Recommended
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={!taskType}>
              Select all
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>

        <div>
          <span className="text-sm text-muted-foreground">Class: </span>
          <Badge variant="secondary">{taskType ? TASK_TYPE_LABELS[taskType] : "Choose in Step 1"}</Badge>
        </div>

        {taskType && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Available columns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  These columns can participate in metric calculation for the selected classifier type.
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
                    placeholder="Search metrics"
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
                          ? "border-primary bg-blue-50 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-gray-400 hover:text-foreground",
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
                <Badge variant="secondary">{filteredMetrics.length} matching metrics</Badge>
                <Button variant="outline" size="sm" onClick={handleClearColumns} disabled={selectedColumns.length === 0}>
                  Reset columns
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!taskType ? (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              Choose a classifier type in Step 1 before selecting metrics.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredMetrics.map((metric) => {
              const isSelected = selectedMetrics.includes(metric.id);
              const requiredColumns = getRequiredColumnsForMetric(taskType, metric.id);

              return (
                <label
                  key={metric.id}
                  className={cn(
                    "relative flex flex-col p-5 rounded-lg border-2 cursor-pointer transition-colors min-h-[180px]",
                    isSelected ? "border-primary bg-blue-50" : "border-border bg-card hover:border-gray-400",
                  )}
                >
                  <div className="flex items-start gap-2 mb-3">
                    <Checkbox checked={isSelected} onCheckedChange={() => handleToggleMetric(metric.id)} className="mt-0.5" />
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
                    <h3 className="text-base font-semibold leading-tight">{metric.name}</h3>
                    <div className="text-sm text-foreground">{metric.subtitle}</div>
                    <p className="text-xs text-[#6B7280] leading-[1.5]">{metric.description}</p>
                  </div>
                </label>
              );
            })}
            {filteredMetrics.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                  <CardContent className="py-10 text-sm text-muted-foreground">
                  No metrics use the selected column combination.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {selectedMetrics.includes("M5") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">F-beta note</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p>`M5` requires a beta value in the next step.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Selection rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>`M5` (F-beta Score) requires beta input.</div>
            <div>Some binary metrics also require a positive class selection.</div>
            <div>Probability columns become required automatically for probability-based metrics.</div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
