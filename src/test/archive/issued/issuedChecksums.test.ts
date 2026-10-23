/**
 * 판 2·3 보관본 정답 폴더의 지문(판 4 라운드 S0, 계획 2.5-1).
 *
 * `golden/SHA256SUMS` 는 이 폴더의 픽스처·정답 글·생성기 파일과 위 폴더의 손 픽스처 4개의 sha256 이다. 다시 계산해
 * 한 줄도 다르지 않아야 하고, 목록에 없는 파일이 생기거나 있던 파일이 없어져도 실패한다. 정답을 몰래 다시 뜨면
 * 이 목록까지 바꿔야 해서 diff 에 드러난다. **이 목록을 고쳐서 통과시키지 않는다 — 코드를 고친다**(README.md).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const HERE = __dirname;
const SUMS = resolve(HERE, "golden/SHA256SUMS");
const HAND = ["../schema2_binary.json", "../schema2_multiclass_noproblems.json", "../schema3_binary.json", "../schema3_binary_pass.json"];

function listed(): Array<[path: string, sha: string]> {
  return readFileSync(SUMS, "utf8")
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      const match = /^([0-9a-f]{64}) {2}(.+)$/.exec(line);
      if (!match) throw new Error(`SHA256SUMS 줄 모양이 아니다: ${line}`);
      return [match[2], match[1]];
    });
}

/** 목록에 들어야 하는 파일 — 이 폴더의 모든 파일(테스트·README·목록 자신 제외) + 손 픽스처 4개. */
function expectedFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (name === ".DS_Store") continue; // macOS 탐색기가 만드는 파일(.gitignore)
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(HERE, full).split("\\").join("/"));
    }
  };
  walk(HERE);
  return [...out.filter((p) => !/\.test\./.test(p) && p !== "README.md" && p !== "golden/SHA256SUMS"), ...HAND].sort();
}

const sha = (path: string) => createHash("sha256").update(readFileSync(resolve(HERE, path))).digest("hex");

describe("정답 폴더의 지문", () => {
  it("목록과 실제 파일 집합이 같다", () => {
    const paths = listed().map(([path]) => path);
    expect([...paths].sort()).toEqual(expectedFiles());
    // 정답 글은 56개(경로 3개 × 픽스처 16개 + 페이지 8개)다.
    expect(paths.filter((p) => /^golden\/.+\.txt$/.test(p))).toHaveLength(56);
  });

  it.each(listed())("%s", (path, expected) => {
    expect(sha(path)).toBe(expected);
  });
});
