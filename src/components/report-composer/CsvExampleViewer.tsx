/**
 * ① 평가 데이터의 "예시 파일 보기" — 선택한 분류 유형의 예시 CSV 를 표로 보여준다.
 *
 * 예시 문자열은 `data/templateExamples.ts` 의 `getComposerCsvExample` 가 들고 있다(그 파일에
 * 업로드 화면 예시와 컬럼명이 다른 이유를 적어 뒀다).
 */
import { getComposerColumnNote, getComposerCsvExample } from "../../data/templateExamples";
import type { TaskType } from "../../data/evaluationData";

export function CsvExampleViewer({ taskType }: { taskType: TaskType }) {
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

      <p className="mt-3 text-body-small text-muted-foreground">
        {getComposerColumnNote(taskType)}
      </p>
    </div>
  );
}
