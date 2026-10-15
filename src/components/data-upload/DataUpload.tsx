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
  TASK_TYPE_LABELS_KO,
  type TaskType,
} from "../../data/evaluationData";
import type { UploadedFileInfo } from "../../types/workflow.types";
import {
  getComposerColumnNote,
  getComposerJsonExample,
} from "../../data/templateExamples";
import { CsvExampleViewer } from "./CsvExampleViewer";
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
  // JSON 예시만 문자열로 쓴다. CSV 는 CsvExampleViewer 가 표로 그린다.
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
        <h1 className="text-2xl font-bold text-foreground mb-2">평가 데이터</h1>
        <p className="text-sm text-muted-foreground">
          평가할 모델의 이름을 적고 예측 결과가 담긴 파일을 올리세요. 다음 단계에서 컬럼을
          매핑합니다.
        </p>
      </div>

      {/* 모델명·버전은 평가 결과의 이름표다 — 워크스페이스 목록과 성적서 2절에 이 이름으로 찍힌다. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">모델</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            모델 이름과 버전은 워크스페이스에서 이 평가를 가리키는 이름이고, 성적서에도 적힙니다.
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="모델 이름" required>
              <Input
                value={modelName}
                onChange={(event) => onModelNameChange(event.target.value)}
                placeholder="예: 표면 결함 검출기"
              />
            </Field>
            <Field label="버전" required>
              <Input
                value={versionName}
                onChange={(event) => onVersionNameChange(event.target.value)}
                placeholder="예: v1.0.0"
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
            앞서 적은 내용은 되살렸지만, 데이터 파일은 브라우저가 보관하지 못해 다시 올려야 합니다.
            {uploadedFile ? ` 이전 파일: ${uploadedFile.name}` : ""}
          </AlertDescription>
        </Alert>
      )}

      {!uploadedFile || needsReupload ? (
        <UploadDropzone
          icon={<Upload className="h-12 w-12 text-muted-foreground mb-4" />}
          title={needsReupload ? "평가 데이터를 다시 올리세요" : "눌러서 평가 데이터 고르기"}
          description={`CSV 또는 JSON, ${MAX_UPLOAD_LABEL} 이하`}
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
          <CardTitle className="text-lg font-semibold">파일 예시</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{TASK_TYPE_LABELS_KO[resolvedTaskType]}</Badge>
          </div>
          <Tabs defaultValue="csv" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="csv">CSV</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="csv">
              {/* 표로 그린다 — 줄글 덩어리로 두면 쉼표를 세어야 어느 칸이 비었는지 알 수 있다.
                  안내는 아래에 한 번만 쓰므로 여기서는 끈다. */}
              <CsvExampleViewer taskType={resolvedTaskType} showNote={false} />
            </TabsContent>
            <TabsContent value="json">
              <div className="bg-muted rounded-md p-4">
                <pre className="text-xs font-mono overflow-x-auto whitespace-pre">{jsonExample}</pre>
              </div>
            </TabsContent>
          </Tabs>
          <p className="text-sm text-muted-foreground">{getComposerColumnNote(resolvedTaskType)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">매핑할 수 있는 컬럼</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {TASK_TYPE_LABELS_KO[resolvedTaskType]}에서 쓸 수 있는 컬럼 전부입니다. 모두 있어야 하는 것은
            아닙니다. 계산할 수 있는 지표는 파일에 어떤 컬럼이 있는지에 따라 달라집니다.
          </p>

          <div className="space-y-3">
            {requiredColumns.map((column) => (
              <div key={column.code} className="rounded-lg border border-success-border bg-success-subtle p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{column.code}</Badge>
                  <span className="text-sm font-semibold text-foreground">{column.label}</span>
                </div>
                <p className="text-sm text-foreground-secondary">
                  {getColumnHelpText(column.code, column.description)}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary-subtle p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">inference_time_ms</Badge>
              <span className="text-sm font-semibold text-foreground">추론 응답시간</span>
            </div>
            <p className="text-sm text-foreground-secondary">
              선택. 샘플마다 응답시간을 밀리초로 하나씩 넣으면 성적서에 평균·P95·P99·최대·최소
              응답시간이 들어갑니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function getColumnHelpText(code: string, fallback: string) {
  if (code === "id") {
    return "평가 샘플마다 고유하게 가리키는 컬럼입니다. 모든 행에 겹치지 않는 식별자가 있어야 합니다.";
  }
  if (code === "y_true") {
    return "샘플마다 정답이 들어 있는 컬럼입니다. 멀티레이블이면 정답 레이블 묶음을 sports|news 처럼 한 가지 형식으로 적습니다.";
  }
  if (code === "y_pred") {
    return "샘플마다 모델의 예측이 들어 있는 컬럼입니다. 멀티레이블이면 예측 레이블 묶음을 y_true 와 같은 형식으로 적습니다.";
  }
  if (code === "score") {
    return "확신 점수를 담는 컬럼입니다. 이진 분류에서는 보통 양성 클래스의 점수입니다.";
  }
  if (code === "prob_class_*") {
    return "클래스마다 확률 컬럼을 하나씩 둡니다. 예: prob_cat, prob_dog, prob_bird";
  }
  if (code === "prob_label_*") {
    return "멀티레이블에서는 레이블마다 확률 컬럼을 하나씩 둡니다.";
  }
  return fallback;
}
