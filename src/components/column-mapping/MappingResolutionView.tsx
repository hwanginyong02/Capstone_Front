import { X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  type MetricDefinition,
  type RequiredColumnDisplay,
  type TaskType,
  getRequiredColumnsForMetric,
} from "../../data/evaluationData";

interface MappingResolutionViewProps {
  missingRoles: RequiredColumnDisplay[];
  selectedMetrics: MetricDefinition[];
  resolvedTaskType: TaskType;
  onClose: () => void;
  onRemoveMetric: (id: string) => void;
  onExcludeAllAffected: () => void;
  onGoBackToUpload: () => void;
}

export function MappingResolutionView({
  missingRoles,
  selectedMetrics,
  resolvedTaskType,
  onClose,
  onRemoveMetric,
  onExcludeAllAffected,
  onGoBackToUpload,
}: MappingResolutionViewProps) {
  return (
    <div className="rounded-2xl border-2 border-destructive/30 bg-white p-8 shadow-xl animate-in fade-in zoom-in duration-300">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">빠진 필수 컬럼 해결</h2>
          <p className="text-foreground-secondary">
            아래 컬럼이 데이터에 없습니다. 이 컬럼이 필요한 지표를 빼면 해결됩니다.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {missingRoles.map((role) => {
          const metricsRequiringThis = selectedMetrics.filter((m) =>
            getRequiredColumnsForMetric(resolvedTaskType, m.id).some((r) => r.code === role.code)
          );

          return (
            <div key={role.code} className="rounded-xl border border-border bg-muted/50 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="bg-destructive/10 border-destructive/30 text-destructive text-sm py-1 px-3">
                  {role.code}
                </Badge>
                <span className="font-semibold text-foreground">{role.label}</span>
              </div>

              <div className="space-y-3 flex-grow">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">필요로 하는 지표:</p>
                <div className="flex flex-col gap-2">
                  {metricsRequiringThis.map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center justify-between bg-white rounded-lg p-3 border border-border shadow-sm"
                    >
                      <span className="text-sm font-medium text-foreground-secondary">{metric.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                        onClick={() => onRemoveMetric(metric.id)}
                      >
                        빼기
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-border gap-4">
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground-secondary" onClick={onClose}>
          취소하고 돌아가기
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" className="border-border text-foreground-secondary" onClick={onGoBackToUpload}>
            데이터를 다시 올리기
          </Button>
          <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-6" onClick={onExcludeAllAffected}>
            해당 지표 모두 빼기
          </Button>
        </div>
      </div>
    </div>
  );
}
