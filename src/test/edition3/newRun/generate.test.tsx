/**
 * 정답 생성기 — 평소에는 건너뛴다(`GENERATE_S0=1` 일 때만, CI 에는 이 변수가 없다).
 *
 * 정답 폴더에 직접 쓰지 않는다. `S0_OUT` 폴더(정답 폴더가 아닌 곳)에 쓰고, 사람이 운영 main 으로 뜬 것인지 확인한 뒤
 * 옮긴다. 절차는 README.md. 정답을 다시 뜨는 것은 붉은 신호다 — 코드를 고친다.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, vi } from "vitest";

import { FROZEN_NOW, GOLDEN_DIR, goldenNames, runNewReport, TAGS, TZ_PINNED } from "./newRun.harness";

const ENABLED = process.env.GENERATE_S0 === "1";

describe("S0 판 3 새 성적서 정답 생성기", () => {
  it.runIf(ENABLED)("S0_OUT 에 정답과 SHA256SUMS 를 쓴다", async () => {
    const out = process.env.S0_OUT;
    if (!out) throw new Error("S0_OUT 을 주세요(정답 폴더가 아닌 곳).");
    if (resolve(out) === GOLDEN_DIR) throw new Error("정답 폴더에 바로 쓰지 않는다.");
    mkdirSync(out, { recursive: true });
    const originalTz = process.env.TZ;
    process.env.TZ = TZ_PINNED;
    const sums: string[] = [];
    try {
      for (const tag of TAGS) {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(FROZEN_NOW());
        try {
          const captured = await runNewReport(tag);
          const names = goldenNames(tag);
          for (const [name, text] of [
            [names.stage1, captured.stage1],
            [names.request, captured.request],
            [names.final, captured.final],
          ] as const) {
            writeFileSync(resolve(out, name), text);
            sums.push(`${createHash("sha256").update(text).digest("hex")}  ${name}`);
          }
        } finally {
          vi.useRealTimers();
        }
      }
    } finally {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
    writeFileSync(resolve(out, "SHA256SUMS"), `${sums.sort((a, b) => (a.slice(66) < b.slice(66) ? -1 : 1)).join("\n")}\n`);
  }, 120_000);
});
