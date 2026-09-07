import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import {
  TASK_TYPE_LABELS,
  METRICS,
  MAPPABLE_ROLES_BY_TASK,
  PREDICTION_ROLE_ALTERNATIVES,
  resolveMissingRoleCodes,
  type TaskType,
  getRequiredColumnsForSelection,
} from "../../data/evaluationData";
import type { MappingRole, MappingRow, FilterMode } from "../../types/mapping.types";
import { applyRoleChange } from "../../utils/domain/applyRoleChange";
import {
  describeMappingValidity,
  getMappingValidityReason,
} from "../../utils/domain/mappingValidity";

import { RequiredColumnsCard } from "./RequiredColumnsCard";
import { BinaryClassificationCard } from "./BinaryClassificationCard";
import { DecisionThresholdCard } from "./DecisionThresholdCard";
import { ClassLabelDescriptionCard } from "./ClassLabelDescriptionCard";
import { DetectedMappingTable } from "./DetectedMappingTable";
import { MappingStatusPanel } from "./MappingStatusPanel";

interface ColumnMappingProps {
  taskType?: TaskType | "";
  selectedMetricIds?: string[];
  rows: MappingRow[];
  onRowsChange: (value: MappingRow[] | ((prev: MappingRow[]) => MappingRow[])) => void;
  onValidationChange?: (isValid: boolean) => void;
  classLabelDescriptions?: Record<string, string>;
  onClassLabelDescriptionsChange?: (
    value:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
  positiveClass?: string;
  onPositiveClassChange?: (value: string) => void;
  /** 백엔드가 양성 클래스 자동 판단에 실패한 경우 경고 표시(D5d). */
  positiveClassAmbiguous?: boolean;
  detectedClasses?: string[];
  columnUniqueValues?: Record<string, string[]>;
  /** 지표 선택 변경(매핑 해결 과정에서 지표 제외). 페이지에서 store.setSelectedMetricIds 주입. */
  onSelectedMetricIdsChange?: (ids: string[]) => void;
  /** 데이터 업로드 단계로 복귀. 페이지의 handlePrevious 주입. */
  onGoBackToUpload?: () => void;
  /** 결정 임계값(확률→예측 파생 기준). 성적서 합격 목표값과 다른 개념이다(A-01). */
  decisionThreshold?: number | Record<string, number> | null;
  onDecisionThresholdChange?: (value: number | Record<string, number> | null) => void;
}

/**
 * 드롭다운 선택지를 task_type 에 맞는 역할로 좁힌다.
 *
 * 이미 배정된 역할(assignedRoles)은 목록에서 빠지지 않도록 합집합으로 둔다.
 * task_type 을 나중에 바꾸면 기존 매핑이 초기화되지 않아, 필터링만 하면 Select 가
 * 값에 해당하는 항목을 못 찾아 빈 칸으로 렌더되기 때문이다.
 */
function buildRoleOptions(
  taskType: TaskType,
  assignedRoles: Iterable<MappingRole>,
): Array<{ value: MappingRole; label: string }> {
  const codes: MappingRole[] = [...MAPPABLE_ROLES_BY_TASK[taskType]];
  for (const role of assignedRoles) {
    if (role !== "ignore" && !codes.includes(role)) {
      codes.push(role);
    }
  }
  return [...codes, "ignore" as const].map((value) => ({ value, label: value }));
}

export function ColumnMapping({
  taskType = "multiclass",
  selectedMetricIds = [],
  rows,
  onRowsChange,
  onValidationChange,
  classLabelDescriptions = {},
  onClassLabelDescriptionsChange = () => {},
  positiveClass = "",
  onPositiveClassChange = () => {},
  positiveClassAmbiguous = false,
  detectedClasses = [],
  columnUniqueValues = {},
  onSelectedMetricIdsChange = () => {},
  onGoBackToUpload = () => {},
  decisionThreshold = null,
  onDecisionThresholdChange = () => {},
}: ColumnMappingProps) {
  const resolvedTaskType: TaskType = taskType || "multiclass";
  const selectedMetrics = useMemo(
    () => METRICS.filter((m) => selectedMetricIds.includes(m.id) && m.supportedTaskTypes.includes(resolvedTaskType)),
    [resolvedTaskType, selectedMetricIds],
  );
  const requiredRoles = useMemo(
    () => getRequiredColumnsForSelection(resolvedTaskType, selectedMetricIds),
    [resolvedTaskType, selectedMetricIds],
  );
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const roleOptions = useMemo(
    () =>
      buildRoleOptions(
        resolvedTaskType,
        rows.map((row) => row.confirmedRole).filter((role): role is MappingRole => role !== null),
      ),
    [resolvedTaskType, rows],
  );

  const yTrueRow = useMemo(() => rows.find((r) => r.confirmedRole === "y_true"), [rows]);
  const yTrueValues = useMemo(() => {
    const colName = yTrueRow?.originalName;
    if (colName && columnUniqueValues?.[colName]) {
      return columnUniqueValues[colName];
    }
    if (detectedClasses && detectedClasses.length > 0) {
      return detectedClasses;
    }
    if (!yTrueRow) return [];
    // 멀티레이블은 "sports|news" 처럼 결합된 값 → 원자 라벨로 분리해야 성적서 매퍼(동일하게 /[|,]/ 분리)와
    // 클래스 설명 키가 일치한다(분리 안 하면 설명이 매칭 안 돼 "설명 미입력"으로 유실됨).
    if (resolvedTaskType === "multilabel") {
      const atoms = yTrueRow.sampleValues.flatMap((v) =>
        v.split(/[|,]/).map((s) => s.trim()).filter(Boolean),
      );
      return Array.from(new Set(atoms));
    }
    return Array.from(new Set(yTrueRow.sampleValues));
  }, [yTrueRow, resolvedTaskType, detectedClasses, columnUniqueValues]);

  const roleCounts = useMemo(() => {
    const counts: Partial<Record<MappingRole, number>> = {};
    rows.forEach((row) => {
      if (!row.confirmedRole || row.confirmedRole === "ignore") {
        return;
      }
      counts[row.confirmedRole] = (counts[row.confirmedRole] ?? 0) + 1;
    });
    return counts;
  }, [rows]);

  /** 여러 컬럼에 배정돼도 중복이 아닌 역할 — 확률 역할은 클래스·레이블마다 하나씩이다. */
  const multiColumnRoles = useMemo(
    () => new Set<string>(PREDICTION_ROLE_ALTERNATIVES[resolvedTaskType].alternatives),
    [resolvedTaskType],
  );

  const visibleRows = useMemo(() => {
    if (filterMode === "edited") {
      return rows.filter((row) => row.modified);
    }
    if (filterMode === "issues") {
      return rows.filter((row) => {
        const duplicate =
          row.confirmedRole &&
          row.confirmedRole !== "ignore" &&
          !multiColumnRoles.has(row.confirmedRole) &&
          (roleCounts[row.confirmedRole] ?? 0) > 1;
        const unassigned = row.confirmedRole === null;
        return duplicate || unassigned || row.warnings.length > 0;
      });
    }
    return rows;
  }, [filterMode, multiColumnRoles, roleCounts, rows]);

  const mappingSummary = useMemo(() => {
    const editedCount = rows.filter((row) => row.modified).length;
    const duplicateCount = Object.entries(roleCounts).filter(([role, count]) => {
      if (!count || count < 2) {
        return false;
      }
      return !multiColumnRoles.has(role);
    }).length;

    // 예측 역할은 확률 역할이 배정돼 있으면 충족된 것으로 본다 — 백엔드가 확률에서
    // 예측을 파생하기 때문이다(ISSUES.md A-01·A-02). 규칙은 evaluationData 의
    // PREDICTION_ROLE_ALTERNATIVES 한 곳에만 있다.
    const missingCodes = new Set(
      resolveMissingRoleCodes(resolvedTaskType, requiredRoles.map((r) => r.code), roleCounts),
    );
    const missingRoles = requiredRoles.filter((role) => missingCodes.has(role.code));

    // 판정은 순수 함수에 위임한다(ISSUES.md E-13). 특히 taskType 은 **둔갑 전 원본**을 넘긴다 —
    // resolvedTaskType 을 쓰면 빈 taskType 이 "multiclass" 로 둔갑해 binary 검사를 건너뛴다.
    const assignedRoleCount = rows.filter(
      (row) => row.confirmedRole && row.confirmedRole !== "ignore",
    ).length;
    const missingRoleCodes = missingRoles.map((role) => role.code);
    const validityReason = getMappingValidityReason({
      taskType,
      selectedMetricIds,
      assignedRoleCount,
      missingRoleCodes,
      duplicateRoleCount: duplicateCount,
      positiveClass,
    });

    return {
      editedCount,
      duplicateCount,
      missingRoles,
      validityReason,
      validityMessage: describeMappingValidity(validityReason, missingRoleCodes),
      isValid: validityReason === "ok",
    };
  }, [requiredRoles, roleCounts, rows, taskType, resolvedTaskType, multiColumnRoles, selectedMetricIds, positiveClass]);

  useEffect(() => {
    onValidationChange?.(mappingSummary.isValid);
  }, [mappingSummary.isValid, onValidationChange]);

  /** 역할 변경은 컬럼명 기준으로 적용한다(필터가 걸려도 안전). applyRoleChange 가 정본. */
  const handleRoleChange = (columnName: string, newRole: string) => {
    onRowsChange((prev) => applyRoleChange(prev, columnName, newRole));
  };

  return (
    <>
      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Column mapping review</h1>
            <p className="text-sm text-muted-foreground">
              Review and adjust the mapped roles to ensure your dataset is correctly interpreted for evaluation.
            </p>
          </div>
          <Badge variant="outline" className="w-fit px-3 py-1 text-sm">
            {TASK_TYPE_LABELS[resolvedTaskType]} workflow
          </Badge>
        </div>

        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            The system has automatically mapped your columns based on their contents. Please review and confirm the assignments before proceeding.
          </AlertDescription>
        </Alert>

        {/* 왜 진행할 수 없는지 이 화면에서 알려준다 — 종전에는 버튼만 막히고, 실제 사유는
            백엔드 왕복 뒤 raw alert 로만 드러났다(ISSUES.md E-13). */}
        {mappingSummary.validityMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{mappingSummary.validityMessage}</AlertDescription>
          </Alert>
        )}

        <RequiredColumnsCard
          selectedMetrics={selectedMetrics}
          requiredRoles={requiredRoles}
          resolvedTaskType={resolvedTaskType}
          roleCounts={roleCounts}
        />

        <BinaryClassificationCard
          resolvedTaskType={resolvedTaskType}
          positiveClass={positiveClass}
          setPositiveClass={onPositiveClassChange || (() => {})}
          yTrueRow={yTrueRow}
          yTrueValues={yTrueValues}
          positiveClassAmbiguous={positiveClassAmbiguous}
        />

        <DecisionThresholdCard
          resolvedTaskType={resolvedTaskType}
          rows={rows}
          decisionThreshold={decisionThreshold}
          onDecisionThresholdChange={onDecisionThresholdChange}
        />

        {onClassLabelDescriptionsChange && (
          <ClassLabelDescriptionCard
            yTrueRow={yTrueRow}
            yTrueValues={yTrueValues}
            classLabelDescriptions={classLabelDescriptions}
            onClassLabelDescriptionsChange={onClassLabelDescriptionsChange}
          />
        )}

        <DetectedMappingTable
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          visibleRows={visibleRows}
          roleCounts={roleCounts}
          handleRoleChange={handleRoleChange}
          roleOptions={roleOptions}
        />

        <MappingStatusPanel
          mappingSummary={mappingSummary}
          resolvedTaskType={resolvedTaskType}
          selectedMetrics={selectedMetrics}
          selectedMetricIds={selectedMetricIds}
          positiveClass={positiveClass}
          yTrueRow={yTrueRow}
          onSelectedMetricIdsChange={onSelectedMetricIdsChange}
          onGoBackToUpload={onGoBackToUpload}
        />
      </main>
    </>
  );
}
