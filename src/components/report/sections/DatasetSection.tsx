import { FileImage } from "lucide-react";
import type {
  DatasetInfo,
  DatasetSampleRow,
  TrainingDatasetInfo,
} from "../../../types/finalReport.types";
import { SectionTitle } from "../shared/SectionTitle";
import { TwoColTable } from "../shared/TwoColTable";

interface DatasetSectionProps {
  datasetInfo: DatasetInfo;
  datasetSamples: DatasetSampleRow[];
  datasetDiagnosis: string;
  trainingDatasetInfo?: TrainingDatasetInfo;
}

export function DatasetSection({
  datasetInfo,
  datasetSamples,
  datasetDiagnosis,
  trainingDatasetInfo,
}: DatasetSectionProps) {
  const trainingRows = trainingDatasetInfo
    ? [
        { label: "학습 데이터셋명", value: trainingDatasetInfo.name },
        {
          label: "학습 샘플 수",
          value: `${trainingDatasetInfo.trainingSampleCount.toLocaleString()}개`,
        },
        ...(trainingDatasetInfo.validationSampleCount > 0
          ? [{
              label: "검증 샘플 수",
              value: `${trainingDatasetInfo.validationSampleCount.toLocaleString()}개`,
            }]
          : []),
        ...(trainingDatasetInfo.format
          ? [{ label: "학습 데이터 형식", value: trainingDatasetInfo.format }]
          : []),
        ...(trainingDatasetInfo.classDistribution
          ? [{ label: "클래스 분포", value: trainingDatasetInfo.classDistribution }]
          : []),
        ...(trainingDatasetInfo.description
          ? [{ label: "학습 데이터 설명", value: trainingDatasetInfo.description }]
          : []),
      ]
    : [];

  const evalRows = [
    { label: "데이터셋 형식",      value: datasetInfo.format },
    { label: "입력 컬럼",          value: datasetInfo.inputColumns.join(", ") },
    { label: "평가 데이터셋 샘플 수", value: `${datasetInfo.sampleCount.toLocaleString()}개` },
    { label: "평가 유형",          value: datasetInfo.taskTypeLabel },
    {
      label: "감지된 클래스 수",
      value: `${datasetInfo.classCount}개 — 클래스 목록: ${datasetInfo.classLabels.join(", ")}`,
    },
    { label: "업로드 파일명",      value: datasetInfo.fileName },
  ];

  const classLabelDescriptions = datasetInfo.classLabelDescriptions ?? [];

  return (
    <section className="space-y-8 border-t border-slate-200 py-10">
      <SectionTitle number={3} title="데이터셋 개요" />

      {/* ===== 학습 데이터셋 ===== */}
      <div className="space-y-6">
        <h3 className="text-base font-semibold text-slate-800">학습 데이터셋</h3>

        {trainingDatasetInfo ? (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">학습 데이터 정보</h4>
              <TwoColTable rows={trainingRows} />
            </div>

            {(trainingDatasetInfo.validExamples.length > 0 ||
              trainingDatasetInfo.edgeExamples.length > 0) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">학습 데이터 예시</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <ExampleFileList
                    title="대표 적합 샘플"
                    files={trainingDatasetInfo.validExamples}
                    emptyText="등록된 적합 샘플 없음"
                  />
                  <ExampleFileList
                    title="부적합 / Edge 샘플 (옵션)"
                    files={trainingDatasetInfo.edgeExamples}
                    emptyText="등록된 부적합 샘플 없음"
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">등록된 학습 데이터셋 정보가 없습니다.</p>
        )}
      </div>

      {/* ===== 평가 데이터셋 ===== */}
      <div className="space-y-6">
        <h3 className="text-base font-semibold text-slate-800">평가 데이터셋</h3>

        {/* 평가 데이터 정보 */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">평가 데이터 정보</h4>
          <TwoColTable rows={evalRows} />
        </div>

        {/* 클래스 레이블 설명 */}
        {classLabelDescriptions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700">클래스 레이블 설명</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="py-2 px-4 text-left font-medium text-slate-500 w-48">클래스</th>
                    <th className="py-2 px-4 text-left font-medium text-slate-500">설명</th>
                  </tr>
                </thead>
                <tbody>
                  {classLabelDescriptions.map((item) => (
                    <tr
                      key={item.label}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="py-2 px-4 font-mono text-xs text-slate-700">{item.label}</td>
                      <td className="py-2 px-4 text-slate-700">
                        {item.description ? (
                          item.description
                        ) : (
                          <span className="text-slate-300">설명 미입력</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 데이터 예시 */}
        {datasetSamples.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700">데이터 예시</h4>
            <p className="text-xs text-slate-400">
              업로드된 데이터셋의 상위 {datasetSamples.length}개 샘플
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="py-2 px-4 text-left font-medium text-slate-500 w-20">id</th>
                    <th className="py-2 px-4 text-left font-medium text-slate-500">y_true</th>
                    <th className="py-2 px-4 text-left font-medium text-slate-500">y_pred</th>
                    <th className="py-2 px-4 text-left font-medium text-slate-500">score</th>
                    <th className="py-2 px-4 text-left font-medium text-slate-500">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetSamples.map((row) => {
                    const isCorrect = row.y_true === row.y_pred;
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="py-2 px-4 font-mono text-xs text-slate-400">{row.id}</td>
                        <td className="py-2 px-4 tabular-nums text-slate-700">{row.y_true}</td>
                        <td className="py-2 px-4 tabular-nums text-slate-700">{row.y_pred}</td>
                        <td className="py-2 px-4 font-mono text-xs text-slate-700">{row.score.toFixed(3)}</td>
                        <td className="py-2 px-4 text-xs">
                          {isCorrect ? (
                            <span className="text-emerald-600">정답</span>
                          ) : (
                            <span className="text-red-500">오분류</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 데이터셋 분포 사전 진단 */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">데이터셋 분포 사전 진단</h4>
          <blockquote className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm font-medium leading-relaxed text-slate-700">
              "{datasetDiagnosis}"
            </p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}

function ExampleFileList({
  title,
  files,
  emptyText,
}: {
  title: string;
  files: { name: string; size: string; type: string }[];
  emptyText: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-600">{title}</p>
      {files.length === 0 ? (
        <p className="text-xs text-slate-400">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center gap-3 text-sm">
              <FileImage className="size-5 text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {file.size}
                  {file.type && file.type !== "unknown" ? ` · ${file.type}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
