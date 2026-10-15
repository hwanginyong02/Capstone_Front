import { AlertCircle, CheckCircle2, ShieldAlert, Undo2 } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import type { RequiredColumnDisplay, TaskType } from "../../data/evaluationData";
import type { MappingRow } from "../../types/mapping.types";

/**
 * 매핑 상태 — 다 됐는지, 무엇이 막는지.
 *
 * 빠진 필수 컬럼은 정답과 예측(또는 확률)뿐이다. 매핑이 지표보다 앞이라(docs/MATERIAL_PICKER.md
 * §3) 종전의 "지표를 조정해 해결"(그 컬럼이 필요한 지표 빼기)은 없앴다. 이 컬럼들은 어떤 지표에도
 * 필요하므로 데이터를 다시 올리는 것 말고는 풀 길이 없다.
 */

interface MappingStatusPanelProps {
  mappingSummary: {
    isValid: boolean;
    missingRoles: RequiredColumnDisplay[];
    duplicateCount: number;
  };
  resolvedTaskType: TaskType;
  positiveClass: string;
  yTrueRow: MappingRow | undefined;
  /** 데이터 업로드 단계로 복귀. 페이지의 handlePrevious 를 주입한다(스텝 상태 일관성 유지). */
  onGoBackToUpload: () => void;
}

export function MappingStatusPanel({
  mappingSummary,
  resolvedTaskType,
  positiveClass,
  yTrueRow,
  onGoBackToUpload,
}: MappingStatusPanelProps) {
  if (mappingSummary.isValid) {
    return (
      <Alert className="bg-success-subtle border-success-border text-success-strong">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertDescription>
          <div className="font-semibold text-success-strong">필요한 설정을 모두 마쳤습니다.</div>
          <p className="text-success-strong">이 매핑을 확정하고 다음으로 넘어갈 수 있습니다.</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {mappingSummary.missingRoles.length > 0 && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/30 text-destructive p-6">
          <AlertCircle className="h-5 w-5 text-destructive mt-1" />
          <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="font-bold text-lg text-destructive">필수 컬럼이 빠졌습니다</div>
              <p className="text-destructive">
                필수 역할 {mappingSummary.missingRoles.length}개가 아직 지정되지 않았습니다.
                다음 단계로 넘어갈 수 없습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Button
                variant="outline"
                className="bg-white hover:bg-muted border-border text-foreground-secondary px-5"
                onClick={onGoBackToUpload}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                업로드로 돌아가기
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {mappingSummary.duplicateCount > 0 && (
        <Alert variant="destructive" className="bg-warning-subtle border-warning-border text-warning-strong">
          <ShieldAlert className="h-4 w-4 text-warning" />
          <AlertDescription>
            <div className="font-semibold mb-1 text-warning-strong">역할이 겹칩니다</div>
            <p className="text-warning-strong">
              한 컬럼에만 줄 수 있는 역할이 여러 컬럼에 지정됐습니다. 이런 역할은 정확히 한 컬럼에만 지정해야 합니다.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {resolvedTaskType === "binary" &&
        positiveClass === "" &&
        yTrueRow &&
        mappingSummary.missingRoles.filter((r) => r.code === "y_true").length === 0 && (
          <Alert variant="destructive" className="bg-warning-subtle border-warning-border text-warning-strong">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription>
              <div className="font-semibold mb-1 text-warning-strong">양성 클래스가 없습니다</div>
              <p className="text-warning-strong">
                이진 분류의 양성 클래스 값을 고르세요.
              </p>
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
}
