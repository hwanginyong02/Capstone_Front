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
            <CardTitle className="text-lg font-semibold">Detected mapping</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Check whether each uploaded column was mapped to the right role, then edit only the ones that need correction.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("all")}
            >
              All rows
            </Button>
            <Button
              variant={filterMode === "issues" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("issues")}
            >
              Issues only
            </Button>
            <Button
              variant={filterMode === "edited" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("edited")}
            >
              Edited only
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs uppercase text-muted-foreground">Uploaded column</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Sample values</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Role</TableHead>
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
                  <TableRow key={row.originalName} className={cn(needsAttention && "bg-amber-50/40")}>
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
                            <SelectItem value="unassigned">unassigned</SelectItem>
                            {roleOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {row.inferredRole && row.confirmedRole !== row.inferredRole && (
                          <div className="text-xs text-muted-foreground">
                            Auto-mapped as: <span className="font-medium text-foreground">{row.inferredRole}</span>
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
