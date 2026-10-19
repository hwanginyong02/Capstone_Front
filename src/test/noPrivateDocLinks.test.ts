/**
 * 저장소 문서와 코드가 저장소 밖의 개인 문서를 가리키지 않게 막는다(D2).
 *
 * 설계 원문을 claude.ai 링크나 개인 폴더 경로(capstone_md_file)로 가리키면, 그 문서를 열 수 없는 팀원은
 * 근거를 읽을 수 없다. 필요한 내용은 저장소 문서(docs/)에 옮겨 적는다.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const PRIVATE_LINK = /claude\.ai|claude docs|capstone_md_file/i;

function listFiles(dir: string, pattern: RegExp): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listFiles(path, pattern);
    return pattern.test(name) ? [path] : [];
  });
}

describe("저장소 밖 개인 문서 링크 없음", () => {
  const files = [
    ...listFiles(join(ROOT, "docs"), /\.md$/),
    ...listFiles(join(ROOT, "src"), /\.tsx?$/),
    join(ROOT, "README.md"),
  ].filter((path) => existsSync(path) && path !== __filename);

  it("문서·코드 어디에도 claude.ai·Claude Docs·capstone_md_file 이 없다", () => {
    expect(files.length).toBeGreaterThan(100);
    const hits = files.flatMap((path) =>
      readFileSync(path, "utf-8")
        .split("\n")
        .flatMap((line, index) =>
          PRIVATE_LINK.test(line) ? [`${relative(ROOT, path)}:${index + 1}`] : [],
        ),
    );
    expect(hits).toEqual([]);
  });
});
