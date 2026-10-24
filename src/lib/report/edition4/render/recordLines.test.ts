/**
 * 판 4 작성 기록 줄(부록 B26)과 화면 안내 글 조각(B27~B29) — 순수 함수 시험. 줄은 저장된 칸 출처·모델만 읽는다.
 */
import { describe, expect, it } from "vitest";

import { loadEd4 } from "../../../../test/edition4/render/ed4Fixtures";
import { ed4ProgressHeadBefore, ed4RecordLines, ED4_RECHECK_PLACES, ed4RuleTail } from "./recordLines";

const MODEL = "claude-sonnet-5-5";

/** B26 순서 일곱 줄의 앞 글(부록 B26 글자 그대로 — 손으로 적음). */
const B26_TEXTS = [
  "5.1 판정과 불확실성(8.2 칸)",
  "5.2 오분류(7.1 칸)",
  "5.3 데이터 분포(7.2 칸)",
  "5.4 참조 범위(8.1 칸)",
  "5.5 운영 위험(8.3 칸)",
  "5.6 추가 관찰(7.3 칸)",
  "6 개선 권고(9 칸)",
];

describe("ed4RecordLines — 픽스처 세 갈래(이진·다중·멀티)", () => {
  it("bc_strong: B26 순서 일곱 줄, 모두 AI 작성(모델)", () => {
    const lines = ed4RecordLines(loadEd4("bc_strong", "final"));
    expect(lines.map((l) => l.slot)).toEqual(["8.2", "7.1", "7.2", "8.1", "8.3", "7.3", "9"]);
    expect(lines.map((l) => l.text)).toEqual(B26_TEXTS);
    expect(lines.map((l) => l.label)).toEqual(Array(7).fill(`AI 작성(${MODEL})`));
  });

  it("digits_strong: 8.1 칸(5.4 자리)만 규칙 기반 문장", () => {
    const lines = ed4RecordLines(loadEd4("digits_strong", "final"));
    expect(lines).toHaveLength(7);
    expect(lines[3]).toEqual({ slot: "8.1", text: "5.4 참조 범위(8.1 칸)", label: "규칙 기반 문장" });
    expect(lines.filter((l) => l.label === `AI 작성(${MODEL})`).map((l) => l.slot)).toEqual(["8.2", "7.1", "7.2", "8.3", "7.3", "9"]);
  });

  it("yeast_strong: 7.3 칸(5.6 자리)만 고정 문구", () => {
    const lines = ed4RecordLines(loadEd4("yeast_strong", "final"));
    expect(lines).toHaveLength(7);
    expect(lines[5]).toEqual({ slot: "7.3", text: "5.6 추가 관찰(7.3 칸)", label: "고정 문구" });
    expect(lines.filter((l) => l.label === `AI 작성(${MODEL})`)).toHaveLength(6);
  });
});

describe("ed4RecordLines — 픽스처에 없는 갈래(복사본)", () => {
  const base = loadEd4("bc_strong", "final");

  it("있는 칸만 줄을 세운다(B26 순서는 유지)", () => {
    const lines = ed4RecordLines({ narrativeSections: { "9": "fallback", "7.1": "llm", "8.2": "llm" }, narrativeModels: {} });
    expect(lines).toEqual([
      { slot: "8.2", text: "5.1 판정과 불확실성(8.2 칸)", label: "AI 작성" },
      { slot: "7.1", text: "5.2 오분류(7.1 칸)", label: "AI 작성" },
      { slot: "9", text: "6 개선 권고(9 칸)", label: "규칙 기반 문장" },
    ]);
  });

  it("모르는 칸은 이름 순으로 뒤에 — 판 4 자리를 아는 권고 칸은 B26 꼴, 아예 모르는 칸은 칸 이름만", () => {
    const lines = ed4RecordLines({
      narrativeSections: { ...base.narrativeSections, "9.9": "llm", "9.2": "fixed", "9.1": "fallback" },
      narrativeModels: { ...base.narrativeModels, "9.9": "m-x" },
    });
    expect(lines).toHaveLength(10);
    expect(lines.slice(0, 7).map((l) => l.text)).toEqual(B26_TEXTS);
    expect(lines.slice(7)).toEqual([
      { slot: "9.1", text: "6.1 데이터(9.1 칸)", label: "규칙 기반 문장" },
      { slot: "9.2", text: "6.2 모델과 운영(9.2 칸)", label: "고정 문구" },
      { slot: "9.9", text: "9.9", label: "AI 작성(m-x)" },
    ]);
  });

  it("칸 출처가 없으면 빈 목록, 모델 표가 없으면 'AI 작성' 만", () => {
    expect(ed4RecordLines({})).toEqual([]);
    expect(ed4RecordLines({ narrativeSections: { "8.3": "llm" } })).toEqual([
      { slot: "8.3", text: "5.5 운영 위험(8.3 칸)", label: "AI 작성" },
    ]);
  });
});

describe("화면 안내 글 조각(부록 B27~B29)", () => {
  it("B27 띠 앞 글", () => {
    expect(ed4ProgressHeadBefore()).toBe("정성 서술(5·6절)을 만드는 중입니다 — ");
  });

  it("B28 생성 전 안내 뒤 글(점검 버전을 끼움)", () => {
    expect(ed4RuleTail("2.0")).toBe("진행한 것으로 기록됩니다 (입력 점검 규칙 2.0).");
    expect(ed4RuleTail("3.1")).toBe("진행한 것으로 기록됩니다 (입력 점검 규칙 3.1).");
  });

  it("B29 재확인 안내 자리", () => {
    expect(ED4_RECHECK_PLACES).toBe("(표지·1.3·부록 1.2)");
  });
});
