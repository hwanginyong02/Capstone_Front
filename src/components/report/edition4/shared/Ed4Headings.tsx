/**
 * 판 4 제목 부품(판 4 라운드 계획 2.4) — 예시본 모양: 절 제목 "1. 시험 개요"(h2), 소절 제목 "1.1 의뢰자와 시험기관"(h3),
 * 표 위 굵은 소제목("의뢰자", "하이퍼파라미터" 같은 줄). 판 3 `SectionTitle` 의 "Section 0N" 머리글은 쓰지 않는다.
 * 제목 글자는 `edition4Text.ts` 의 `ED4_TITLES`(예시본 글자)에서 번호로 찾는다 — 번호만 넘기면 된다.
 */
import type { ReactNode } from "react";

import { ED4_TITLES, type Ed4TitleNumber } from "../../../../lib/report/edition4/edition4Text";
import { cn } from "../../../../utils/styling/styles";

/** 절 제목(h2) — "{번호}. {제목}". */
export function Ed4SectionTitle({ number, className }: { number: Ed4TitleNumber; className?: string }) {
  return <h2 className={cn("mt-10 text-xl font-semibold text-slate-900", className)}>{`${number}. ${ED4_TITLES[number]}`}</h2>;
}

/** 소절 제목(h3) — "{번호} {제목}". */
export function Ed4SubsectionTitle({ number, className }: { number: Ed4TitleNumber; className?: string }) {
  return <h3 className={cn("mt-6 text-base font-semibold text-slate-800", className)}>{`${number} ${ED4_TITLES[number]}`}</h3>;
}

/** 표 위 굵은 소제목 한 줄(예시본 "의뢰자", "학습·추론 환경", "시험 결과 요약"). */
export function Ed4TableTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-4 text-sm font-semibold text-slate-800", className)}>{children}</p>;
}
