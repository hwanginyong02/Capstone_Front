import { useMemo, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { CheckCircle2, FileImage, FileText, Lightbulb, Upload, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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
import { getCsvExample, getJsonExample } from "../../data/templateExamples";
import { formatFileSize } from "../../utils/format/format";

export type DataUploadPhase = "evaluation" | "training";

// 디자인 시스템에 Textarea 컴포넌트가 없어 Input 스타일을 모사한 textarea 클래스
const TEXTAREA_CLASS =
  "border-input placeholder:text-muted-foreground flex w-full min-h-[80px] rounded-md border px-3 py-2 text-base bg-input-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

interface DataUploadProps {
  phase: DataUploadPhase;
  onPhaseChange: (phase: DataUploadPhase) => void;
  selectedMetricIds?: string[];
  taskType?: TaskType | "";
  datasetInfo: DatasetInfoFormData;
  onDatasetInfoChange: (
    value: DatasetInfoFormData | ((prev: DatasetInfoFormData) => DatasetInfoFormData),
  ) => void;
  uploadedFile: UploadedFileInfo | null;
  onUploadedFileChange: (value: UploadedFileInfo | null, rawFile?: File) => void;
  trainingExampleFiles: UploadedFileInfo[];
  onTrainingExampleFilesChange: (
    value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[]),
  ) => void;
  trainingUnsuitableExampleFiles: UploadedFileInfo[];
  onTrainingUnsuitableExampleFilesChange: (
    value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[]),
  ) => void;
}

export function isEvaluationDataUploadValid(
  datasetInfo: DatasetInfoFormData,
  uploadedFile: UploadedFileInfo | null,
) {
  return uploadedFile !== null;
}

export function isTrainingDatasetInfoValid(datasetInfo: DatasetInfoFormData) {
  return (
    datasetInfo.trainingDatasetName.trim() !== "" &&
    datasetInfo.trainingSampleCount.trim() !== "" &&
    datasetInfo.validationSampleCount.trim() !== ""
  );
}

export function DataUpload({
  phase,
  onPhaseChange,
  selectedMetricIds = [],
  taskType = "",
  datasetInfo,
  onDatasetInfoChange,
  uploadedFile,
  onUploadedFileChange,
  trainingExampleFiles,
  onTrainingExampleFilesChange,
  trainingUnsuitableExampleFiles,
  onTrainingUnsuitableExampleFilesChange,
}: DataUploadProps) {
  const evaluationInputRef = useRef<HTMLInputElement>(null);
  const trainingExampleInputRef = useRef<HTMLInputElement>(null);
  const trainingUnsuitableExampleInputRef = useRef<HTMLInputElement>(null);
  const resolvedTaskType = taskType || "multiclass";
  const requiresProb = selectionRequiresProbability(resolvedTaskType, selectedMetricIds);
  const requiredColumns = useMemo(
    () => getRequiredColumnsForSelection(resolvedTaskType, selectedMetricIds),
    [resolvedTaskType, selectedMetricIds],
  );
  const csvExample = getCsvExample(resolvedTaskType, requiresProb);
  const jsonExample = getJsonExample(resolvedTaskType, requiresProb);
  const trainingCount = Number(datasetInfo.trainingSampleCount);
  const validationCount = Number(datasetInfo.validationSampleCount);
  const hasDatasetCounts = Number.isFinite(trainingCount) && Number.isFinite(validationCount) && trainingCount >= 0 && validationCount >= 0;
  const totalCount = hasDatasetCounts ? trainingCount + validationCount : null;
  const trainingRatio = hasDatasetCounts && totalCount ? trainingCount / totalCount : null;
  const validationRatio = hasDatasetCounts && totalCount ? validationCount / totalCount : null;

  const updateDatasetInfo = <K extends keyof DatasetInfoFormData>(
    field: K,
    value: DatasetInfoFormData[K],
  ) => {
    onDatasetInfoChange((prev) => ({ ...prev, [field]: value }));
  };

  const handleEvaluationFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onUploadedFileChange(toUploadedFileInfo(file), file);
  };

  const handleTrainingExampleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const info = await toUploadedFileInfoAsync(file);
    onTrainingExampleFilesChange((prev) => [...prev, info]);
    event.target.value = "";
  };

  const handleTrainingUnsuitableExampleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const info = await toUploadedFileInfoAsync(file);
    onTrainingUnsuitableExampleFilesChange((prev) => [...prev, info]);
    event.target.value = "";
  };

  const removeEvaluationFile = () => {
    onUploadedFileChange(null);
    if (evaluationInputRef.current) {
      evaluationInputRef.current.value = "";
    }
  };

  const removeTrainingExampleFile = (index: number) => {
    onTrainingExampleFilesChange((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const removeTrainingUnsuitableExampleFile = (index: number) => {
    onTrainingUnsuitableExampleFilesChange((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleEvaluationFileDrop = async (file: File) => {
    const info = await toUploadedFileInfoAsync(file);
    onUploadedFileChange(info, file);
  };

  const handleTrainingExampleFileDrop = async (file: File) => {
    const info = await toUploadedFileInfoAsync(file);
    onTrainingExampleFilesChange((prev) => [...prev, info]);
  };

  const handleTrainingUnsuitableFileDrop = async (file: File) => {
    const info = await toUploadedFileInfoAsync(file);
    onTrainingUnsuitableExampleFilesChange((prev) => [...prev, info]);
  };

  return (
    <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Data upload</h1>
        <p className="text-sm text-muted-foreground">
          Upload the evaluation data first, then enter the training dataset information used to build the model.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PhaseButton
          active={phase === "evaluation"}
          complete={isEvaluationDataUploadValid(datasetInfo, uploadedFile)}
          label="1. Evaluation data"
          description="File with id, ground truth, prediction, and optional latency"
          onClick={() => onPhaseChange("evaluation")}
        />
        <PhaseButton
          active={phase === "training"}
          complete={isTrainingDatasetInfoValid(datasetInfo)}
          label="2. Training dataset"
          description="Dataset summary and example file for the final report"
          onClick={() => onPhaseChange("training")}
        />
      </div>

      {phase === "evaluation" ? (
        <EvaluationDataSection
          datasetInfo={datasetInfo}
          updateDatasetInfo={updateDatasetInfo}
          uploadedFile={uploadedFile}
          onFileChange={handleEvaluationFileChange}
          onFileRemove={removeEvaluationFile}
          openFilePicker={() => evaluationInputRef.current?.click()}
          onFileDrop={handleEvaluationFileDrop}
          inputRef={evaluationInputRef}
          requiredColumns={requiredColumns}
          csvExample={csvExample}
          jsonExample={jsonExample}
          resolvedTaskType={resolvedTaskType}
          requiresProb={requiresProb}
        />
      ) : (
        <TrainingDatasetSection
          datasetInfo={datasetInfo}
          updateDatasetInfo={updateDatasetInfo}
          trainingExampleFiles={trainingExampleFiles}
          onFileChange={handleTrainingExampleFileChange}
          onFileRemove={removeTrainingExampleFile}
          openFilePicker={() => trainingExampleInputRef.current?.click()}
          onExampleFileDrop={handleTrainingExampleFileDrop}
          inputRef={trainingExampleInputRef}
          hasDatasetCounts={hasDatasetCounts}
          totalCount={totalCount}
          trainingRatio={trainingRatio}
          validationRatio={validationRatio}
          trainingUnsuitableExampleFiles={trainingUnsuitableExampleFiles}
          onUnsuitableFileChange={handleTrainingUnsuitableExampleFileChange}
          onUnsuitableFileRemove={removeTrainingUnsuitableExampleFile}
          openUnsuitableFilePicker={() => trainingUnsuitableExampleInputRef.current?.click()}
          onUnsuitableFileDrop={handleTrainingUnsuitableFileDrop}
          unsuitableInputRef={trainingUnsuitableExampleInputRef}
        />
      )}
    </main>
  );
}

function EvaluationDataSection({
  datasetInfo,
  updateDatasetInfo,
  uploadedFile,
  onFileChange,
  onFileRemove,
  openFilePicker,
  onFileDrop,
  inputRef,
  requiredColumns,
  csvExample,
  jsonExample,
  resolvedTaskType,
  requiresProb,
}: {
  datasetInfo: DatasetInfoFormData;
  updateDatasetInfo: <K extends keyof DatasetInfoFormData>(field: K, value: DatasetInfoFormData[K]) => void;
  uploadedFile: UploadedFileInfo | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: () => void;
  openFilePicker: () => void;
  onFileDrop: (file: File) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  requiredColumns: Array<{ code: string; label: string; description: string }>;
  csvExample: string;
  jsonExample: string;
  resolvedTaskType: TaskType;
  requiresProb: boolean;
}) {
  return (
    <div className="space-y-6">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,application/json,text/csv"
        className="hidden"
        onChange={onFileChange}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Template examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{TASK_TYPE_LABELS[resolvedTaskType]}</Badge>
            {requiresProb && <Badge variant="outline">probability columns required</Badge>}
            <Badge variant="outline">inference_time_ms optional</Badge>
          </div>
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
          <div className="rounded-md border border-border bg-muted/60 p-3">
            <p className="text-sm text-muted-foreground">
              `inference_time_ms` is optional. Include it when you want the final report to summarize inference latency.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Evaluation dataset information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Upload a CSV or JSON file that contains sample id, ground truth, predicted label, and optional latency values.
          </p>
        </CardContent>
      </Card>

      {!uploadedFile ? (
        <UploadDropzone
          icon={<Upload className="h-12 w-12 text-muted-foreground mb-4" />}
          title="Click to choose evaluation data"
          description="CSV or JSON, up to 100MB"
          onClick={openFilePicker}
          onFileDrop={onFileDrop}
        />
      ) : (
        <SelectedFileCard
          file={uploadedFile}
          icon={<FileText className="h-10 w-10 text-primary" />}
          onChooseAnother={openFilePicker}
          onRemove={onFileRemove}
        />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Required columns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These are the columns required by the selected metrics. Latency is intentionally separated because it is optional.
          </p>

          <div className="space-y-3">
            {requiredColumns.length === 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Select one or more metrics first to see the exact required columns here.
              </div>
            )}

            {requiredColumns.map((column) => (
              <div key={column.code} className="rounded-lg border border-green-200 bg-[#F0FDF4] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{column.code}</Badge>
                  <span className="text-sm font-semibold text-slate-900">{column.label}</span>
                </div>
                <p className="text-sm text-slate-700">{getColumnHelpText(column.code, column.description)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Optional latency column</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">inference_time_ms</Badge>
              <span className="text-sm font-semibold text-slate-900">Inference latency</span>
            </div>
            <p className="text-sm text-slate-700">
              Add one latency value per sample in milliseconds if you want the report to include mean, P95, P99, max, and min latency metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrainingDatasetSection({
  datasetInfo,
  updateDatasetInfo,
  trainingExampleFiles,
  onFileChange,
  onFileRemove,
  openFilePicker,
  onExampleFileDrop,
  inputRef,
  hasDatasetCounts,
  totalCount,
  trainingRatio,
  validationRatio,
  trainingUnsuitableExampleFiles,
  onUnsuitableFileChange,
  onUnsuitableFileRemove,
  openUnsuitableFilePicker,
  onUnsuitableFileDrop,
  unsuitableInputRef,
}: {
  datasetInfo: DatasetInfoFormData;
  updateDatasetInfo: <K extends keyof DatasetInfoFormData>(field: K, value: DatasetInfoFormData[K]) => void;
  trainingExampleFiles: UploadedFileInfo[];
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (index: number) => void;
  openFilePicker: () => void;
  onExampleFileDrop: (file: File) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  hasDatasetCounts: boolean;
  totalCount: number | null;
  trainingRatio: number | null;
  validationRatio: number | null;
  trainingUnsuitableExampleFiles: UploadedFileInfo[];
  onUnsuitableFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onUnsuitableFileRemove: (index: number) => void;
  openUnsuitableFilePicker: () => void;
  onUnsuitableFileDrop: (file: File) => void;
  unsuitableInputRef: RefObject<HTMLInputElement | null>;
}) {
  const trainCountLabel = Number.isFinite(Number(datasetInfo.trainingSampleCount)) && datasetInfo.trainingSampleCount.trim() !== ""
    ? Number(datasetInfo.trainingSampleCount).toLocaleString()
    : "-";
  const valCountLabel = Number.isFinite(Number(datasetInfo.validationSampleCount)) && datasetInfo.validationSampleCount.trim() !== ""
    ? Number(datasetInfo.validationSampleCount).toLocaleString()
    : "-";

  return (
    <div className="space-y-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.csv,.json,application/json,text/csv"
        className="hidden"
        onChange={onFileChange}
      />
      <input
        ref={unsuitableInputRef}
        type="file"
        accept="image/*,.csv,.json,application/json,text/csv"
        className="hidden"
        onChange={onUnsuitableFileChange}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Training dataset information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Enter the dataset information used to train the model. This will later support the training data example section in the test report.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Training dataset name" required>
              <Input
                value={datasetInfo.trainingDatasetName}
                onChange={(event) => updateDatasetInfo("trainingDatasetName", event.target.value)}
                placeholder="e.g. Product defect image training set"
              />
            </Field>
            <Field label="Training data format">
              <Input
                value={datasetInfo.trainingDataFormat}
                onChange={(event) => updateDatasetInfo("trainingDataFormat", event.target.value)}
                placeholder="e.g. Structured CSV, image (JPG/PNG), text"
              />
            </Field>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <div>
              <div className="text-sm font-semibold text-foreground">Dataset sample counts</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter how many samples were used for training and how many are included in the evaluation upload.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Training samples" required>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={datasetInfo.trainingSampleCount}
                  onChange={(event) => updateDatasetInfo("trainingSampleCount", event.target.value.replace(/\D/g, ''))}
                  placeholder="1161"
                />
              </Field>
              <Field label="Validation samples" required>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={datasetInfo.validationSampleCount}
                  onChange={(event) => updateDatasetInfo("validationSampleCount", event.target.value.replace(/\D/g, ''))}
                  placeholder="291"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <SampleCountCard label="Total samples" value={hasDatasetCounts && totalCount !== null ? totalCount.toLocaleString() : "-"} />
              <SampleCountCard label="Training samples" value={trainCountLabel} />
              <SampleCountCard label="Validation samples" value={valCountLabel} />
            </div>
            {hasDatasetCounts && totalCount !== null && totalCount > 0 && (
              <div className="text-xs text-muted-foreground">
                Train/Val ratio {trainingRatio?.toFixed(2)} / {validationRatio?.toFixed(2)}
              </div>
            )}
          </div>

          <Field label="Class distribution">
            <textarea
              className={TEXTAREA_CLASS}
              rows={3}
              value={datasetInfo.trainingClassDistribution}
              onChange={(event) => updateDatasetInfo("trainingClassDistribution", event.target.value)}
              placeholder="Per-class sample counts or ratios, e.g. cat 5,000 / dog 5,000 / bird 3,000"
            />
          </Field>

          <Field label="Training data description / notes">
            <textarea
              className={TEXTAREA_CLASS}
              rows={3}
              value={datasetInfo.trainingDataDescription}
              onChange={(event) => updateDatasetInfo("trainingDataDescription", event.target.value)}
              placeholder="How the training data was collected, labeled, or preprocessed (optional)"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Training data example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-muted/60 p-3 flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Upload a representative valid training sample that clearly matches the dataset definition.</p>
              <p>You can also add an optional edge or unsuitable example, such as a blurry image, wrong class, corrupted sample, or out-of-scope input, to document what should be excluded or reviewed.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ExampleUploadSlot
              title="Representative valid example"
              description="A clear sample that should be included in the training dataset."
              files={trainingExampleFiles}
              onChoose={openFilePicker}
              onRemove={onFileRemove}
              onFileDrop={onExampleFileDrop}
            />
            <ExampleUploadSlot
              title="Edge or unsuitable example"
              description="Optional sample that should be excluded, reviewed, or treated with caution."
              files={trainingUnsuitableExampleFiles}
              onChoose={openUnsuitableFilePicker}
              onRemove={onUnsuitableFileRemove}
              onFileDrop={onUnsuitableFileDrop}
              optional
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PhaseButton({
  active,
  complete,
  label,
  description,
  onClick,
}: {
  active: boolean;
  complete: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-colors ${
        active ? "border-primary bg-blue-50" : "border-border bg-card hover:bg-muted/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        </div>
        {complete && <CheckCircle2 className="h-4 w-4 text-green-600" />}
      </div>
    </button>
  );
}

function SampleCountCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function ExampleUploadSlot({
  title,
  description,
  files,
  onChoose,
  onRemove,
  onFileDrop,
  optional = false,
}: {
  title: string;
  description: string;
  files: UploadedFileInfo[];
  onChoose: () => void;
  onRemove: (index: number) => void;
  onFileDrop?: (file: File) => void;
  optional?: boolean;
}) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileDrop?.(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-foreground">{title}</div>
            {optional && <Badge variant="outline">Optional</Badge>}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>

      {files.length === 0 ? (
        <button
          type="button"
          onClick={onChoose}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex min-h-[160px] w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-blue-50/30 ${
            isDragActive ? "border-primary bg-blue-50" : ""
          }`}
        >
          <FileImage className="mb-3 h-9 w-9 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Choose example file</span>
          <span className="mt-1 text-xs text-muted-foreground">Image, CSV, or JSON sample</span>
        </button>
      ) : (
        <div className="space-y-3">
          {files.map((file, index) => (
            <SelectedFileCard
              key={`${file.name}-${index}`}
              file={file}
              icon={<FileImage className="h-10 w-10 text-primary" />}
              onChooseAnother={undefined}
              onRemove={() => onRemove(index)}
            />
          ))}
          <Button variant="outline" size="sm" onClick={onChoose}>
            <Upload className="mr-2 h-4 w-4" />
            Add another file
          </Button>
        </div>
      )}
    </div>
  );
}

function UploadDropzone({
  icon,
  title,
  description,
  onClick,
  onFileDrop,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  onFileDrop?: (file: File) => void;
}) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileDrop?.(e.dataTransfer.files[0]);
    }
  };

  return (
    <Card
      className={`border-2 border-dashed border-border hover:border-primary hover:bg-blue-50/30 transition-colors cursor-pointer ${
        isDragActive ? "border-primary bg-blue-50" : ""
      }`}
      onClick={onClick}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center min-h-[240px] py-12">
        {icon}
        <h3 className="text-base font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function SelectedFileCard({
  file,
  icon,
  onChooseAnother,
  onRemove,
}: {
  file: UploadedFileInfo;
  icon: ReactNode;
  onChooseAnother?: () => void;
  onRemove: () => void;
}) {
  return (
    <Card className="border-2 border-border">
      <CardContent className="flex items-center justify-between min-h-[120px] py-6">
        <div className="flex items-center gap-4">
          {icon}
          <div>
            <div className="font-semibold text-sm mb-1">{file.name}</div>
            <div className="text-xs text-muted-foreground mb-2">
              {file.size} {file.type !== "unknown" ? `| ${file.type}` : ""}
            </div>
            {onChooseAnother && (
              <button
                type="button"
                onClick={onChooseAnother}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Choose another file
              </button>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
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

function getColumnHelpText(code: string, fallback: string) {
  if (code === "id") {
    return "Use this column to uniquely identify each evaluation sample. Every row should have a stable, non-duplicated identifier.";
  }
  if (code === "y_true") {
    return "This column contains the ground-truth answer for each sample. For multi-label data, put the full true label set in a consistent format such as sports|news.";
  }
  if (code === "y_pred") {
    return "This column contains the model prediction for each sample. For multi-label data, put the full predicted label set in the same format as y_true.";
  }
  if (code === "score") {
    return "This column stores a confidence score, usually for the positive class in binary classification.";
  }
  if (code === "prob_class_*") {
    return "Provide one probability column per class, such as prob_cat, prob_dog, and prob_bird.";
  }
  if (code === "prob_label_*") {
    return "Provide one probability column per label in the multi-label setting.";
  }
  return fallback;
}

function toUploadedFileInfo(file: File): UploadedFileInfo {
  return {
    name: file.name,
    size: formatFileSize(file.size),
    type: file.type || "unknown",
  };
}

async function toUploadedFileInfoAsync(file: File): Promise<UploadedFileInfo> {
  let previewUrl: string | undefined = undefined;
  if (file.type.startsWith("image/")) {
    previewUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  }
  return {
    name: file.name,
    size: formatFileSize(file.size),
    type: file.type || "unknown",
    previewUrl,
  };
}
