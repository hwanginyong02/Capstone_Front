/**
 * 업로드 크기 상한 — ISSUES.md G-04a / D-15.
 *
 * 백엔드가 20 MiB 상한을 걸었는데(413) 프론트는 "up to 100MB"라고 안내하고 사전
 * 검사가 없었다. 사용자는 약속된 크기를 다 올린 뒤에야 거절당한다.
 * 상한 값은 두 저장소가 같아야 하므로 여기서 고정한다.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, checkUploadSize, formatMib } from "./uploadLimits";

describe("업로드 크기 사전 검사", () => {
  it("백엔드 상한(20 MiB)과 같은 값을 쓴다", () => {
    expect(MAX_UPLOAD_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_UPLOAD_LABEL).toBe("20 MiB");
  });

  it("상한을 넘으면 한국어 사유를 돌려준다 — 파일 이름과 지금 크기(MiB), 둘째 문장은 백엔드 413 과 같다(M6)", () => {
    const reason = checkUploadSize({ name: "big.csv", size: 25 * 1024 * 1024 });
    expect(reason).toBe("파일이 너무 큽니다(big.csv, 25.0 MiB). 평가 파일은 20 MiB 이하만 올릴 수 있습니다.");
  });

  it("상한을 조금 넘은 파일의 크기는 올려 적어 상한과 같아 보이지 않는다", () => {
    expect(checkUploadSize({ name: "edge.csv", size: MAX_UPLOAD_BYTES + 1 })).toContain("(edge.csv, 20.1 MiB)");
  });

  it("MiB 표기 — 딱 떨어지면 정수, 아니면 소수 한 자리(백엔드 format_mib 와 같다)", () => {
    expect(formatMib(20 * 1024 * 1024)).toBe("20 MiB");
    expect(formatMib(1.5 * 1024 * 1024)).toBe("1.5 MiB");
  });

  it("경계값(상한과 같은 크기)은 통과시킨다", () => {
    expect(checkUploadSize({ name: "edge.csv", size: MAX_UPLOAD_BYTES })).toBeNull();
  });

  it("정상 크기는 통과시킨다", () => {
    expect(checkUploadSize({ name: "ok.csv", size: 1024 })).toBeNull();
  });
});

// 백엔드 저장소가 옆에 없으면(프론트만 받은 CI) 대조를 건너뛴다. 파일을 읽기 전에 확인한다.
const backendUpload = resolve(__dirname, "../../../../Capstone_Back/app/core/upload.py");
describe("백엔드 대조", () => {
  it.skipIf(!existsSync(backendUpload))("상한은 백엔드 MAX_UPLOAD_BYTES 와 같다", () => {
    const source = readFileSync(backendUpload, "utf-8");
    const match = source.match(/^MAX_UPLOAD_BYTES\s*=\s*([\d\s*_]+)$/m);
    expect(match).not.toBeNull();
    const backend = match![1]
      .split("*")
      .map((part) => Number(part.replace(/[\s_]/g, "")))
      .reduce((a, b) => a * b, 1);
    expect(backend).toBe(MAX_UPLOAD_BYTES);
  });

  it.skipIf(!existsSync(backendUpload))("413 문구의 둘째 문장이 백엔드와 같은 글이다", () => {
    const source = readFileSync(backendUpload, "utf-8");
    expect(source).toContain("평가 파일은 {format_mib(limit)} 이하만 올릴 수 있습니다.");
    expect(checkUploadSize({ name: "a.csv", size: MAX_UPLOAD_BYTES + 1 })).toContain(
      `평가 파일은 ${MAX_UPLOAD_LABEL} 이하만 올릴 수 있습니다.`,
    );
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
