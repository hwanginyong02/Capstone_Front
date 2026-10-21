/**
 * 소절 제목(서술 라운드 세션 B). 판 3 성적서는 소절 번호를 붙인다("7.1 혼동 행렬 …"). 판 1·2 보관본은
 * 발급 당시처럼 번호 없이 — 이때 그리는 요소는 종전 `<h3 className=…>{제목}</h3>` 과 같다(옛 보관본 스냅샷
 * `src/test/archive` 가 지킨다).
 */
import type { ReactNode } from "react";

interface SubsectionTitleProps {
  /** 소절 번호("1.1"·"6.0.1"·"7.3" …). 판 3 에서만 찍는다. */
  number: string;
  /** 판 3 성적서인가(`usesSchema3`). */
  schema3?: boolean;
  /** 제목 요소. 대개 h3. */
  as?: "h3" | "h4";
  className?: string;
  children: ReactNode;
}

/** 판 3 이면 "{번호} " 접두, 아니면 빈 글. 제목 글을 만드는 곳(테스트·스모크)이 같은 규칙을 쓴다. */
export function subsectionPrefix(number: string, schema3: boolean | undefined): string {
  return schema3 ? `${number} ` : "";
}

export function SubsectionTitle({ number, schema3, as: Tag = "h3", className, children }: SubsectionTitleProps) {
  return (
    <Tag className={className}>
      {subsectionPrefix(number, schema3)}
      {children}
    </Tag>
  );
}
