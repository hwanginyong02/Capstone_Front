import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { cn } from "../../utils/styling/styles";
import type { FilterMode, MappingRole, MappingRow } from "../../types/mapping.types";
import { getRowMatchState } from "../../utils/domain/mappingHelpers";

interface DetectedMappingTableProps {
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  visibleRows: MappingRow[];
  roleCounts: Partial<Record<MappingRole, number>>;
  handleRoleChange: (columnName: string, newRole: string) => void;
  roleOptions: Array<{ value: MappingRole; label: string }>;
}

export function DetectedMappingTable({
  filterMode,
  setFilterMode,
  visibleRows,
  roleCounts,
  handleRoleChange,
  roleOptions,
}: DetectedMappingTableProps) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">찾은 매핑</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              올린 컬럼마다 맞는 역할에 매핑됐는지 확인하고, 고쳐야 할 것만 바꾸세요.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("all")}
            >
              전체
            </Button>
            <Button
              variant={filterMode === "issues" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("issues")}
            >
              문제만
            </Button>
            <Button
              variant={filterMode === "edited" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("edited")}
            >
              고친 것만
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs uppercase text-muted-foreground">올린 컬럼</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">값 예시</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">역할</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => {
                const duplicate = Boolean(
                  row.confirmedRole &&
                  row.confirmedRole !== "ignore" &&
                  row.confirmedRole !== "prob_class_*" &&
                  row.confirmedRole !== "prob_label_*" &&
                  (roleCounts[row.confirmedRole] ?? 0) > 1
                );
                const needsAttention = duplicate || row.confirmedRole === null || row.warnings.length > 0;
                const matchState = getRowMatchState(row, duplicate);

                return (
                  <TableRow key={row.originalName} className={cn(needsAttention && "bg-warning-subtle/40")}>
                    <TableCell className="align-top">
                      <div className="font-mono text-sm">{row.originalName}</div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="max-w-[240px] text-sm text-muted-foreground">
                        {row.sampleValues.join(", ")}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-2">
                        <Select
                          value={row.confirmedRole ?? "unassigned"}
                          onValueChange={(value) => handleRoleChange(row.originalName, value)}
                        >
                          <SelectTrigger className={cn("w-[210px]", duplicate && "border-destructive")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">지정 안 함</SelectItem>
                            {roleOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {row.inferredRole && row.confirmedRole !== row.inferredRole && (
                          <div className="text-xs text-muted-foreground">
                            자동 매핑: <span className="font-medium text-foreground">{row.inferredRole}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
