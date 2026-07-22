import { useState } from "react";
import { FileImage, ZoomIn, X } from "lucide-react";
import type {
  DatasetInfo,
  DatasetSampleRow,
  TrainingDatasetInfo,
  UploadedFileInfo,
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
  const [activeImage, setActiveImage] = useState<{ url: string; title: string } | null>(null);

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
                <TrainingDatasetExampleTable
                  validExamples={trainingDatasetInfo.validExamples}
                  edgeExamples={trainingDatasetInfo.edgeExamples}
                  onImageClick={(url, title) => setActiveImage({ url, title })}
                />
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

      {/* 이미지 확대 미리보기 모달 */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-lg bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">{activeImage.title}</h3>
              <button
                type="button"
                onClick={() => setActiveImage(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-2">
              <img
                src={activeImage.url}
                alt={activeImage.title}
                className="max-h-[75vh] w-auto max-w-full rounded object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TrainingDatasetExampleTable({
  validExamples,
  edgeExamples,
  onImageClick,
}: {
  validExamples: UploadedFileInfo[];
  edgeExamples: UploadedFileInfo[];
  onImageClick?: (url: string, title: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-300 bg-white">
      {/* 표 헤더 */}
      <div className="grid grid-cols-2 border-b border-slate-300 bg-slate-100 text-center text-xs font-bold text-slate-800 divide-x divide-slate-300">
        <div className="py-2.5 px-3">정상 데이터</div>
        <div className="py-2.5 px-3">불량 데이터</div>
      </div>

      {/* 표 본문 (흰색 깔끔한 셀 2분할) */}
      <div className="grid grid-cols-2 divide-x divide-slate-300 bg-white">
        {/* 정상 데이터 셀 */}
        <div className="flex items-center justify-center p-3 overflow-hidden">
          {validExamples.length > 0 ? (
            <div className="w-full space-y-2">
              {validExamples.map((file, idx) => (
                <ExampleImageCell
                  key={`valid-${file.name}-${idx}`}
                  file={file}
                  label="정상 데이터"
                  onImageClick={onImageClick}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 p-6">등록된 정상 데이터 없음</p>
          )}
        </div>

        {/* 불량 데이터 셀 */}
        <div className="flex items-center justify-center p-3 overflow-hidden">
          {edgeExamples.length > 0 ? (
            <div className="w-full space-y-2">
              {edgeExamples.map((file, idx) => (
                <ExampleImageCell
                  key={`edge-${file.name}-${idx}`}
                  file={file}
                  label="불량 데이터"
                  onImageClick={onImageClick}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 p-6">등록된 불량 데이터 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ExampleImageCell({
  file,
  label,
  onImageClick,
}: {
  file: UploadedFileInfo;
  label: string;
  onImageClick?: (url: string, title: string) => void;
}) {
  const hasPreview = !!file.previewUrl;
  return (
    <div
      className="group relative flex w-full items-center justify-center overflow-hidden cursor-pointer bg-white py-2"
      onClick={() => hasPreview && onImageClick?.(file.previewUrl!, `${label} - ${file.name}`)}
    >
      {hasPreview ? (
        <>
          <img
            src={file.previewUrl}
            alt={file.name}
            className="w-full max-h-[300px] object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white shadow">
              <ZoomIn className="size-4 text-teal-400" /> 클릭하여 확대
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 text-slate-400 py-6">
          <FileImage className="size-10 stroke-[1.5]" />
          <span className="text-xs text-slate-600">{file.name}</span>
        </div>
      )}
    </div>
  );
}
