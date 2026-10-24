/**
 * 판 4 클래스·레이블 이름 표기(S6 뒤 사용자 결정 5, 2026-10-24 — 예시본 4.4 "malignant(악성 종양)"). 백엔드
 * `wording_ed4.class_name_ed4`·`name_count_ed4` 와 같은 글자 — 두 저장소 공통 대조 표(`number_wording_ed4.json` 의
 * class_name_cases·name_count_cases)로 시험한다.
 *
 * - 설명이 있으면 "이름(설명)". 설명 자체에 '(' 나 ')' 가 있으면 괄호가 겹쳐 읽기 어려우므로 "이름[설명]"
 *   ("7[숫자 7(가로줄 없는 필체 포함)]"). 설명이 없으면 이름만. 조사는 괄호·대괄호 앞 이름으로 고른다(`josa`).
 * - 4.4 혼동 행렬 건수 표는 이름만(예시본), 최약 클래스(레이블)·예측 편향·최다 오분류 쌍 표는 이 함수.
 * - "{이름} {n}건" 처럼 이름 바로 뒤에 건수가 오는 글은 이름이 숫자로 끝나면 "{이름}: {n}건"(digits "1: 55건" — "1 55건" 으로
 *   읽히지 않게, `nameCountEd4`). 4.5 분포 문장이 쓴다.
 *
 * 판 3 `classDisplayName`(NarrativeFactTables)은 얼린 출력이라 그대로다.
 */
import type { ClassLabelInfo } from "../../../types/finalReport.types";

/** 클래스 이름 + 설명 — "이름(설명)", 설명에 괄호가 있으면 "이름[설명]", 설명이 없으면 이름. */
export function classNameEd4(label: string, description: string | null | undefined): string {
  const text = description?.trim();
  if (!text) return label;
  return /[()]/.test(text) ? `${label}[${text}]` : `${label}(${text})`;
}

/** 3절 클래스 레이블 설명 목록에서 찾아 `classNameEd4`. */
export function classDisplayNameEd4(label: string, descriptions: readonly ClassLabelInfo[] | undefined): string {
  return classNameEd4(label, descriptions?.find((d) => d.label === label)?.description);
}

/** 이름 바로 뒤 건수 — 이름이 숫자로 끝나면 "{이름}: {건수}", 아니면 "{이름} {건수}". */
export function nameCountEd4(name: string, countWithUnit: string): string {
  return /\d$/.test(name) ? `${name}: ${countWithUnit}` : `${name} ${countWithUnit}`;
}
