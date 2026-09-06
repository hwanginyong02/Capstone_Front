/**
 * 업로드 크기 상한 — ISSUES.md G-04a / D-15.
 *
 * 백엔드가 20 MiB 상한을 걸었는데(413) 프론트는 "up to 100MB"라고 안내하고 사전
 * 검사가 없었다. 사용자는 약속된 크기를 다 올린 뒤에야 거절당한다.
 * 상한 값은 두 저장소가 같아야 하므로 여기서 고정한다.
 */
import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, checkUploadSize } from "./uploadLimits";

describe("업로드 크기 사전 검사", () => {
  it("백엔드 상한(20 MiB)과 같은 값을 쓴다", () => {
    expect(MAX_UPLOAD_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_UPLOAD_LABEL).toBe("20MB");
  });

  it("상한을 넘으면 사유를 돌려준다", () => {
    const reason = checkUploadSize({ name: "big.csv", size: MAX_UPLOAD_BYTES + 1 });
    expect(reason).not.toBeNull();
    expect(reason).toContain(MAX_UPLOAD_LABEL);
  });

  it("경계값(상한과 같은 크기)은 통과시킨다", () => {
    expect(checkUploadSize({ name: "edge.csv", size: MAX_UPLOAD_BYTES })).toBeNull();
  });

  it("정상 크기는 통과시킨다", () => {
    expect(checkUploadSize({ name: "ok.csv", size: 1024 })).toBeNull();
  });
});

describe("안내문이 실제 상한과 어긋나지 않는다", () => {
  it("src 어디에도 100MB 약속이 남아 있지 않다", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(tsx?|jsx?)$/.test(entry)) continue;
        if (full.includes(".test.")) continue;
        readFileSync(full, "utf8")
          .split("\n")
          .forEach((line, i) => {
            // 주석은 이력을 설명하느라 옛 문구를 인용할 수 있다 — 화면에 나가는 문자열만 본다.
            if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
            if (/100\s?MB/i.test(line)) offenders.push(`${full}:${i + 1}`);
          });
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });
});
