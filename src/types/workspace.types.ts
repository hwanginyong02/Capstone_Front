import type { FinalReportData } from "./finalReport.types";
import type { MapWorkflowToReportInput } from "../lib/report/mapWorkflowToFinalReport";
import type { EvaluationRequestSnapshot } from "../lib/report/evaluationRequest";
import type { NarrativeRequestPayload } from "../lib/report/buildFactSheet";
import type { NarrativeFailure } from "../lib/report/narrativeJobApi";

export interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

/**
 * run 의 서술 상태(서술 라운드 S3b). **끝 상태와 이어 조회에 필요한 것만** 저장한다 — 진행 단계(생성 중·검사 중)는
 * 성적서 화면의 컴포넌트 상태에만 둔다(단계마다 저장하면 저장할 때마다 성적서 훅이 다시 돈다).
 * - pending: 작업을 만들었다(jobId). 새로고침하면 이 번호로 이어 조회한다.
 * - done: 서술이 끝나 reportData 에 병합됐다(reportData.isEvaluated = true).
 * - failed: 서술을 만들지 못했다(failure). "서술 다시 만들기"가 input 으로 새 작업을 만든다.
 * input 은 다시 만들기용 서술 요청 본문이다. 너무 크면(저장 공간) 남기지 않고, 그때 다시 만들기는 파일을 다시 올려
 * 평가부터 한다. 끝나면(done) 지운다.
 */
export interface RunNarrativeState {
  status: "pending" | "done" | "failed";
  jobId: string | null;
  failure?: NarrativeFailure;
  input?: NarrativeRequestPayload | null;
  startedAt?: string;
}

/**
 * 저장소 판 3 이행이 붙인 표시(서술 라운드 S3b).
 * - needs_reevaluation: 서술이 빈 채 완성본으로 저장됐던 미발급 run — 완성본 표시를 거두고 다시 평가하게 한다.
 * - issued_empty_narrative: 서술이 빈 채 발급된 run — 보관본은 그대로 두고 "정정 발급으로만 고칠 수 있음"을 알린다.
 */
export type RunMigrationNote = "needs_reevaluation" | "issued_empty_narrative";

export interface WorkspaceEvaluationRun {
  id: string;
  workspaceId: string;
  modelName: string;
  versionName: string;
  reportId: string;
  workflowSnapshot: MapWorkflowToReportInput;
  reportData: FinalReportData;
  createdAt: string;
  /** 평가 요청 스냅샷(결정 임계값·매핑·지표·파일 지문). 이 칸이 생기기 전 run 에는 없다 — 그 run 은 다시 평가해야 한다. */
  evaluationRequest?: EvaluationRequestSnapshot;
  /** 서술 상태. 없으면 서술 작업을 아직 만들지 않았다(또는 이 칸이 생기기 전 run). */
  narrative?: RunNarrativeState;
  migrationNote?: RunMigrationNote;
}
