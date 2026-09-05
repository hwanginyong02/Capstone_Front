/**
 * 원본 데이터 파일이 없다는 사실을 알리고 4단계로 되돌린다.
 *
 * ISSUES.md E-01·E-09 — 워크플로우 입력은 이제 저장소에 남지만 **원본 파일(File 객체)은
 * 어떤 경우에도 복원할 수 없다.** 그래서 새로고침·과거 평가 편집 후에는 "입력은 돌아왔는데
 * 파일만 없는" 상태가 된다. 이 사실을 알리지 않으면 사용자는 5·6단계에서 원인 모를 실패를
 * 만난다(종전에는 그 신호가 6단계의 "업로드된 파일이 없습니다" 문구뿐이었다).
 */
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router";

import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { stepToPath, useWorkflowStore } from "../../utils/stores/useWorkflowStore";

export function FileReuploadNotice() {
  const navigate = useNavigate();
  const needsFileReupload = useWorkflowStore((s) => s.needsFileReupload);
  const uploadedFile = useWorkflowStore((s) => s.uploadedFile);
  const rawFile = useWorkflowStore((s) => s.rawFile);

  // 파일이 실제로 있으면 안내할 것이 없다.
  if (rawFile) return null;
  if (!needsFileReupload && !uploadedFile) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          입력한 내용은 복원됐지만 <strong>데이터 파일은 다시 올려야 합니다</strong>
          {uploadedFile ? ` (이전 파일: ${uploadedFile.name})` : ""}. 브라우저는 업로드한
          파일 자체를 보관하지 못합니다.
        </span>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => navigate(stepToPath(4))}
        >
          파일 다시 올리기
        </Button>
      </AlertDescription>
    </Alert>
  );
}
