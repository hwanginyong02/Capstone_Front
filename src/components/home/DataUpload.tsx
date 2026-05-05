import { useMemo, useRef, type ChangeEvent, type ReactNode } from "react";
import { FileText, Lightbulb, Upload, X } from "lucide-react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { ActionBar } from "./ActionBar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  getRequiredColumnsForSelection,
  selectionRequiresProbability,
  TASK_TYPE_LABELS,
  type TaskType,
} from "../../data/evaluationData";
import type {
  DatasetInfoFormData,
  UploadedFileInfo,
} from "../../types/workflow.types";

interface DataUploadProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  selectedTCIds?: string[];
  taskType?: TaskType | "";
  datasetInfo: DatasetInfoFormData;
  onDatasetInfoChange: (
    value: DatasetInfoFormData | ((prev: DatasetInfoFormData) => DatasetInfoFormData),
  ) => void;
  uploadedFile: UploadedFileInfo | null;
  onUploadedFileChange: (value: UploadedFileInfo | null) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getCsvExample(taskType: TaskType, requiresProb: boolean): string {
  if (taskType === "binary") {
    return requiresProb
      ? "id,y_true,y_pred,score\nS001,1,1,0.92\nS002,0,1,0.67\nS003,1,1,0.88"
      : "id,y_true,y_pred\nS001,1,1\nS002,0,1\nS003,1,1";
  }

  if (taskType === "multilabel") {
    return requiresProb
      ? "id,true_labels,pred_labels,prob_label_sports,prob_label_news\nS001,sports,sports,0.92,0.08\nS002,news,news,0.14,0.86"
      : "id,true_labels,pred_labels\nS001,sports,sports\nS002,news,news";
  }

  return requiresProb
    ? "id,y_true,y_pred,prob_class_cat,prob_class_dog,prob_class_bird\nS001,cat,cat,0.92,0.05,0.03\nS002,bird,dog,0.10,0.62,0.28"
    : "id,y_true,y_pred\nS001,cat,cat\nS002,bird,dog";
}

function getJsonExample(taskType: TaskType, requiresProb: boolean): string {
  if (taskType === "binary") {
    return requiresProb
      ? '{\n  "samples": [\n    { "id": "S001", "y_true": 1, "y_pred": 1, "score": 0.92 }\n  ]\n}'
      : '{\n  "samples": [\n    { "id": "S001", "y_true": 1, "y_pred": 1 }\n  ]\n}';
  }

  if (taskType === "multilabel") {
    return requiresProb
      ? '{\n  "samples": [\n    { "id": "S001", "true_labels": "sports", "pred_labels": "sports", "prob_label_sports": 0.92 }\n  ]\n}'
      : '{\n  "samples": [\n    { "id": "S001", "true_labels": "sports", "pred_labels": "sports" }\n  ]\n}';
  }

  return requiresProb
    ? '{\n  "samples": [\n    { "id": "S001", "y_true": "cat", "y_pred": "cat", "prob_class_cat": 0.92 }\n  ]\n}'
    : '{\n  "samples": [\n    { "id": "S001", "y_true": "cat", "y_pred": "cat" }\n  ]\n}';
}

export function DataUpload({
  currentStep,
  completedSteps,
  onStepClick,
  onNext,
  onPrevious,
  selectedTCIds = [],
  taskType = "",
  datasetInfo,
  onDatasetInfoChange,
  uploadedFile,
  onUploadedFileChange,
}: DataUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedTaskType = taskType || "multiclass";
  const requiresProb = selectionRequiresProbability(resolvedTaskType, selectedTCIds);
  const requiredColumns = useMemo(
    () => getRequiredColumnsForSelection(resolvedTaskType, selectedTCIds),
    [resolvedTaskType, selectedTCIds],
  );
  const csvExample = getCsvExample(resolvedTaskType, requiresProb);
  const jsonExample = getJsonExample(resolvedTaskType, requiresProb);
  const trainingCount = Number(datasetInfo.trainingSampleCount);
  const evaluationCount = Number(datasetInfo.evaluationSampleCount);
  const hasDatasetCounts = Number.isFinite(trainingCount) && Number.isFinite(evaluationCount) && trainingCount >= 0 && evaluationCount >= 0;
  const totalCount = hasDatasetCounts ? trainingCount + evaluationCount : null;
  const trainingRatio = hasDatasetCounts && totalCount ? trainingCount / totalCount : null;
  const evaluationRatio = hasDatasetCounts && totalCount ? evaluationCount / totalCount : null;
  const isDatasetInfoValid =
    datasetInfo.datasetFormat.trim() !== "" &&
    datasetInfo.trainingSampleCount.trim() !== "" &&
    datasetInfo.evaluationSampleCount.trim() !== "";

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const updateDatasetInfo = <K extends keyof DatasetInfoFormData>(
    field: K,
    value: DatasetInfoFormData[K],
  ) => {
    onDatasetInfoChange((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onUploadedFileChange({
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || "unknown",
    });
  };

  const handleFileRemove = () => {
    onUploadedFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Data upload</h1>
          <p className="text-sm text-muted-foreground">
            Select the evaluation dataset file. Column mapping will be handled later in the backend workflow.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json,application/json,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Dataset information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Enter the dataset details that will be shown in the detailed test result section of the report.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="Dataset format" required>
                  <Input
                    value={datasetInfo.datasetFormat}
                    onChange={(event) => updateDatasetInfo("datasetFormat", event.target.value)}
                    placeholder="e.g. PNG image dataset"
                  />
                </Field>
                <Field label="Training samples" required>
                  <Input
                    inputMode="numeric"
                    value={datasetInfo.trainingSampleCount}
                    onChange={(event) => updateDatasetInfo("trainingSampleCount", event.target.value)}
                    placeholder="1161"
                  />
                </Field>
                <Field label="Evaluation samples" required>
                  <Input
                    inputMode="numeric"
                    value={datasetInfo.evaluationSampleCount}
                    onChange={(event) => updateDatasetInfo("evaluationSampleCount", event.target.value)}
                    placeholder="291"
                  />
                </Field>
              </div>

              {hasDatasetCounts && totalCount !== null && totalCount > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  Total samples {totalCount.toLocaleString()} | Train/Eval ratio {trainingRatio?.toFixed(2)} / {evaluationRatio?.toFixed(2)}
                </div>
              )}
            </CardContent>
          </Card>

          {!uploadedFile && (
            <Card
              className="border-2 border-dashed border-border hover:border-primary hover:bg-blue-50/30 transition-colors cursor-pointer"
              onClick={openFilePicker}
            >
              <CardContent className="flex flex-col items-center justify-center min-h-[280px] py-12">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-base font-semibold mb-2">Click to choose a file</h3>
                <p className="text-sm text-muted-foreground">CSV or JSON, up to 100MB</p>
              </CardContent>
            </Card>
          )}

          {uploadedFile && (
            <Card className="border-2 border-border">
              <CardContent className="flex items-center justify-between min-h-[120px] py-6">
                <div className="flex items-center gap-4">
                  <FileText className="h-10 w-10 text-primary" />
                  <div>
                    <div className="font-semibold text-sm mb-1">{uploadedFile.name}</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {uploadedFile.size} {uploadedFile.type !== "unknown" ? `| ${uploadedFile.type}` : ""}
                    </div>
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Choose another file
                    </button>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleFileRemove} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Required columns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                These are the exact columns required by the TCs you selected. Optional columns are intentionally hidden here.
              </p>

              <div className="space-y-3">
                {requiredColumns.length === 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Select one or more TCs first to see the exact required columns here.
                  </div>
                )}

                {requiredColumns.map((column) => (
                  <div key={column.code} className="rounded-lg border border-green-200 bg-[#F0FDF4] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{column.code}</Badge>
                      <span className="text-sm font-semibold text-slate-900">{column.label}</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      {column.code === "id" &&
                        "Use this column to uniquely identify each evaluation sample. Every row should have a stable, non-duplicated identifier so later analysis can trace results back to the original record."}
                      {column.code === "y_true" &&
                        "This column contains the ground-truth answer for each sample. In other words, it is the correct label used as the reference when computing accuracy, precision, recall, and related metrics."}
                      {column.code === "y_pred" &&
                        "This column contains the label predicted by the model for each sample. It is compared directly against the ground-truth label to calculate classification metrics."}
                      {column.code === "score" &&
                        "This column stores a confidence score, usually for the positive class in binary classification. It is required for threshold-based or probability-based metrics such as AUROC, AUPRC, log loss, or KL divergence."}
                      {column.code === "prob_class_*" &&
                        "Provide one probability column per class, such as prob_cat, prob_dog, and prob_bird. Each row should describe how the model distributes confidence across all classes."}
                      {column.code === "true_labels" &&
                        "This column contains the full set of correct labels for each sample in a multi-label task. If a sample belongs to multiple labels, they should be represented consistently using your agreed label format."}
                      {column.code === "pred_labels" &&
                        "This column contains the full set of labels predicted by the model for each sample in a multi-label task. It is compared against the true label set to compute multi-label metrics."}
                      {column.code === "prob_label_*" &&
                        "Provide one probability column per label in the multi-label setting. Each value represents the model confidence that a specific label applies to the sample."}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <Accordion type="single" collapsible>
              <AccordionItem value="template" className="border-none">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-lg font-semibold">Template examples</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {TASK_TYPE_LABELS[resolvedTaskType]}
                      {requiresProb ? " with probability columns" : ""}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <Tabs defaultValue="csv" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="csv">CSV</TabsTrigger>
                      <TabsTrigger value="json">JSON</TabsTrigger>
                    </TabsList>
                    <TabsContent value="csv">
                      <div className="bg-muted rounded-md p-4">
                        <pre className="text-xs font-mono overflow-x-auto whitespace-pre">{csvExample}</pre>
                      </div>
                    </TabsContent>
                    <TabsContent value="json">
                      <div className="bg-muted rounded-md p-4">
                        <pre className="text-xs font-mono overflow-x-auto whitespace-pre">{jsonExample}</pre>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-3 p-3 rounded-md bg-muted/60 border border-border flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Column names can differ from these examples for now. You said mapping will be implemented in the backend repository later.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </main>

      <ActionBar
        showPrevious={true}
        onPrevious={onPrevious}
        onNext={onNext}
        nextDisabled={!uploadedFile || !isDatasetInfoValid}
      />
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-600">*</span>}
      </Label>
      {children}
    </div>
  );
}
