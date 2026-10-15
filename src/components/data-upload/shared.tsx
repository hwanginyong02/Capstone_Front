/**
 * 업로드 화면 공용 부품.
 *
 * 종전에는 전부 `DataUpload.tsx`(827줄) 안에 있었다. 워크플로우 재배치로 평가 데이터
 * 업로드(평가 구간 1단계)와 학습 데이터셋 정보(성적서 구간)가 서로 다른 화면으로
 * 갈라지면서, 양쪽이 함께 쓰는 것만 여기로 뺐다.
 */
import { useState, type ReactNode } from "react";
import { FileImage, Upload, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import type { UploadedFileInfo } from "../../types/workflow.types";
import { formatFileSize } from "../../utils/format/format";

/** 디자인 시스템에 Textarea 컴포넌트가 없어 Input 스타일을 모사한 textarea 클래스 */
export const TEXTAREA_CLASS =
  "border-input placeholder:text-muted-foreground flex w-full min-h-[80px] rounded-md border px-3 py-2 text-base bg-input-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export function toUploadedFileInfo(file: File): UploadedFileInfo {
  return {
    name: file.name,
    size: formatFileSize(file.size),
    type: file.type || "unknown",
  };
}

/** 이미지면 미리보기 URL 까지 붙여 돌려준다. */
export async function toUploadedFileInfoAsync(file: File): Promise<UploadedFileInfo> {
  let previewUrl: string | undefined = undefined;
  if (file.type.startsWith("image/")) {
    previewUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  }
  return { ...toUploadedFileInfo(file), previewUrl };
}

export function Field({
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
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function SampleCountCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

export function UploadDropzone({
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
      className={`border-2 border-dashed border-border hover:border-primary hover:bg-primary-subtle transition-colors cursor-pointer ${
        isDragActive ? "border-primary bg-primary-subtle" : ""
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

export function SelectedFileCard({
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
                다른 파일 고르기
              </button>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8" aria-label="파일 지우기">
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function ExampleUploadSlot({
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
            {optional && <Badge variant="outline">선택</Badge>}
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
          className={`flex min-h-[160px] w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary-subtle ${
            isDragActive ? "border-primary bg-primary-subtle" : ""
          }`}
        >
          <FileImage className="mb-3 h-9 w-9 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">예시 파일 고르기</span>
          <span className="mt-1 text-xs text-muted-foreground">이미지, CSV, JSON 샘플</span>
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
            파일 더 올리기
          </Button>
        </div>
      )}
    </div>
  );
}
