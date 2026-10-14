/**
 * ⑥ 학습 데이터의 예시 파일 — 대표 예시와 경계·부적합 예시.
 *
 * 종전에는 Details 의 학습 데이터셋 폼 아래에 있었다. 그 폼의 이름·건수·클래스 분포·형식이
 * ⑥ 카드와 겹쳐 폼을 ⑥ 으로 합쳤고(persist v10), 예시 파일도 따라 Data info 의 ⑥ 카드 아래로
 * 왔다. 레지스트리에 파일 칸이 없어 카드 폼과 따로 그린다.
 */
import { useRef, type ChangeEvent } from "react";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { UploadedFileInfo } from "../../types/workflow.types";
import { ExampleUploadSlot, toUploadedFileInfoAsync } from "../data-upload/shared";

interface TrainingExamplesSectionProps {
  trainingExampleFiles: UploadedFileInfo[];
  onTrainingExampleFilesChange: (
    value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[]),
  ) => void;
  trainingUnsuitableExampleFiles: UploadedFileInfo[];
  onTrainingUnsuitableExampleFilesChange: (
    value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[]),
  ) => void;
}

export function TrainingExamplesSection({
  trainingExampleFiles,
  onTrainingExampleFilesChange,
  trainingUnsuitableExampleFiles,
  onTrainingUnsuitableExampleFilesChange,
}: TrainingExamplesSectionProps) {
  const exampleInputRef = useRef<HTMLInputElement>(null);
  const unsuitableInputRef = useRef<HTMLInputElement>(null);

  const addExample = async (
    file: File,
    setter: (value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[])) => void,
  ) => {
    const info = await toUploadedFileInfoAsync(file);
    setter((prev) => [...prev, info]);
  };

  const onPick = (
    event: ChangeEvent<HTMLInputElement>,
    setter: (value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[])) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void addExample(file, setter);
    event.target.value = "";
  };

  return (
    <div className="space-y-6">
      <input
        ref={exampleInputRef}
        type="file"
        accept="image/*,.csv,.json,application/json,text/csv"
        className="hidden"
        onChange={(event) => onPick(event, onTrainingExampleFilesChange)}
      />
      <input
        ref={unsuitableInputRef}
        type="file"
        accept="image/*,.csv,.json,application/json,text/csv"
        className="hidden"
        onChange={(event) => onPick(event, onTrainingUnsuitableExampleFilesChange)}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Training data example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-muted/60 p-3 flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Upload a representative valid training sample that matches the dataset definition.</p>
              <p>
                You can also add an edge or unsuitable example to document what should be excluded or
                reviewed.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ExampleUploadSlot
              title="Representative valid example"
              description="A clear sample that should be included in the training dataset."
              files={trainingExampleFiles}
              onChoose={() => exampleInputRef.current?.click()}
              onRemove={(index) =>
                onTrainingExampleFilesChange((prev) => prev.filter((_, i) => i !== index))
              }
              onFileDrop={(file) => void addExample(file, onTrainingExampleFilesChange)}
            />
            <ExampleUploadSlot
              title="Edge or unsuitable example"
              description="Optional sample that should be excluded, reviewed, or treated with caution."
              files={trainingUnsuitableExampleFiles}
              onChoose={() => unsuitableInputRef.current?.click()}
              onRemove={(index) =>
                onTrainingUnsuitableExampleFilesChange((prev) => prev.filter((_, i) => i !== index))
              }
              onFileDrop={(file) => void addExample(file, onTrainingUnsuitableExampleFilesChange)}
              optional
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
