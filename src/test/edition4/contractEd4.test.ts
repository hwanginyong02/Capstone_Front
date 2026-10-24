/**
 * 판 4 공통 계약(판 4 라운드 S2 ①)의 프론트 쪽 — `src/test/contract/` 의 판 4 파일 셋.
 *
 * - `fact_sheet_contract_ed4.json`: 판 4 서술 요청 명세(판 신호 report_edition, 판 4 에만 있는 키, 판 4 표기로 찍는 칸).
 * - `number_wording_ed4.json`: 판 4 숫자 표기·조사 대조 표. 백엔드 tests/contract/ 에 같은 바이트가 있고, 두 저장소가
 *   같은 표로 자기 함수를 시험한다(판 4 숫자 함수 ed4Plain 등은 `lib/report/edition4/edition4Number.test.ts`, `josa` 는 아래).
 * - `narrative_slots_ed4.json`: 서술 칸 → 판 4 자리, 판 4 제목, 작성 기록 줄(B25·B26).
 *
 * 판 3 명세·예시(`fact_sheet_contract.json`·`fact_sheet_{binary,multiclass,multilabel,legacy_main}.json`)는
 * factSheetContract.test.ts 가 sha256 으로 묶어 둔 판 3 정답이라 건드리지 않는다 — 여기서는 판 3 요청에 판 4 키가 없다는
 * 것(null 키 금지)만 본다. 세 파일의 sha256 은 옆 저장소 없이도(CI) 지키고, 백엔드 사본과의 바이트 대조는 옆 저장소가
 * 있을 때만(skipIf) 본다. 바꾸면 두 저장소·라운드 폴더를 함께 바꾸고 아래 sha256 을 이유와 함께 고친다.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { NARRATIVE_RECORD_SECTIONS } from "../../components/report/NarrativeRecordPanel";
import { difference, formatJudgedValue } from "../../lib/report/judgedNumber";
import { josa, josaEulReul, josaEunNeun, josaEuroRo, josaWaGwa } from "../../lib/report/koreanJosa";

const CONTRACT_DIR = resolve(__dirname, "../contract");
const BACKEND_CONTRACT_DIR = resolve(__dirname, "../../../../Capstone_Back/tests/contract");
const ROUND_SPEC = resolve(__dirname, "../../../../NARRATIVE_ROUND/사실시트_계약_ed4.json");
const NEW_RUN_GOLDEN = resolve(__dirname, "../edition3/newRun/golden");
const SHARED = ["fact_sheet_contract_ed4.json", "number_wording_ed4.json", "narrative_slots_ed4.json"] as const;

/**
 * 판 4 라운드 S2 ① 에 만든 바이트. 백엔드 tests/test_p4_contract_ed4.py 와 같은 값이다.
 * S2·S3 검토(2026-10-24)로 고침 — 명세: D1~D7 결정(decided), 판 4 전용 새 키 facts.weakest_class.f1_text, '임시' 글 걷음.
 * 대조 표: target·latency·distinct 규칙과 줄, given 정수·지수 꼴, judged D1·여섯째 자리 줄, 조사 끝소리 모름·쉼표 정수 줄.
 * 새 규칙·줄을 프론트 함수가 따라오기 전까지 이 파일의 표 시험 일부가 빨갛다(백엔드 인계 fix_BE.md '프론트가 할 일').
 * 후속(2026-10-24)으로 명세·대조 표만 다시 고침 — 명세: 멀티레이블 4.5 학습·평가 비율의 분모 = 표본 수(T3 사용자 답, 새 상태
 * training_samples_not_provided), D3 클래스별 표(function_names.class_f1), not_decided 에 B16 이유 질문. 대조 표: distinct 의
 * class_table 줄 다섯(others = [최약 F1]). 칸 대응표는 그대로(백엔드 인계 fu_BE.md).
 * 후속 검토(2026-10-24)로 명세만 다시 고침 — B33(초안) 사용자 승인: not_decided 의 B16 이유 질문을 decided 로 옮기고 승인 글자를
 * 옮겨 적음, edition4_meaning 의 distribution_shift_status 줄도 같이. 대조 표·칸 대응표는 그대로.
 * S6 질문 4(2026-10-24 사용자 답 "추천대로")로 명세만 다시 고침 — 판 4 멀티레이블 최약 레이블·작은 표본 비율의 분모 = 표본 수:
 * edition4_meaning 에 class_share_basis·weakest_class.share·weakest_class.low_support·low_support_classes 네 줄, decided 에 한 줄.
 */
const SHA256: Record<(typeof SHARED)[number], string> = {
  "fact_sheet_contract_ed4.json": "f8516766cef76c0d504e21e78eb6cafe4edd6f1e6e7bedf373527d4477a80776",
  "number_wording_ed4.json": "6d4659d849363ceac749108c19b9a41662b18ce6e1f02bdc30586f54142466fb",
  "narrative_slots_ed4.json": "3c43ffa35357c8c7f4c8a30d182482a85dec51caefa872dc9e556ae51d5b7d35",
};

/** 계약 JSON 은 모양이 파일마다 달라 시험에서는 느슨한 타입으로 읽는다. */
type Json = any;
const readJson = (path: string): Json => JSON.parse(readFileSync(path, "utf8"));
const SPEC = readJson(resolve(CONTRACT_DIR, "fact_sheet_contract_ed4.json"));
const TABLE = readJson(resolve(CONTRACT_DIR, "number_wording_ed4.json"));
const SLOTS = readJson(resolve(CONTRACT_DIR, "narrative_slots_ed4.json"));
const ED4_ONLY: string[] = SPEC.edition4_only_keys.map((e: Json) => e.path);

describe("판 4 계약 파일 고정", () => {
  it("세 파일은 박아 둔 sha256 과 바이트까지 같다", () => {
    const actual = Object.fromEntries(
      SHARED.map((name) => [name, createHash("sha256").update(readFileSync(resolve(CONTRACT_DIR, name))).digest("hex")]),
    );
    expect(actual).toEqual(SHA256);
  });

  it.skipIf(!existsSync(BACKEND_CONTRACT_DIR))("백엔드 tests/contract 사본과 바이트가 같다", () => {
    for (const name of SHARED) {
      const theirs = readFileSync(resolve(BACKEND_CONTRACT_DIR, name));
      expect([name, theirs.equals(readFileSync(resolve(CONTRACT_DIR, name)))]).toEqual([name, true]);
    }
  });

  it.skipIf(!existsSync(ROUND_SPEC))("라운드 폴더 명세와 바이트가 같다", () => {
    expect(readFileSync(ROUND_SPEC).equals(readFileSync(resolve(CONTRACT_DIR, "fact_sheet_contract_ed4.json")))).toBe(true);
  });
});

/** 'a.b[].c' 의 마지막 키를 담을 객체들. 중간이 없거나 null 이면 그 갈래는 없다. */
function containers(obj: Json, path: string): Array<[Record<string, unknown>, string]> {
  const parts = path.split(".");
  let nodes: Json[] = [obj];
  for (const part of parts.slice(0, -1)) {
    const many = part.endsWith("[]");
    const key = many ? part.slice(0, -2) : part;
    const next: Json[] = [];
    for (const node of nodes) {
      if (!node || typeof node !== "object" || node[key] == null) continue;
      if (many) next.push(...(node[key] as Json[]).filter((v) => v && typeof v === "object"));
      else next.push(node[key]);
    }
    nodes = next;
  }
  const last = parts[parts.length - 1];
  return nodes.filter((n) => n && typeof n === "object").map((n) => [n, last]);
}

describe("판 3 요청에는 판 4 키가 하나도 없다(null 키 금지)", () => {
  const files: Array<[string, Json]> = [
    ...["binary", "multiclass", "multilabel", "legacy_main"].map(
      (t) => [`contract/fact_sheet_${t}.json`, readJson(resolve(CONTRACT_DIR, `fact_sheet_${t}.json`))] as [string, Json],
    ),
    ...readdirSync(NEW_RUN_GOLDEN)
      .filter((f) => f.endsWith(".narrativeRequest.json"))
      .sort()
      .map((f) => [`edition3/newRun/golden/${f}`, readJson(resolve(NEW_RUN_GOLDEN, f))] as [string, Json]),
  ];

  it("판 4 키 목록은 report_edition 으로 시작하고, facts 안의 판 4 키는 둘이다(분포 차 글자·최약 클래스 F1 글자)", () => {
    expect(ED4_ONLY.length).toBeGreaterThanOrEqual(10);
    expect(new Set(ED4_ONLY).size).toBe(ED4_ONLY.length);
    expect(ED4_ONLY[0]).toBe("report_edition");
    // S2·S3 검토 D2·D3 으로 facts.weakest_class.f1_text 가 더해졌다(명세 원칙 'facts 안 판 4 키 둘').
    expect(ED4_ONLY.filter((p) => p.includes(".facts."))).toEqual([
      "fact_sheet.facts.distribution_shift[].evaluation_minus_training_text",
      "fact_sheet.facts.weakest_class.f1_text",
    ]);
  });

  it("계약 판 3 예시 4개와 플래그 끈 새 성적서 정답 요청 3개", () => {
    expect(files.length).toBe(7);
    const hits = files.flatMap(([name, req]) =>
      ED4_ONLY.flatMap((path) => containers(req, path).filter(([node, key]) => key in node).map(() => `${name}: ${path}`)),
    );
    expect(hits).toEqual([]);
    const kinds = new Set(files.flatMap(([, req]) => (req.fact_sheet?.problems ?? []).map((p: Json) => p.kind)));
    expect(kinds.size).toBeGreaterThan(0);
    expect(kinds.has("same_source")).toBe(false);
  });

  it("판 3 정답 요청에 판 4 키가 들어가면 이 검사가 잡는다(자기 검문)", () => {
    const [, req] = files.find(([name]) => name.includes("bc_strong"))!;
    const bent = structuredClone(req);
    bent.fact_sheet.metrics[0].ci_low_text = null; // null 키도 키다
    bent.fact_sheet.facts.distribution_shift[0].evaluation_minus_training_text = "0.002";
    const hits = ED4_ONLY.filter((path) => containers(bent, path).some(([node, key]) => key in node));
    expect(hits).toEqual(["fact_sheet.metrics[].ci_low_text", "fact_sheet.facts.distribution_shift[].evaluation_minus_training_text"]);
  });
});

// ── 대조 표: 기준 구현(toFixed — 이진 값 그대로의 절반에서 0에서 먼 쪽) ─────────────────────

const unneg = (t: string) => (t.startsWith("-") && /^[0.]+$/.test(t.slice(1)) ? t.slice(1) : t);
const meets = (v: number, t: number, hib: boolean) => (hib ? difference(v, t) >= 0 : difference(v, t) <= 0);

function refJudged(value: number, threshold: number, hib: boolean, ok: boolean): string {
  for (let d = 3; d <= 6; d += 1) {
    const text = value.toFixed(d);
    if (meets(Number(text), threshold, hib) === ok) return unneg(text);
  }
  const scale = 1e6;
  const cut = (hib === ok ? Math.ceil(value * scale) : Math.floor(value * scale)) / scale;
  return unneg(cut.toFixed(6));
}

function refSignedJudged(value: number, threshold: number, ok: boolean): string {
  const magnitude = refJudged(Math.abs(value), threshold, true, ok);
  return value < 0 && /[1-9]/.test(magnitude) ? `-${magnitude}` : magnitude;
}

function refCiBound(raw: number, target: number): string {
  const want = Math.sign(difference(raw, target));
  for (let d = 3; d <= 6; d += 1) {
    const text = raw.toFixed(d);
    if (Math.sign(difference(Number(text), target)) === want) return unneg(text);
  }
  const scale = 1e6;
  return unneg(((want < 0 ? Math.floor(raw * scale) : Math.ceil(raw * scale)) / scale).toFixed(6));
}

function moved(text: string): [string, string] {
  const sign = text.startsWith("-") ? "-" : "";
  const [whole, frac = ""] = text.replace(/^-/, "").split(".");
  const digits = whole + frac.padEnd(2, "0");
  const point = whole.length + 2;
  const head = digits.slice(0, point).replace(/^0+/, "") || "0";
  const tail = digits.slice(point) || "0";
  return [sign, `${head}.${tail}`];
}

function refPercent(text: string): string {
  const [sign, body] = moved(text);
  return `${/[1-9]/.test(body) ? sign : ""}${body}%`;
}

function refPercentPoint(text: string): string {
  const [sign, body] = moved(text);
  if (!/[1-9]/.test(body)) return `${body}%p`;
  return `${sign ? "−" : "+"}${body}%p`;
}

const refSignedCount = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

/** 가장 짧은 십진 표기를 고정소수로 — 원값으로 되돌아오는 가장 적은 자릿수(String 의 지수 꼴을 거치지 않는다). */
function refGiven(value: number): string {
  for (let d = 0; d <= 20; d += 1) {
    const text = value.toFixed(d);
    if (Number(text) === value) return text;
  }
  throw new Error(`표기할 수 없는 값 ${value}`);
}

function refTarget(value: number): string {
  const given = refGiven(value);
  const decimals = given.includes(".") ? given.split(".")[1].length : 0;
  if (decimals <= 3) return unneg(value.toFixed(3));
  if (decimals <= 6) return unneg(given);
  return unneg(value.toFixed(6));
}

function refDistinct(value: number, others: number[]): string {
  const rivals = others.filter((o) => o.toFixed(6) !== value.toFixed(6));
  for (let d = 3; d <= 6; d += 1) {
    if (rivals.every((o) => o.toFixed(d) !== value.toFixed(d))) return unneg(value.toFixed(d));
  }
  return unneg(value.toFixed(6));
}

function refNumber(c: Json): string {
  switch (c.rule) {
    case "plain":
      return unneg(Number(c.value).toFixed(3));
    case "judged":
      return refJudged(c.value, c.threshold, c.higher_is_better, c.meets);
    case "signed_judged":
      return refSignedJudged(c.value, c.threshold, c.meets);
    case "ci_bound":
      return refCiBound(c.raw, c.target);
    case "percent":
      return refPercent(c.text);
    case "percent_point":
      return refPercentPoint(c.text);
    case "signed_count":
      return refSignedCount(c.value);
    case "given":
      return refGiven(c.value);
    case "target":
      return refTarget(c.value);
    case "latency":
      return unneg(Number(c.value).toFixed(2));
    case "distinct":
      return refDistinct(c.value, c.others);
    default:
      throw new Error(`모르는 규칙 ${c.rule}`);
  }
}

const RULES = [
  "plain",
  "judged",
  "signed_judged",
  "ci_bound",
  "percent",
  "percent_point",
  "signed_count",
  "given",
  "target",
  "latency",
  "distinct",
];

describe("판 4 숫자 표기 대조 표(백엔드와 같은 표)", () => {
  it("규칙마다 여러 줄이 있고, 함수 이름 약속은 명세와 같다", () => {
    const cases: Json[] = TABLE.number_cases;
    expect(new Set(cases.map((c) => c.rule))).toEqual(new Set(RULES));
    for (const rule of RULES) expect([rule, cases.filter((c) => c.rule === rule).length >= 4]).toEqual([rule, true]);
    for (const rule of RULES) expect(TABLE.rules).toHaveProperty(rule);
    expect(TABLE.functions).toEqual(SPEC.function_names);
  });

  it.each((TABLE.number_cases as Json[]).map((c) => [`${c.rule}:${c.expected}`, c] as const))("%s", (_name, c) => {
    expect(refNumber(c)).toBe(c.expected);
  });

  it("기준 구현은 비튼 기대값을 모두 잡는다(자기 검문)", () => {
    const cases: Json[] = TABLE.number_cases;
    expect(cases.filter((c) => refNumber(c) === `${c.expected}0`).length).toBe(0);
  });

  it("판정 대상 값(judged)은 지금의 formatJudgedValue 와 같다 — 판 4 judged 는 판 3 value_text 규칙 그대로", () => {
    const judged = (TABLE.number_cases as Json[]).filter((c) => c.rule === "judged");
    expect(judged.length).toBeGreaterThan(10);
    for (const c of judged) {
      expect([c.source, unneg(formatJudgedValue(c.value, c.threshold, c.higher_is_better, c.meets))]).toEqual([c.source, c.expected]);
    }
  });

  it("사실 시트 *_text 에 싣는 규칙의 결과는 숫자 꼴, 그리는 규칙의 결과는 숫자 꼴이 아니다", () => {
    const num = /^-?\d+(\.\d+)?$/;
    const cases: Json[] = TABLE.number_cases;
    const text = cases.filter((c) => ["plain", "judged", "signed_judged", "ci_bound"].includes(c.rule));
    expect(text.length).toBeGreaterThan(0);
    expect(text.filter((c) => !num.test(c.expected))).toEqual([]);
    const drawn = cases.filter((c) => ["percent", "percent_point", "signed_count"].includes(c.rule) && c.expected !== "0");
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.filter((c) => num.test(c.expected))).toEqual([]);
  });

  it("예시본 4~5절의 숫자 표기는 모두 표에 있다", () => {
    const produced = new Set<string>();
    for (const c of TABLE.number_cases as Json[]) {
      if (c.trap) continue;
      produced.add(c.expected);
      produced.add(c.expected.replace(/^-/, ""));
    }
    for (const e of TABLE.engine_texts as Json[]) produced.add(e.expected);
    expect((TABLE.example_numbers as string[]).length).toBeGreaterThan(30);
    expect((TABLE.example_numbers as string[]).filter((n) => !produced.has(n))).toEqual([]);
  });
});

// ── 조사: 판 4 `josa(word, pair)`(S3 ②) 가 표 전부를 덮는다. 판 3 함수는 자기가 맡던 줄에서 josa 와 같은 답이어야 한다 ──

/** 판 3 함수가 맡던 갈래(과/와·은/는·으로/로·숫자 뒤 을/를). 이/가와 이름 뒤 을/를은 판 3 함수가 없다. */
function existingJosa(c: Json): string | null {
  if (c.pair === "과/와") return josaWaGwa(c.word);
  if (c.pair === "은/는") return josaEunNeun(c.word);
  // 판 3 josaEuroRo 에는 '끝소리 모름' 갈래가 없다(모르면 "로") — 판 4 josa 의 "(으)로" 줄(S2·S3 검토 T14 로 더한 'Σ')은 판 3 함수가
  // 맡던 줄이 아니다. 판 3 함수는 얼린 출력이라 고치지 않는다.
  if (c.pair === "으로/로") return String(c.source).startsWith("끝소리를 모르는 말") ? null : josaEuroRo(c.word);
  if (c.pair === "을/를" && c.kind === "number") return josaEulReul(c.word);
  return null;
}

describe("판 4 조사 대조 표(백엔드와 같은 표)", () => {
  const cases: Json[] = TABLE.josa_cases;

  it("숫자·이름 모두 다섯 쌍이 있다", () => {
    for (const kind of ["number", "name"]) {
      for (const pair of ["이/가", "을/를", "은/는", "과/와", "으로/로"]) {
        expect([kind, pair, cases.some((c) => c.kind === kind && c.pair === pair)]).toEqual([kind, pair, true]);
      }
    }
  });

  it.each(cases.map((c) => [`${c.word}${c.expected}`, c] as const))("%s", (_name, c) => {
    expect(josa(c.word, c.pair)).toBe(c.expected);
  });

  it("판 3 함수가 맡던 줄에서는 판 3 함수도 같은 답이다(두 벌 규칙이 아니다)", () => {
    const covered = cases.filter((c) => existingJosa(c) !== null);
    expect(covered.length).toBeGreaterThan(30);
    expect(covered.filter((c) => existingJosa(c) !== josa(c.word, c.pair)).map((c) => c.word)).toEqual([]);
    // 판 3 함수가 없던 갈래가 실제로 표에 있다 — josa 만 볼 수 있다.
    expect(cases.some((c) => existingJosa(c) === null && c.pair === "이/가")).toBe(true);
    expect(cases.some((c) => existingJosa(c) === null && c.pair === "을/를" && c.kind === "name")).toBe(true);
  });

  it.each((TABLE.chains as Json[]).map((c) => [c.expected, c] as const))("숫자 → 조사: %s", (_name, chain) => {
    const text = refNumber(chain.number);
    expect(text + josa(text, chain.pair)).toBe(chain.expected);
    if (chain.edition3_text) {
      const old = (chain.edition3_text as string).replace(/[가-힣]+$/, "");
      expect(old).not.toBe(text);
      expect(old + josaEuroRo(old)).toBe(chain.edition3_text);
    }
  });
});

// ── 칸 → 자리 ────────────────────────────────────────────────────────────────────

describe("서술 칸 → 판 4 자리 대응표", () => {
  it("칸 목록은 작성 기록 상자의 칸과 같고, 판 4 자리는 5.1~5.6·6 이다", () => {
    const slots = (SLOTS.slots as Json[]).map((s) => s.slot);
    expect(slots.length).toBe(7);
    expect(new Set(slots)).toEqual(new Set(NARRATIVE_RECORD_SECTIONS.map(([section]) => section)));
    expect(NARRATIVE_RECORD_SECTIONS.map(([section]) => section)).toEqual(SLOTS.order_edition3);
    expect(slots).toEqual(SLOTS.order_edition4);
    expect((SLOTS.slots as Json[]).map((s) => s.edition4_place)).toEqual(["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "6"]);
    expect((SLOTS.recommend_sections as Json[]).map((r) => [r.slot, r.edition4_place])).toEqual([
      ["9.1", "6.1"],
      ["9.2", "6.2"],
    ]);
  });

  it("작성 기록 줄은 승인된 B26 글자, 머리는 B25 글자다", () => {
    const lines = SLOTS.record_panel.lines as Json[];
    expect(lines.map((l) => l.text).join(" / ")).toBe(
      "5.1 판정과 불확실성(8.2 칸) / 5.2 오분류(7.1 칸) / 5.3 데이터 분포(7.2 칸) / 5.4 참조 범위(8.1 칸) / " +
        "5.5 운영 위험(8.3 칸) / 5.6 추가 관찰(7.3 칸) / 6 개선 권고(9 칸)",
    );
    (SLOTS.slots as Json[]).forEach((slot, i) => {
      expect(lines[i].slot).toBe(slot.slot);
      expect(lines[i].text).toBe(`${slot.edition4_place} ${slot.edition4_title}(${slot.slot} 칸)`);
    });
    expect(SLOTS.record_panel.header + SLOTS.record_panel.header_note).toBe(
      "작성 기록 · 5·6절 칸마다 쓴 방식(화면에만 보이며 인쇄본에는 없습니다)",
    );
  });
});
