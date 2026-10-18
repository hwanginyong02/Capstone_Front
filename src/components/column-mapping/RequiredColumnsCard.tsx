import { Info } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import type { RequiredColumnDisplay, TaskType } from "../../data/evaluationData";
import type { MappingRole } from "../../types/mapping.types";
import { getRoleStatusLabel } from "../../utils/domain/mappingHelpers";

interface RequiredColumnsCardProps {
  taskType: TaskType;
  requiredRoles: RequiredColumnDisplay[];
  roleCounts: Partial<Record<MappingRole, number>>;
}

export function RequiredColumnsCard({
  taskType,
  requiredRoles,
  roleCounts,
}: RequiredColumnsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">필수 컬럼</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          이 역할마다 데이터의 컬럼을 하나씩 지정해야 합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            지표는 뒤의 "지표와 합격 기준" 화면에서 고릅니다. 지금은 평가에 꼭 필요한 정답과
            예측(또는 확률) 컬럼만 확인합니다. 확률 컬럼을 매핑하지 않으면 AUROC 같은 곡선 지표는
            지표 화면에서 고를 수 없습니다.
          </AlertDescription>
        </Alert>

        {requiredRoles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiredRoles.map((role) => {
              const status = getRoleStatusLabel(taskType, role, roleCounts);

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
                  <p className="text-sm text-muted-foreground flex-grow">{role.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
