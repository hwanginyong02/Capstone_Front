/**
 * 판 4 그린 글 정답(판 4 라운드 S6 ⑨) — 세 입력(bc_strong·digits_strong·yeast_strong) × (미발급 final, 발급본 issued) × 세 경로
 * (화면·인쇄·번호 열기)의 **그린 글 전체**를 `text/` 의 정적 텍스트 파일과 `toBe` 로 대조한다. 판 3 보관본 정답
 * (`archive/issued/golden/`)과 같은 방식이다: 평소에는 다시 그린 글과 파일을 견주기만 하고, 파일은 `UPDATE_ED4_TEXT=1` 일 때만 쓴다
 * (`-u` 스냅샷이 아니다). 언제 다시 떠도 되는지는 `text/README.md`.
 *
 * - 화면: `screenText(loadEd4(tag, kind))`.
 * - 인쇄: `printText(loadEd4(tag, kind))`(서술 끝남 상태로 연다).
 * - 번호 열기: 서버 보관본은 발급 전 데이터(`final`)다. issued = 실제 발급 기록(`loadEd4Issuance`)을 서버가 돌려준 경우, final = 발급
 *   기록을 서버가 못 준 경우(null). 페이지 전체(머리 상자·작성 기록 상자 포함).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { loadEd4, loadEd4Issuance, type Ed4Tag } from "./ed4Fixtures";
import { byNumberText, printText, screenText } from "./renderEd4";

const UPDATE = process.env.UPDATE_ED4_TEXT === "1";
const ED4_TEXT_DIR = resolve(__dirname, "text");

const TAGS: Ed4Tag[] = ["bc_strong", "digits_strong", "yeast_strong"];
const KINDS = ["final", "issued"] as const;
const PATHS = ["screen", "print", "byNumber"] as const;
type Kind = (typeof KINDS)[number];
type Path = (typeof PATHS)[number];

const ed4TextName = (tag: Ed4Tag, kind: Kind, path: Path) => `${tag}.${kind}.${path}.txt`;
const EXPECTED = TAGS.flatMap((tag) => KINDS.flatMap((kind) => PATHS.map((path) => ed4TextName(tag, kind, path))));

async function draw(tag: Ed4Tag, kind: Kind, path: Path): Promise<string> {
  if (path === "screen") return screenText(loadEd4(tag, kind));
  if (path === "print") return printText(loadEd4(tag, kind));
  return byNumberText(loadEd4(tag, "final"), kind === "issued" ? loadEd4Issuance(tag) : null);
}

const produced = new Map<string, string>();

beforeAll(async () => {
  for (const tag of TAGS)
    for (const kind of KINDS)
      for (const path of PATHS) produced.set(ed4TextName(tag, kind, path), await draw(tag, kind, path));
  if (UPDATE) for (const [name, text] of produced) writeFileSync(resolve(ED4_TEXT_DIR, name), text);
}, 120_000);

describe("판 4 그린 글 정답(text/) = 지금 코드가 그린 글(바이트)", () => {
  it("정답 폴더의 .txt 목록 = 3 입력 × 2 상태 × 3 경로 = 18개", () => {
    expect(EXPECTED).toHaveLength(18);
    const files = readdirSync(ED4_TEXT_DIR).filter((f) => f.endsWith(".txt")).sort();
    expect(files).toEqual([...EXPECTED].sort());
    expect([...produced.keys()].sort()).toEqual([...EXPECTED].sort());
  });

  it.each(EXPECTED)("%s", (name) => {
    const path = resolve(ED4_TEXT_DIR, name);
    expect(existsSync(path), `${name} 이 없다 — UPDATE_ED4_TEXT=1 로 처음 뜬다`).toBe(true);
    expect(produced.get(name)).toBe(readFileSync(path, "utf8"));
  });
});
