/**
 * 워크플로우 상태에 저장하는 날짜의 표현 — ISO 날짜 문자열("YYYY-MM-DD").
 *
 * ISSUES.md E-09(및 E-01 의 선결 조건) — 종전에는 `basicInfo.contractDate` 가 `Date` 였다.
 * 그런데 이 상태는 워크스페이스 스냅샷으로 localStorage 를 왕복하는 것이 **정상 동작**이고,
 * JSON 왕복 후에는 문자열이 되므로 `formatDate(d: Date)` 가
 * `TypeError: d.getFullYear is not a function` 을 던졌다.
 *
 * 그래서 reviver 로 되살리는 대신 **타입 자체를 직렬화 가능한 형태로** 바꾼다 —
 * 이 상태의 참 타입은 저장소를 왕복해도 변하지 않는 것이어야 한다. reviver 방식은
 * 같은 함정을 다음 Date 필드에서 그대로 다시 만든다.
 *
 * UI(react-day-picker)는 Date 를 요구하므로 **경계에서만** 변환한다.
 */

/** Date → "YYYY-MM-DD". 로컬 시간대 기준이다(toISOString 은 UTC 라 KST 자정 직후 하루가 밀린다). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" → Date(로컬 자정). 값이 없거나 해석 불가면 undefined. */
export function fromIsoDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    // 과거 저장분이 Date 의 toJSON 결과("2026-09-05T00:00:00.000Z")일 수 있다.
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/** 오늘 날짜(로컬)의 ISO 날짜 문자열. */
export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

/**
 * 저장소에서 읽은 값을 ISO 날짜 문자열로 정규화한다.
 *
 * 하위호환: 이 변경 이전에 저장된 스냅샷은 `contractDate` 가 Date 의 toJSON 결과
 * ("2026-09-05T00:00:00.000Z")로 들어 있다. 그것도 "YYYY-MM-DD" 로 받아준다.
 */
export function normalizeIsoDate(value: unknown): string | undefined {
  if (typeof value === "string") {
    const d = fromIsoDate(value);
    return d ? toIsoDate(d) : undefined;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toIsoDate(value);
  return undefined;
}
