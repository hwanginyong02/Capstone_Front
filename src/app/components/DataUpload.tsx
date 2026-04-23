import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { ActionBar } from "./ActionBar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Upload, FileText, CheckCircle2, X, Lightbulb, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import {
  getProbabilityColumnLabel,
  getUploadColumnGuide,
  selectionRequiresProbability,
  TASK_TYPE_LABELS,
  type TaskType,
} from "../config/evaluationConfig";

interface DataUploadProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  selectedTCIds?: string[];
  taskType?: TaskType | "";
}

function getCsvExample(taskType: TaskType, requiresProb: boolean): string {
  if (taskType === "binary") {
    return requiresProb
      ? "id,y_true,y_pred,score\nS001,1,1,0.92\nS002,0,1,0.67\nS003,1,1,0.88"
      : "id,y_true,y_pred\nS001,1,1\nS002,0,1\nS003,1,1";
  }

  if (taskType === "multilabel") {
    return requiresProb
      ? "id,y_true,y_pred,prob_label_sports,prob_label_news\nS001,sports,sports,0.92,0.08\nS002,news,news,0.14,0.86"
      : "id,y_true,y_pred\nS001,sports,sports\nS002,news,news";
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
      ? '{\n  "samples": [\n    { "id": "S001", "y_true": "sports", "y_pred": "sports", "prob_label_sports": 0.92 }\n  ]\n}'
      : '{\n  "samples": [\n    { "id": "S001", "y_true": "sports", "y_pred": "sports" }\n  ]\n}';
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
}: DataUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>({
    name: "sample.csv",
    size: "5.57 KB",
  });

  const resolvedTaskType = taskType || "multiclass";
  const requiresProb = selectionRequiresProbability(resolvedTaskType, selectedTCIds);
  const columnGuide = getUploadColumnGuide(resolvedTaskType, selectedTCIds);
  const probColLabel = getProbabilityColumnLabel(resolvedTaskType);
  const csvExample = getCsvExample(resolvedTaskType, requiresProb);
  const jsonExample = getJsonExample(resolvedTaskType, requiresProb);

  const handleFileRemove = () => setUploadedFile(null);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Data upload</h1>
          <p className="text-sm text-muted-foreground">
            Required columns now follow the classifier type and selected TC combination.
          </p>
        </div>

        <div className="space-y-6">
          {!uploadedFile && (
            <Card className="border-2 border-dashed border-border hover:border-primary hover:bg-blue-50/30 transition-colors cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center min-h-[280px] py-12">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-base font-semibold mb-2">Drop a file here or click to upload</h3>
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
                    <div className="text-xs text-muted-foreground mb-2">{uploadedFile.size}</div>
                    <button className="text-xs text-muted-foreground hover:text-foreground underline">
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
              <div className="rounded-lg border border-green-200 bg-[#F0FDF4] p-4 space-y-3">
                <p className="text-xs font-medium text-green-800 uppercase tracking-wide">Required now</p>
                {columnGuide.alwaysRequired.map((column) => (
                  <div key={column} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      Required column: <span className="font-medium">{column}</span>
                    </span>
                  </div>
                ))}
                {columnGuide.conditionallyRequired.map((column) => (
                  <div key={column} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      Required for this TC set: <span className="font-medium">{column}</span>
                    </span>
                  </div>
                ))}
              </div>

              {requiresProb && (
                <div className="rounded-lg border border-orange-200 bg-[#FFF7ED] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    <p className="text-xs font-medium text-orange-800 uppercase tracking-wide">
                      Probability-based metrics selected
                    </p>
                  </div>
                  <p className="text-sm text-orange-900">
                    The selected TC combination includes probability-based metrics, so the
                    <span className="font-medium"> {probColLabel}</span> group is required.
                  </p>
                </div>
              )}

              {columnGuide.optional.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <p className="text-xs font-medium text-slate-700 uppercase tracking-wide">Optional</p>
                  {columnGuide.optional.map((column) => (
                    <div key={column} className="text-sm text-slate-800">
                      {column}
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Validation notes</p>
                {columnGuide.notes.map((note) => (
                  <div key={note} className="text-sm text-muted-foreground">
                    {note}
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
                      Column names do not need to match the examples exactly. The next step can still map them.
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
        nextDisabled={!uploadedFile}
      />
    </div>
  );
}
