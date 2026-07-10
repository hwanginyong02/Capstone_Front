import { useState } from "react";
import { AlertCircle, CheckCircle2, ShieldAlert, Undo2 } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import {
  type MetricDefinition,
  type RequiredColumnDisplay,
  type TaskType,
  getRequiredColumnsForMetric,
} from "../../data/evaluationData";
import type { MappingRow } from "../../types/mapping.types";
import { MappingResolutionView } from "./MappingResolutionView";

interface MappingStatusPanelProps {
  mappingSummary: {
    isValid: boolean;
    missingRoles: RequiredColumnDisplay[];
    duplicateCount: number;
  };
  resolvedTaskType: TaskType;
  selectedMetrics: MetricDefinition[];
  selectedMetricIds: string[];
  positiveClass: string;
  yTrueRow: MappingRow | undefined;
  /** 지표 선택 변경(지표 제외). 페이지에서 store.setSelectedMetricIds 를 주입한다. */
  onSelectedMetricIdsChange: (ids: string[]) => void;
  /** 데이터 업로드 단계로 복귀. 페이지의 handlePrevious 를 주입한다(스텝 상태 일관성 유지). */
  onGoBackToUpload: () => void;
}

export function MappingStatusPanel({
  mappingSummary,
  resolvedTaskType,
  selectedMetrics,
  selectedMetricIds,
  positiveClass,
  yTrueRow,
  onSelectedMetricIdsChange,
  onGoBackToUpload,
}: MappingStatusPanelProps) {
  const [isResolutionMode, setIsResolutionMode] = useState(false);

  const handleRemoveMetric = (id: string) => {
    onSelectedMetricIdsChange(selectedMetricIds.filter((mId) => mId !== id));
  };

  const handleExcludeAllAffected = () => {
    const affectedMetricIds = new Set<string>();
    mappingSummary.missingRoles.forEach((role) => {
      selectedMetrics.forEach((m) => {
        if (getRequiredColumnsForMetric(resolvedTaskType, m.id).some((r) => r.code === role.code)) {
          affectedMetricIds.add(m.id);
        }
      });
    });
    onSelectedMetricIdsChange(selectedMetricIds.filter((id) => !affectedMetricIds.has(id)));
    setIsResolutionMode(false);
  };
  if (mappingSummary.isValid) {
    return (
      <Alert className="bg-green-50 border-green-200 text-green-900">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription>
          <div className="font-semibold text-green-800">All required settings are satisfied.</div>
          <p className="text-green-700">You can confirm this mapping and continue to validation.</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {mappingSummary.missingRoles.length > 0 && (
        <>
          {!isResolutionMode ? (
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900 p-6">
              <AlertCircle className="h-5 w-5 text-red-600 mt-1" />
              <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="font-bold text-lg text-red-800">Missing required columns</div>
                  <p className="text-red-700">
                    {mappingSummary.missingRoles.length} required roles are not assigned yet.
                    You cannot proceed to the next step.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 shrink-0">
                  <Button
                    variant="outline"
                    className="bg-white hover:bg-red-50 border-red-200 text-red-700 font-semibold px-5"
                    onClick={() => setIsResolutionMode(true)}
                  >
                    Adjust Metrics to Resolve
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 px-5"
                    onClick={onGoBackToUpload}
                  >
                    <Undo2 className="mr-2 h-4 w-4" />
                    Go back to Upload
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <MappingResolutionView
              missingRoles={mappingSummary.missingRoles}
              selectedMetrics={selectedMetrics}
              resolvedTaskType={resolvedTaskType}
              onClose={() => setIsResolutionMode(false)}
              onRemoveMetric={handleRemoveMetric}
              onExcludeAllAffected={handleExcludeAllAffected}
              onGoBackToUpload={onGoBackToUpload}
            />
          )}
        </>
      )}

      {mappingSummary.duplicateCount > 0 && (
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <div className="font-semibold mb-1 text-amber-800">Role conflict detected</div>
            <p className="text-amber-700">
              Some single-use roles are assigned to multiple columns. Each single-use role must be assigned to exactly one column.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {resolvedTaskType === "binary" &&
        positiveClass === "" &&
        yTrueRow &&
        mappingSummary.missingRoles.filter((r) => r.code === "y_true").length === 0 && (
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              <div className="font-semibold mb-1 text-amber-800">Missing positive class</div>
              <p className="text-amber-700">
                Please select the positive class value for the binary classification task.
              </p>
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
}
