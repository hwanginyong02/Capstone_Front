/**
 * 예시본 사본(`example.md`) — RPT-2026-0001 을 판 4 목차로 다시 묶은 목표 모양(설계 문서 예시본 rev 84)을 바이트 그대로 옮긴 것.
 * 렌더러 시험(`render/renderEd4.tsx` 의 `exampleBlock`)이 이 파일에서 절·소절 블록을 뽑아 그린 글과 대조한다.
 *
 * 고정 문구 사본(`fixedWording.ed4.json`)을 뽑을 때 적은 예시본 sha256 과 같아야 한다 — 다르면 두 사본이 서로 다른 판의 예시본이다.
 * 사본은 손으로 고치지 않는다(첫 줄 "예시본 메모"는 성적서 내용이 아니며, 비교기가 가린다).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const EXAMPLE = resolve(__dirname, "example.md");
const WORDING = JSON.parse(readFileSync(resolve(__dirname, "../fixedWording.ed4.json"), "utf8"));

describe("예시본 사본", () => {
  it("sha256 이 고정 문구 사본의 _about.example_sha256 과 같다", () => {
    const sha = createHash("sha256").update(readFileSync(EXAMPLE)).digest("hex");
    expect(sha).toBe(WORDING._about.example_sha256);
    expect(sha).toBe("deb9946b1a8659647754c06c9c0a95f97692f36c8b068eb3ec849b8e488f5917");
  });

  it("표지 제목과 끝 줄이 있다(잘린 사본이 아님)", () => {
    const lines = readFileSync(EXAMPLE, "utf8").split("\n");
    expect(lines[2]).toBe("# 기계학습 분류 성능 시험성적서");
    expect(lines.at(-1)).toBe("— 끝 —");
  });
});
