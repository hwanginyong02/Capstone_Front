/**
 * ⑥ 학습 데이터의 예시 파일 — 대표 예시와 경계·부적합 예시.
 *
 * 종전에는 Details 의 학습 데이터셋 폼 아래에 있었다. 그 폼의 이름·건수·클래스 분포·형식이
 * ⑥ 카드와 겹쳐 폼을 ⑥ 으로 합쳤고(persist v10), 예시 파일도 따라 학습 데이터 단계의 ⑥ 카드
 * 아래로 왔다. 레지스트리에 파일 칸이 없어 카드 폼과 따로 그린다.
 */
import { useRef, useState, type ChangeEvent } from "react";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { UploadedFileInfo } from "../../types/workflow.types";
import { ExampleUploadSlot, toUploadedFileInfoAsync } from "../data-upload/shared";
import {
  EXAMPLE_FILE_ACCEPT,
  EXAMPLE_PREVIEW_BUDGET_BYTES,
  previewBudgetMessage,
  previewBytes,
  splitExampleFiles,
} from "../../utils/image/examplePreview";

type FilesSetter = (value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[])) => void;

interface TrainingExamplesSectionProps {
  trainingExampleFiles: UploadedFileInfo[];
  onTrainingExampleFilesChange: (
    value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[]),
  ) => void;
  trainingUnsuitableExampleFiles: UploadedFileInfo[];
  onTrainingUnsuitableExampleFilesChange: (
    value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[]),
  ) => void;
  /**
   * 칸마다 평가 흐름에 넣었는지(⑥ 적합·부적합 예시 파일 — 둘 다 선택 항목). 넣지 않은 칸은 그리지 않는다.
   * 둘 다 빼면 페이지가 이 절을 그리지 않는다. 기본값은 둘 다 보임(평가 흐름 이전 상태).
   */
  showValid?: boolean;
  showUnsuitable?: boolean;
}

export function TrainingExamplesSection({
  trainingExampleFiles,
  onTrainingExampleFilesChange,
  trainingUnsuitableExampleFiles,
  onTrainingUnsuitableExampleFilesChange,
  showValid = true,
  showUnsuitable = true,
}: TrainingExamplesSectionProps) {
  const exampleInputRef = useRef<HTMLInputElement>(null);
  const unsuitableInputRef = useRef<HTMLInputElement>(null);

  /** 형식이 맞지 않아 뺀 파일 이름 — 마지막으로 고르거나 놓은 묶음의 것. */
  const [rejectedNames, setRejectedNames] = useState<string[]>([]);

  /**
   * 고르거나 놓은 파일을 모두 받는다(B15 — 종전에는 첫 파일 하나만). 이미지·CSV·JSON 이 아니면 이름을 알리고
   * 뺀다. 축소본을 파일마다 차례로 만들어 고른 순서를 지키고, 다 만든 뒤 한 번에 더한다.
   */
  const addExamples = async (files: readonly File[], setter: FilesSetter) => {
    const { accepted, rejected } = splitExampleFiles(files);
    setRejectedNames(rejected.map((file) => file.name));
    const infos: UploadedFileInfo[] = [];
    for (const file of accepted) infos.push(await toUploadedFileInfoAsync(file));
    if (infos.length > 0) setter((prev) => [...prev, ...infos]);
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>, setter: FilesSetter) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    void addExamples(files, setter);
    event.target.value = "";
  };

  // 넣지 않은 칸의 파일은 성적서에 실리지 않는다(`buildReportInput`) — 안내도 보이는 칸만 센다.
  const allExamples = [
    ...(showValid ? trainingExampleFiles : []),
    ...(showUnsuitable ? trainingUnsuitableExampleFiles : []),
  ];
  // 브라우저가 그릴 수 없는 이미지(HEIC 등) — 성적서에는 파일명과 크기만 적힌다.
  const withoutPreview = allExamples.filter((f) => f.type.startsWith("image/") && !f.previewUrl);
  const totalPreviewBytes = previewBytes(allExamples);
  const overBudget = totalPreviewBytes > EXAMPLE_PREVIEW_BUDGET_BYTES;

  return (
    <div className="space-y-6">
      <input
        ref={exampleInputRef}
        type="file"
        multiple
        accept={EXAMPLE_FILE_ACCEPT}
        aria-label="적합 예시 파일"
        className="hidden"
        onChange={(event) => onPick(event, onTrainingExampleFilesChange)}
      />
      <input
        ref={unsuitableInputRef}
        type="file"
        multiple
        accept={EXAMPLE_FILE_ACCEPT}
        aria-label="부적합 예시 파일"
        className="hidden"
        onChange={(event) => onPick(event, onTrainingUnsuitableExampleFilesChange)}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">학습 데이터 예시</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-muted/60 p-3 flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>데이터셋 정의에 맞는 대표 학습 샘플을 올리세요.</p>
              <p>빼거나 검토해야 할 경계·부적합 예시도 함께 올려 기록할 수 있습니다.</p>
            </div>
          </div>

          <div className={showValid && showUnsuitable ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : "grid grid-cols-1 gap-4"}>
            {showValid && (
              <ExampleUploadSlot
                title="적합 예시"
                description="학습 데이터셋에 들어가야 할 분명한 샘플입니다."
                files={trainingExampleFiles}
                onChoose={() => exampleInputRef.current?.click()}
                onRemove={(index) =>
                  onTrainingExampleFilesChange((prev) => prev.filter((_, i) => i !== index))
                }
                onFilesDrop={(files) => void addExamples(files, onTrainingExampleFilesChange)}
                optional
              />
            )}
            {showUnsuitable && (
              <ExampleUploadSlot
                title="부적합 예시"
                description="빼거나, 검토하거나, 조심해서 다뤄야 할 샘플입니다."
                files={trainingUnsuitableExampleFiles}
                onChoose={() => unsuitableInputRef.current?.click()}
                onRemove={(index) =>
                  onTrainingUnsuitableExampleFilesChange((prev) => prev.filter((_, i) => i !== index))
                }
                onFilesDrop={(files) => void addExamples(files, onTrainingUnsuitableExampleFilesChange)}
                optional
              />
            )}
          </div>

          {withoutPreview.length > 0 && (
            <p role="note" className="text-sm text-muted-foreground">
              미리보기를 만들 수 없는 이미지 형식입니다: {withoutPreview.map((f) => f.name).join(", ")}. 성적서에는
              파일명과 크기만 적힙니다. JPG·PNG 로 바꿔 올리면 이미지도 찍힙니다.
            </p>
          )}
          {rejectedNames.length > 0 && (
            <p role="alert" className="text-sm text-destructive">
              올릴 수 없는 형식이라 뺐습니다: {rejectedNames.join(", ")}. 이미지·CSV·JSON 파일만 올릴 수 있어요.
            </p>
          )}
          {overBudget && (
            <p role="note" className="text-sm text-destructive">
              {previewBudgetMessage(totalPreviewBytes)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
