/**
 * 판 4 2절 시험 대상(2.1 대상 모델, 2.2 평가 데이터, 2.3 학습 데이터) — 예시본 모양. 글은 `lib/report/edition4/render/target.ts` 가
 * 저장값에서 고른다. 표 위 출처 안내는 고정 문구 26, 하이퍼파라미터가 없으면 부록 B30.
 * 2.3 학습 데이터 예시 표(계획 4절 P1)는 판 3 `DatasetSection` 의 비공개 `TrainingDatasetExampleTable` 을 판 4 표 모양으로 옮긴 것이다
 * (판 3 파일은 동결 — import 하지 않음). 판 4 표 칸에는 글(과 그림)만 넣는다 — 확대 보기 창은 옮기지 않았다.
 */
import { Fragment } from "react";

import { B30_NOT_PROVIDED, FIXED_26_PROVIDED_ALL, FIXED_26_PROVIDED_DESCRIPTION } from "../../../lib/report/edition4/edition4Text";
import {
  classDescriptionRows,
  environmentRows,
  evaluationDataRows,
  exampleFileCaption,
  groundTruthRows,
  hyperparameterRows,
  modelRows,
  showsNoTrainingInfo,
  trainingExamples,
  trainingRows,
} from "../../../lib/report/edition4/render/target";
import {
  ED3_NO_TRAINING_INFO,
  TARGET_CLASS_DESCRIPTION_HEADERS,
  TARGET_CLASS_DESCRIPTION_TITLE,
  TARGET_ENVIRONMENT_TITLE,
  TARGET_EVAL_HEADERS,
  TARGET_GROUND_TRUTH_TITLE,
  TARGET_HYPERPARAMETER_HEADERS,
  TARGET_HYPERPARAMETER_TITLE,
  TRAINING_EXAMPLE_EMPTY,
  TRAINING_EXAMPLE_HEADERS,
  TRAINING_EXAMPLE_TITLE,
} from "../../../lib/report/edition4/render/targetText";
import type { UploadedFileInfo } from "../../../types/finalReport.types";
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle, Ed4SubsectionTitle, Ed4TableTitle } from "./shared/Ed4Headings";
import { Ed4Paragraph } from "./shared/Ed4Paragraph";
import { Ed4ItemTable, Ed4Table } from "./shared/Ed4Table";

/** 예시 칸 하나 — 파일마다 (그림) + "파일명 · 크기", 쉼표로 잇는다. 없으면 "등록된 {이름} 없음". */
function exampleCell(files: UploadedFileInfo[], name: string) {
  if (files.length === 0) return TRAINING_EXAMPLE_EMPTY.replace("{이름}", name);
  return files.map((file, i) => (
    <Fragment key={`${file.name}-${i}`}>
      {i > 0 && ", "}
      {file.previewUrl && <img src={file.previewUrl} alt={file.name} className="my-1 max-h-[300px] w-full object-contain" />}
      {exampleFileCaption(file)}
    </Fragment>
  ));
}

export function Ed4Target({ data }: Ed4PartProps) {
  const hyperparameters = hyperparameterRows(data);
  const groundTruth = groundTruthRows(data);
  const descriptions = classDescriptionRows(data);
  const training = trainingRows(data);
  const examples = trainingExamples(data);
  return (
    <section data-ed4-part="Ed4Target">
      <Ed4SectionTitle number="2" />

      <Ed4SubsectionTitle number="2.1" />
      <Ed4Paragraph>{FIXED_26_PROVIDED_ALL}</Ed4Paragraph>
      <Ed4ItemTable rows={modelRows(data)} />
      <Ed4TableTitle>{TARGET_HYPERPARAMETER_TITLE}</Ed4TableTitle>
      {hyperparameters ? (
        <Ed4Table columns={TARGET_HYPERPARAMETER_HEADERS} rows={hyperparameters} />
      ) : (
        <Ed4Paragraph>{B30_NOT_PROVIDED}</Ed4Paragraph>
      )}
      <Ed4TableTitle>{TARGET_ENVIRONMENT_TITLE}</Ed4TableTitle>
      <Ed4ItemTable rows={environmentRows(data)} />

      <Ed4SubsectionTitle number="2.2" />
      <Ed4Table columns={TARGET_EVAL_HEADERS} rows={evaluationDataRows(data)} />
      {groundTruth.length > 0 && (
        <>
          <Ed4TableTitle>{TARGET_GROUND_TRUTH_TITLE}</Ed4TableTitle>
          <Ed4Paragraph>{FIXED_26_PROVIDED_ALL}</Ed4Paragraph>
          <Ed4ItemTable rows={groundTruth} />
        </>
      )}
      {descriptions.length > 0 && (
        <>
          <Ed4TableTitle>{TARGET_CLASS_DESCRIPTION_TITLE}</Ed4TableTitle>
          <Ed4Paragraph>{FIXED_26_PROVIDED_DESCRIPTION}</Ed4Paragraph>
          <Ed4ItemTable headers={TARGET_CLASS_DESCRIPTION_HEADERS} rows={descriptions} />
        </>
      )}

      <Ed4SubsectionTitle number="2.3" />
      {showsNoTrainingInfo(data) && <Ed4Paragraph>{ED3_NO_TRAINING_INFO}</Ed4Paragraph>}
      {training.length > 0 && (
        <>
          <Ed4Paragraph>{FIXED_26_PROVIDED_ALL}</Ed4Paragraph>
          <Ed4ItemTable rows={training} />
        </>
      )}
      {examples && (
        <>
          <Ed4TableTitle>{TRAINING_EXAMPLE_TITLE}</Ed4TableTitle>
          <Ed4Table
            columns={TRAINING_EXAMPLE_HEADERS}
            rows={[[exampleCell(examples.valid, TRAINING_EXAMPLE_HEADERS[0]), exampleCell(examples.edge, TRAINING_EXAMPLE_HEADERS[1])]]}
          />
        </>
      )}
    </section>
  );
}
