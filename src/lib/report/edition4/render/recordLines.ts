/**
 * 판 4 화면 "작성 기록" 상자의 줄(판 4 라운드 대응표 29, 부록 B25·B26 — P0)과 판 4 화면 안내 글 조각(부록 B27~B29, P1).
 *
 * - 줄 순서·앞 글은 B26(`narrativeSlots.B26_RECORD_LINES` — "5.1 판정과 불확실성(8.2 칸)" 꼴, 판 4 찍는 순서). 뒤 이름표는 판 3
 *   `narrativeRecordLabel` 그대로("AI 작성(모델)"·"규칙 기반 문장"·"고정 문구").
 * - 저장된 칸별 출처(`narrativeSections`)에 있는 칸만 줄을 세운다. 모르는 칸(서버가 칸을 더했을 때)은 판 3 상자처럼 버리지 않고
 *   이름 순으로 뒤에 붙인다 — 판 4 자리를 아는 칸(권고 칸 9.1·9.2)은 B26 과 같은 꼴, 아예 모르는 칸은 칸 이름만(판 3 과 같음).
 * - 저장값을 읽기만 한다(칸 출처·모델 이름). 다시 계산하지 않는다.
 */
import { narrativeRecordLabel } from "../../../../components/report/NarrativeRecordPanel";
import type { FinalReportData } from "../../../../types/finalReport.types";
import { B27_PROGRESS_HEAD, B28_RULE_TAIL, B29_PLACES } from "../edition4Text";
import { B26_RECORD_LINES, edition4PlaceOfSlot, edition4TitleOfSlot } from "../narrativeSlots";

export interface Ed4RecordLine {
  /** 칸 이름(저장값 그대로 — 8.2 …). */
  slot: string;
  /** 앞 글 — B26 "5.1 판정과 불확실성(8.2 칸)". */
  text: string;
  /** 뒤 이름표 — 판 3 `narrativeRecordLabel`. */
  label: string;
}

/** 모르는 칸의 앞 글 — 판 4 자리를 알면 B26 꼴, 모르면 칸 이름만(판 3 상자와 같음). */
function extraText(slot: string): string {
  const title = edition4TitleOfSlot(slot);
  return title ? `${edition4PlaceOfSlot(slot)} ${title}(${slot} 칸)` : slot;
}

/** 작성 기록 줄 — B26 순서(있는 칸만) 뒤에 모르는 칸을 이름 순으로. */
export function ed4RecordLines(data: Pick<FinalReportData, "narrativeSections" | "narrativeModels">): Ed4RecordLine[] {
  const sections = data.narrativeSections ?? {};
  const known = B26_RECORD_LINES.filter((line) => line.slot in sections).map((line) => ({ slot: line.slot, text: line.text }));
  const extra = Object.keys(sections)
    .filter((slot) => !B26_RECORD_LINES.some((line) => line.slot === slot))
    .sort()
    .map((slot) => ({ slot, text: extraText(slot) }));
  return [...known, ...extra].map((line) => ({
    ...line,
    label: narrativeRecordLabel(sections[line.slot], data.narrativeModels?.[line.slot]),
  }));
}

/**
 * B27 — 판 4 서술 진행 띠의 앞 글("정성 서술(5·6절)을 만드는 중입니다 — "). 단계 이름 뒤 "." 와 그 뒤 문장은 판 3 띠 그대로라
 * 띠가 앞 글만 바꾼다. 상수의 단계 뒤 글이 "." 가 아니면 던진다(띠의 뒤 글과 어긋나지 않게).
 */
export function ed4ProgressHeadBefore(): string {
  const [before, after] = B27_PROGRESS_HEAD.split("{단계}");
  if (after !== ".") throw new Error(`B27 단계 뒤 글이 "." 가 아니다: ${after}`);
  return before;
}

/** B28 — 판 4 생성 전 안내의 뒤 글("진행한 것으로 기록됩니다 (입력 점검 규칙 2.0)."). */
export function ed4RuleTail(version: string): string {
  return B28_RULE_TAIL.replace("{v}", () => version);
}

/** B29 — 판 4 run 의 점검 표 재확인 안내에서 점검 결과가 찍히는 자리. */
export const ED4_RECHECK_PLACES = B29_PLACES;
