import { Info } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import {
  type MetricDefinition,
  type RequiredColumnDisplay,
  type TaskType,
  getRequiredColumnsForMetric,
} from "../../data/evaluationData";
import type { MappingRole } from "../../types/mapping.types";
import { getRoleStatusLabel } from "../../utils/domain/mappingHelpers";

interface RequiredColumnsCardProps {
  selectedMetrics: MetricDefinition[];
  requiredRoles: RequiredColumnDisplay[];
  resolvedTaskType: TaskType;
  roleCounts: Partial<Record<MappingRole, number>>;
}

export function RequiredColumnsCard({
  selectedMetrics,
  requiredRoles,
  resolvedTaskType,
  roleCounts,
}: RequiredColumnsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">필수 컬럼</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          고른 평가 지표에 필요한 컬럼입니다. 이 역할마다 데이터의 컬럼을 하나씩 지정해야 합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedMetrics.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              아직 고른 지표가 없어 분류 유형 기준으로만 보여 줍니다.
            </AlertDescription>
          </Alert>
        )}

        {requiredRoles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiredRoles.map((role) => {
              const count = roleCounts[role.code] ?? 0;
              const status = getRoleStatusLabel(role, count);

              // 어떤 metric이 이 컬럼을 필요로 하는지 찾기
              const metricsRequiringThis = selectedMetrics.filter((metric) => {
                const req = getRequiredColumnsForMetric(resolvedTaskType, metric.id);
                return req.some((r) => r.code === role.code);
              });

              return (
                <div key={role.code} className="rounded-xl border border-border bg-card p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{role.code}</span>
                        <Badge variant={status.tone}>{status.label}</Badge>
                      </div>
                      <div className="text-sm font-medium text-foreground-secondary">{role.label}</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground flex-grow mb-4">{role.description}</p>

                  {metricsRequiringThis.length > 0 && (
                    <div className="mt-auto pt-4 border-t border-border">
                      <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                        필요로 하는 지표
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {metricsRequiringThis.map((metric) => (
                          <Badge
                            key={metric.id}
                            variant="outline"
                            className="bg-muted text-foreground-secondary font-normal border-border"
                          >
                            {metric.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
