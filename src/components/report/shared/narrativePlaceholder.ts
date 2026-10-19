/**
 * 빈 서술 자리의 안내 문구(서술 라운드 S3b, 점검 유-3).
 *
 * 종전에는 서술을 기다리는 중에도, 만들지 못했을 때도 "자동 서술 생성(LLM) 연동 예정"이 떴다 — 위 띠("만드는 중")와
 * 말이 엇갈렸고, 실패는 표시조차 없었다. 성적서 훅이 그리기 직전에 얹는 화면 전용 출처(pending·failed)로 고른다.
 * 그 밖(옛 저장본·미평가 초안)은 섹션이 넘긴 종전 문구 그대로다.
 */
import type { NarrativeSource } from "../../../types/finalReport.types";

export const NARRATIVE_PENDING_TEXT = "서술을 만드는 중입니다 — 끝나면 이 자리에 채워집니다.";
export const NARRATIVE_FAILED_TEXT = "서술을 만들지 못했습니다 — 화면 위의 '서술 다시 만들기'를 눌러 주세요.";

export function narrativePlaceholder(source: NarrativeSource | undefined, otherwise: string): string {
  if (source === "pending") return NARRATIVE_PENDING_TEXT;
  if (source === "failed") return NARRATIVE_FAILED_TEXT;
  return otherwise;
}

/** 9절 문제 표의 빈 권고 칸. */
export function recommendationPlaceholder(source: NarrativeSource | undefined, otherwise: string): string {
  if (source === "pending") return "권고를 만드는 중";
  if (source === "failed") return "권고를 만들지 못함";
  return otherwise;
}
