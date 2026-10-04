/**
 * 선택한 분류 유형의 예시 파일을 **표로** 보여준다.
 *
 * 두 화면이 함께 쓴다 — 성적서 구성 화면 ① 의 "예시 파일 보기"와 업로드 화면의
 * "Template examples". 같은 파일을 설명하는 자리라 같은 모양이어야 한다.
 *
 * 표로 그리는 이유: 컬럼이 세로로 맞아야 어느 칸이 비었는지(멀티레이블의 "레이블 없음")
 * 눈에 들어온다. 줄글 덩어리로 두면 쉼표를 세어야 한다.
 *
 * 예시 문자열은 `data/templateExamples.ts` 가 들고 있다.
 */
import { getComposerColumnNote, getComposerCsvExample } from "../../data/templateExamples";
import type { TaskType } from "../../data/evaluationData";

interface CsvExampleViewerProps {
  taskType: TaskType;
  /** 표 아래 필수 컬럼 안내. 호출하는 쪽이 이미 같은 안내를 쓰고 있으면 끈다. */
  showNote?: boolean;
}

export function CsvExampleViewer({ taskType, showNote = true }: CsvExampleViewerProps) {
  const rows = getComposerCsvExample(taskType)
    .split("\n")
    .map((line) => line.split(","));
  const [header, ...body] = rows;

  return (
    <div>
      {/* 전부 고정폭 — 컬럼이 세로로 맞아야 어느 칸이 비었는지 보인다. */}
      <div className="overflow-x-auto">
        <table className="border-collapse text-mono-small font-mono tabular-nums">
          <thead>
            <tr>
              {header.map((cell) => (
                <th
                  key={cell}
                  className="border border-border bg-muted px-2 py-1 text-left font-medium text-foreground-secondary"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((cells, rowIndex) => (
              <tr key={rowIndex}>
                {cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border border-border px-2 py-1 text-foreground"
                  >
                    {/* 빈 칸은 "레이블 없음"이다. 공백을 넣어 칸 높이를 유지한다. */}
                    {cell === "" ? " " : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNote && (
        <p className="mt-3 text-body-small text-muted-foreground">
          {getComposerColumnNote(taskType)}
        </p>
      )}
    </div>
  );
}
