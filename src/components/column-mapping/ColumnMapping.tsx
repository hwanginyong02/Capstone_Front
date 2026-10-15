import { useEffect, useMemo } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import {
  TASK_TYPE_LABELS_KO,
  MAPPABLE_ROLES_BY_TASK,
  PREDICTION_ROLE_ALTERNATIVES,
  resolveMissingRoleCodes,
  type TaskType,
  getBaseRequiredColumns,
} from "../../data/evaluationData";
import type { MappingRole, MappingRow } from "../../types/mapping.types";
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
  onGoBackToUpload = () => {},
  decisionThreshold = null,
  onDecisionThresholdChange = () => {},
}: ColumnMappingProps) {
  const resolvedTaskType: TaskType = taskType || "multiclass";
  /**
   * 매핑해야 할 역할 — 정답과 예측(또는 확률). 매핑은 지표 선택보다 앞이고 고른 지표에 기대지
   * 않는다(docs/MATERIAL_PICKER.md §3). 지표마다 더 필요한 컬럼(예: AUROC 의 확률)은 지표 화면이
   * 이 매핑으로 판정해, 계산할 수 없는 지표를 비활성으로 둔다(`metricAvailability`).
   */
  const requiredRoles = useMemo(() => getBaseRequiredColumns(resolvedTaskType), [resolvedTaskType]);

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
  }, [requiredRoles, roleCounts, rows, taskType, resolvedTaskType, multiColumnRoles, positiveClass]);

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
            <h1 className="text-2xl font-bold text-foreground mb-2">컬럼 매핑 확인</h1>
            <p className="text-sm text-muted-foreground">
              데이터가 평가에 맞게 읽히도록 매핑된 역할을 확인하고 고치세요.
            </p>
          </div>
          <Badge variant="outline" className="w-fit px-3 py-1 text-sm">
            {TASK_TYPE_LABELS_KO[resolvedTaskType]}
          </Badge>
        </div>

        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            컬럼 내용을 보고 역할을 자동으로 매핑했습니다. 넘어가기 전에 확인하고 확정하세요.
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

        <RequiredColumnsCard requiredRoles={requiredRoles} roleCounts={roleCounts} />

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
          rows={rows}
          roleCounts={roleCounts}
          handleRoleChange={handleRoleChange}
          roleOptions={roleOptions}
        />

        <MappingStatusPanel
          mappingSummary={mappingSummary}
          resolvedTaskType={resolvedTaskType}
          positiveClass={positiveClass}
          yTrueRow={yTrueRow}
          onGoBackToUpload={onGoBackToUpload}
        />
      </main>
    </>
  );
}
