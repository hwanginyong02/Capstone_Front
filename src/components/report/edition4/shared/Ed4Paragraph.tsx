/**
 * 판 4 문단 부품(판 4 라운드 계획 2.4·대응표 18) — 본문 문단과 서술 문단. 판 4 는 서술을 blockquote·따옴표로 감싸지 않는다
 * (판 3 `NarrativeBlock` 과 다름). 서술 글의 빈 줄은 문단 나눔으로 본다.
 */
import type { ReactNode } from "react";

import { cn } from "../../../../utils/styling/styles";

/** 본문 문단 하나. */
export function Ed4Paragraph({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-2 text-sm leading-relaxed text-slate-800", className)}>{children}</p>;
}

/**
 * 서술 글을 문단으로 — 빈 줄(줄바꿈 둘 이상)로 나눈다. 따옴표·blockquote 없이 그대로 찍는다. 빈 글이면 아무것도 그리지 않는다.
 * 문단 안의 홑 줄바꿈은 판 3 schema3 서술 문단(`InterpretSection` 등)처럼 `whitespace-pre-line` 으로 남긴다.
 */
export function Ed4Narrative({ text, className }: { text: string | null | undefined; className?: string }) {
  const paragraphs = (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  return (
    <>
      {paragraphs.map((p, i) => (
        <Ed4Paragraph key={i} className={cn("whitespace-pre-line", className)}>
          {p}
        </Ed4Paragraph>
      ))}
    </>
  );
}
