import { useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { ActionBar } from "./ActionBar";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Slider } from "../ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { cn } from "../ui/utils";

interface ColumnMappingRow {
  originalName: string;
  sampleValues: string;
  inferredRole: string;
  modified: boolean;
}

const roleOptions = [
  { value: "id", label: "id" },
  { value: "y_true", label: "y_true" },
  { value: "y_pred", label: "y_pred" },
  { value: "score", label: "score" },
  { value: "prob_class_*", label: "prob_class_*" },
  { value: "ignore", label: "ignore" },
];

const roleDescriptions = [
  { role: "id", description: "A unique identifier for each sample." },
  { role: "y_true", description: "The ground-truth label column." },
  { role: "y_pred", description: "The model prediction column." },
  { role: "score", description: "A binary confidence or score column." },
  { role: "prob_class_*", description: "One probability column per class." },
  { role: "ignore", description: "A column that should not be used for evaluation." },
];

interface ColumnMappingProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ColumnMapping({
  currentStep,
  completedSteps,
  onStepClick,
  onNext,
  onPrevious,
}: ColumnMappingProps) {
  const taskType = "multiclass";

  const [mappings, setMappings] = useState<ColumnMappingRow[]>([
    { originalName: "sample_id", sampleValues: "S001, S002, S003", inferredRole: "id", modified: false },
    { originalName: "actual_label", sampleValues: "cat, dog, bird", inferredRole: "y_true", modified: false },
    { originalName: "predicted_label", sampleValues: "cat, cat, dog", inferredRole: "y_pred", modified: false },
    { originalName: "p_cat", sampleValues: "0.92, 0.10, 0.08", inferredRole: "prob_class_*", modified: false },
    { originalName: "p_dog", sampleValues: "0.05, 0.62, 0.86", inferredRole: "prob_class_*", modified: false },
    { originalName: "p_bird", sampleValues: "0.03, 0.28, 0.06", inferredRole: "prob_class_*", modified: false },
    { originalName: "memo", sampleValues: "test, final, v2", inferredRole: "ignore", modified: false },
  ]);
  const [positiveClass, setPositiveClass] = useState("cat");
  const [threshold, setThreshold] = useState(0.5);

  const handleRoleChange = (index: number, newRole: string) => {
    setMappings((prev) => prev.map((m, i) => (i === index ? { ...m, inferredRole: newRole, modified: true } : m)));
  };

  const getDuplicateRoles = () => {
    const roleCounts: Record<string, number> = {};
    mappings.forEach((mapping) => {
      if (mapping.inferredRole !== "ignore" && mapping.inferredRole !== "prob_class_*") {
        roleCounts[mapping.inferredRole] = (roleCounts[mapping.inferredRole] || 0) + 1;
      }
    });
    return Object.keys(roleCounts).filter((role) => roleCounts[role] > 1);
  };

  const duplicateRoles = getDuplicateRoles();
  const totalColumns = mappings.length;
  const mappedColumns = mappings.filter((m) => m.inferredRole !== "ignore").length;
  const ignoredColumns = mappings.filter((m) => m.inferredRole === "ignore").length;
  const hasYTrue = mappings.some((m) => m.inferredRole === "y_true");
  const hasYPred = mappings.some((m) => m.inferredRole === "y_pred");
  const hasScore = mappings.some((m) => m.inferredRole === "score");
  const hasProbClass = mappings.some((m) => m.inferredRole === "prob_class_*");
  const needsPositiveClass = taskType === "binary" && hasYTrue;
  const needsThreshold = taskType === "binary" && hasScore && !hasYPred;
  const isValid = hasYTrue && (hasYPred || hasScore || hasProbClass) && duplicateRoles.length === 0;

  const missingRequired: string[] = [];
  if (!hasYTrue) {
    missingRequired.push("y_true");
  }
  if (!hasYPred && !hasScore && !hasProbClass) {
    missingRequired.push("y_pred or probability columns");
  }

  const detectedClasses = ["cat", "dog", "bird"];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Column mapping</h1>
          <p className="text-sm text-muted-foreground">
            Review the auto-detected roles for each uploaded column and adjust them if needed.
          </p>
        </div>

        <div className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              The sample values were analyzed automatically. Check the inferred mapping before continuing.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Detected mapping</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Task type: {taskType} / {totalColumns} columns detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">Column name</TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">Sample values</TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">Assigned role</TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs w-24">Edited</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping, index) => {
                      const hasDuplicateRole =
                        duplicateRoles.includes(mapping.inferredRole) &&
                        mapping.inferredRole !== "ignore" &&
                        mapping.inferredRole !== "prob_class_*";
                      const isIgnored = mapping.inferredRole === "ignore";

                      return (
                        <TableRow key={mapping.originalName} className={cn("hover:bg-muted/50", isIgnored && "text-muted-foreground")}>
                          <TableCell className="font-mono text-sm">{mapping.originalName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {mapping.sampleValues}
                          </TableCell>
                          <TableCell>
                            <Select value={mapping.inferredRole} onValueChange={(value) => handleRoleChange(index, value)}>
                              <SelectTrigger className={cn("w-full", hasDuplicateRole && "border-destructive")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {hasDuplicateRole && (
                              <p className="text-xs text-destructive mt-1">
                                Only one column can be assigned to {mapping.inferredRole}.
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {mapping.modified && (
                              <Badge variant="secondary" className="text-xs">
                                Edited
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Mapping summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Total columns</div>
                  <div className="text-2xl font-bold font-mono tabular-nums">{totalColumns}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Mapped</div>
                  <div className="text-2xl font-bold font-mono tabular-nums">{mappedColumns}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Ignored</div>
                  <div className="text-2xl font-bold font-mono tabular-nums">{ignoredColumns}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Status</div>
                  <div>
                    {isValid ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Valid
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Incomplete
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {!isValid && missingRequired.length > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Missing required mapping: {missingRequired.join(", ")}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {needsPositiveClass && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Positive class</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Choose the positive class used by binary metrics such as precision and recall.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={positiveClass} onValueChange={setPositiveClass}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {detectedClasses.map((cls) => (
                      <label
                        key={cls}
                        htmlFor={`class-${cls}`}
                        className={cn(
                          "flex flex-col p-5 rounded-lg border-2 cursor-pointer transition-colors",
                          positiveClass === cls ? "border-primary bg-blue-50" : "border-border bg-card hover:border-gray-400",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <RadioGroupItem value={cls} id={`class-${cls}`} />
                          <div className="flex-1">
                            <div className="text-sm font-semibold font-mono mb-1">{cls}</div>
                            <div className="text-xs text-muted-foreground">Detected in sample rows</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {needsThreshold && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Threshold</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Set the score threshold used to convert probabilities into labels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="threshold">Threshold</Label>
                    <span className="text-sm font-mono tabular-nums text-muted-foreground">{threshold.toFixed(2)}</span>
                  </div>
                  <Slider
                    id="threshold"
                    min={0}
                    max={1}
                    step={0.05}
                    value={[threshold]}
                    onValueChange={(values) => setThreshold(values[0])}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="max-w-xs"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Samples at or above this threshold will be treated as positive predictions.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <Accordion type="single" collapsible>
              <AccordionItem value="help" className="border-none">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <span className="text-lg font-semibold">Role definitions</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-3">
                    {roleDescriptions.map((item) => (
                      <div key={item.role} className="flex gap-3">
                        <span className="font-mono text-sm font-medium min-w-[120px]">{item.role}:</span>
                        <span className="text-sm text-muted-foreground">{item.description}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </main>

      <ActionBar showPrevious={true} onPrevious={onPrevious} onNext={onNext} nextDisabled={!isValid} />
    </div>
  );
}
