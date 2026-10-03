/**
 * 평가 데이터 업로드 (평가 구간 1단계).
 *
 * **지표 선택보다 앞선다.** 그래서 "선택한 지표가 요구하는 컬럼"을 보여줄 수 없고,
 * `getRequiredColumnsForTaskType` 로 **분류 유형이 쓸 수 있는 컬럼 전체**를 안내한다.
 * 확률 컬럼을 포함한 예시를 기본으로 보여주는 것도 같은 이유다 — 나중에 "확률이 없어서
 * AUROC 를 못 쓴다"를 알게 되는 것보다, 처음에 넣을 수 있게 알려주는 편이 낫다.
 *
 * 학습 데이터셋 정보는 이 화면에 없다. 평가에 쓰이지 않고 성적서 3절을 채우는 값이라
 * 성적서 구간으로 옮겼다(docs/WORKFLOW_REDESIGN.md).
 *
 * **모델명·버전만은 예외적으로 여기 남는다.** 나머지 기관 정보와 함께 성적서 구간으로
 * 보냈더니, 평가만 하고 끝낸 run 이 전부 `"Untitled model"` 로 저장됐다. 그러면
 * 워크스페이스에서 모델별로 묶을 수도, 버전 간 성능을 비교할 수도 없다 — 이 둘은
 * 성적서 서식용 값이 아니라 **평가 결과를 식별하는 이름표**다.
 */
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, FileText, Upload } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  getRequiredColumnsForTaskType,
  TASK_TYPE_LABELS,
  type TaskType,
} from "../../data/evaluationData";
import type { UploadedFileInfo } from "../../types/workflow.types";
import {
  getComposerColumnNote,
  getComposerCsvExample,
  getComposerJsonExample,
} from "../../data/templateExamples";
import { MAX_UPLOAD_LABEL, checkUploadSize } from "../../lib/upload/uploadLimits";
import {
  Field,
  SelectedFileCard,
  UploadDropzone,
  toUploadedFileInfo,
  toUploadedFileInfoAsync,
} from "./shared";

interface DataUploadProps {
  taskType: TaskType | "";
  uploadedFile: UploadedFileInfo | null;
  onUploadedFileChange: (value: UploadedFileInfo | null, rawFile?: File) => void;
  modelName: string;
  versionName: string;
  onModelNameChange: (value: string) => void;
  onVersionNameChange: (value: string) => void;
  /**
   * 파일 **메타**는 복원됐지만 원본(File 객체)이 없는 상태.
   * 과거 평가를 편집하거나 새로고침한 뒤에 생긴다(ISSUES.md E-01·E-09).
   */
  needsReupload?: boolean;
}

/**
 * 다음 단계로 갈 수 있는가.
 *
 * **원본 File 객체가 있어야 한다.** 메타(`uploadedFile`)만 보면 안 된다 — 과거 평가를
 * 편집해 들어오면 메타는 복원되지만 원본은 복원할 수 없어서, 화면은 "파일 있음"으로
 * 보이는데 '다음'에서 "Evaluation file is missing" 이 뜬다(사용자 보고, 2026-09-19).
 *
 * 모델명·버전도 여기서 막는다. 빈 채로 통과하면 run 이 `"Untitled model"` 로 저장돼
 * 워크스페이스에서 다른 모델들과 한 덩어리로 묶인다 — 나중에 고칠 수단도 없다.
 */
export function isEvaluationDataUploadValid(
  uploadedFile: UploadedFileInfo | null,
  hasRawFile: boolean,
  modelName: string,
  versionName: string,
) {
  return (
    uploadedFile !== null &&
    hasRawFile &&
    modelName.trim() !== "" &&
    versionName.trim() !== ""
  );
}

export function DataUpload({
  taskType,
  uploadedFile,
  onUploadedFileChange,
  modelName,
  versionName,
  onModelNameChange,
  onVersionNameChange,
  needsReupload = false,
}: DataUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // 백엔드 상한(20 MiB)을 넘는 파일은 올리기 전에 막는다 — 종전에는 안내문이 100MB 라
  // 사용자가 전부 올린 뒤에야 413 을 봤다(G-04a·D-15).
  const [sizeError, setSizeError] = useState<string | null>(null);

  const resolvedTaskType: TaskType = taskType || "multiclass";
  const requiredColumns = useMemo(
    () => getRequiredColumnsForTaskType(resolvedTaskType),
    [resolvedTaskType],
  );
  // 성적서 구성 화면의 "예시 파일 보기" 와 같은 예시다.
  const csvExample = getComposerCsvExample(resolvedTaskType);
  const jsonExample = getComposerJsonExample(resolvedTaskType);

  const openFilePicker = () => inputRef.current?.click();

  const acceptFile = (file: File, info: UploadedFileInfo) => {
    const tooBig = checkUploadSize(file);
    if (tooBig) {
      setSizeError(tooBig);
      return false;
    }
    setSizeError(null);
    onUploadedFileChange(info, file);
    return true;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!acceptFile(file, toUploadedFileInfo(file))) {
      event.target.value = ""; // 같은 파일을 다시 고를 수 있게 비운다
    }
  };

  const handleFileDrop = async (file: File) => {
    acceptFile(file, await toUploadedFileInfoAsync(file));
  };

  const handleRemove = () => {
    onUploadedFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Data upload</h1>
        <p className="text-sm text-muted-foreground">
          Name the model you are evaluating and upload the file that holds its predictions. You will
          map its columns next.
        </p>
      </div>

      {/* 모델명·버전은 성적서 서식이 아니라 평가 결과의 이름표다. 워크스페이스는 이 이름으로
          평가를 모델별로 묶고, 버전별 성능 비교 화면도 여기서 갈라진다. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Evaluations that share a model name are grouped together, so you can compare versions of
            the same model later.
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Model name" required>
              <Input
                value={modelName}
                onChange={(event) => onModelNameChange(event.target.value)}
                placeholder="e.g. Surface defect detector"
              />
            </Field>
            <Field label="Version" required>
              <Input
                value={versionName}
                onChange={(event) => onVersionNameChange(event.target.value)}
                placeholder="e.g. v1.0.0"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {sizeError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{sizeError}</AlertDescription>
        </Alert>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,application/json,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 메타는 있는데 원본이 없는 상태를 "업로드 완료"로 보여주면 안 된다 — 사용자는
          파일이 있다고 믿고 '다음'을 눌렀다가 실패를 만난다(ISSUES.md E-01·E-09). */}
      {needsReupload && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your previous inputs were restored, but the data file itself must be uploaded again —
            browsers cannot keep the file.
            {uploadedFile ? ` Previous file: ${uploadedFile.name}` : ""}
          </AlertDescription>
        </Alert>
      )}

      {!uploadedFile || needsReupload ? (
        <UploadDropzone
          icon={<Upload className="h-12 w-12 text-muted-foreground mb-4" />}
          title={needsReupload ? "Upload the evaluation data again" : "Click to choose evaluation data"}
          description={`CSV or JSON, up to ${MAX_UPLOAD_LABEL}`}
          onClick={openFilePicker}
          onFileDrop={handleFileDrop}
        />
      ) : (
        <SelectedFileCard
          file={uploadedFile}
          icon={<FileText className="h-10 w-10 text-primary" />}
          onChooseAnother={openFilePicker}
          onRemove={handleRemove}
        />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Template examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{TASK_TYPE_LABELS[resolvedTaskType]}</Badge>
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
          {/* 성적서 구성 화면의 "예시 파일 보기" 와 같은 안내다 — 두 화면이 같은 말을 해야 한다. */}
          <p className="text-sm text-muted-foreground">{getComposerColumnNote(resolvedTaskType)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Columns you can map</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These are every column the {TASK_TYPE_LABELS[resolvedTaskType]} workflow can use. You do not
            need all of them — which metrics you can compute depends on what your file contains, and you
            will choose the metrics after mapping.
          </p>

          <div className="space-y-3">
            {requiredColumns.map((column) => (
              <div key={column.code} className="rounded-lg border border-green-200 bg-[#F0FDF4] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{column.code}</Badge>
                  <span className="text-sm font-semibold text-slate-900">{column.label}</span>
                </div>
                <p className="text-sm text-slate-700">
                  {getColumnHelpText(column.code, column.description)}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">inference_time_ms</Badge>
              <span className="text-sm font-semibold text-slate-900">Inference latency</span>
            </div>
            <p className="text-sm text-slate-700">
              Optional. Add one latency value per sample in milliseconds to include mean, P95, P99, max,
              and min latency in the report.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
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
