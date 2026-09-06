/**
 * ISSUES.md E-09 — 워크플로우 상태의 날짜 표현.
 *
 * 로컬 시간대 기준이 중요하다. `toISOString().slice(0,10)` 은 UTC 라 KST 자정 직후에
 * 하루가 밀린다(예: 2026-09-05 00:30 KST = 2026-09-04 15:30 UTC → "2026-09-04").
 */
import { describe, expect, it } from "vitest";

import { fromIsoDate, normalizeIsoDate, toIsoDate, todayIsoDate } from "./isoDate";

describe("toIsoDate", () => {
  it("로컬 시간대 기준으로 YYYY-MM-DD 를 만든다", () => {
    expect(toIsoDate(new Date(2026, 8, 5))).toBe("2026-09-05"); // 월은 0-based
  });

  it("[E-09] 자정 직후에도 날짜가 밀리지 않는다 — UTC 변환을 쓰지 않는다", () => {
    const justAfterMidnight = new Date(2026, 8, 5, 0, 30);
    expect(toIsoDate(justAfterMidnight)).toBe("2026-09-05");
  });

  it("한 자리 월·일을 0 으로 채운다", () => {
    expect(toIsoDate(new Date(2026, 0, 3))).toBe("2026-01-03");
  });
});

describe("fromIsoDate", () => {
  it("YYYY-MM-DD 를 로컬 자정 Date 로 되살린다", () => {
    const d = fromIsoDate("2026-09-05")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(5);
  });

  it("빈 값은 undefined", () => {
    expect(fromIsoDate(undefined)).toBeUndefined();
    expect(fromIsoDate("")).toBeUndefined();
    expect(fromIsoDate(null)).toBeUndefined();
  });

  it("[E-09] 구 형식(Date 의 toJSON 결과)도 받아준다", () => {
    expect(fromIsoDate("2026-09-05T00:00:00.000Z")).toBeInstanceOf(Date);
  });
});

describe("왕복", () => {
  it("[E-09] toIsoDate → fromIsoDate → toIsoDate 가 같은 값을 준다", () => {
    const iso = "2026-12-31";
    expect(toIsoDate(fromIsoDate(iso)!)).toBe(iso);
  });

  it("[E-09] JSON 왕복을 거쳐도 문자열이 그대로 유지된다 — 이것이 타입 변경의 목적", () => {
    const state = { contractDate: toIsoDate(new Date(2026, 8, 5)) };
    const restored = JSON.parse(JSON.stringify(state));

    expect(typeof restored.contractDate).toBe("string");
    expect(restored.contractDate).toBe(state.contractDate);
    // 종전에는 Date 였고, 왕복 후 문자열이 되어 formatDate 가 TypeError 를 던졌다.
    expect(() => fromIsoDate(restored.contractDate)!.getFullYear()).not.toThrow();
  });
});

describe("normalizeIsoDate", () => {
  it("문자열·Date·구 형식을 모두 YYYY-MM-DD 로 정규화한다", () => {
    expect(normalizeIsoDate("2026-09-05")).toBe("2026-09-05");
    expect(normalizeIsoDate(new Date(2026, 8, 5))).toBe("2026-09-05");
    expect(normalizeIsoDate("2026-09-05T00:00:00.000Z")).toMatch(/^2026-09-0[45]$/);
  });

  it("해석할 수 없는 값은 undefined", () => {
    expect(normalizeIsoDate(undefined)).toBeUndefined();
    expect(normalizeIsoDate(null)).toBeUndefined();
    expect(normalizeIsoDate(123)).toBeUndefined();
    expect(normalizeIsoDate("아무말")).toBeUndefined();
  });
});

describe("todayIsoDate", () => {
  it("오늘 날짜를 YYYY-MM-DD 형식으로 준다", () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayIsoDate()).toBe(toIsoDate(new Date()));
  });
});
