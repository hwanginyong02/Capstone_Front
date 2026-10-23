/**
 * 판 4 라운드 S1 검토 — 계약 평가 응답 사본(`src/test/contract/evaluate_*.json`)이 판 4 새 칸을 지닌 채 낡지 않는가.
 *
 * - 이 사본은 백엔드 `tests/golden/evaluate_*.json` 과 바이트까지 같아야 한다. 그 대조(`factSheetContract.test.ts`
 *   "골든 평가 응답 사본 = 백엔드 골든")는 옆 저장소가 있을 때만 돌아, CI(저장소 하나)에서는 새 칸을 지우거나 값을
 *   바꿔도 아무 시험도 실패하지 않았다. 판 3 파서는 새 칸을 읽지 않으므로 다른 시험도 반응하지 않는다.
 * - 그래서 여기서는 옆 저장소를 읽지 않고(skipIf 없음) 사본만으로 본다.
 *   ① 세 사본의 sha256 — 바뀌면 백엔드 골든을 `UPDATE_GOLDEN=1 pytest tests/test_evaluate_router.py` 로 다시 뜬 뒤
 *      사본을 바이트 그대로 옮기고, 바뀐 이유와 함께 아래 값을 고친다.
 *   ② 새 칸 집합과 대표값 — sha 를 고칠 때 새 칸이 함께 빠지지 않았는지 본다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CONTRACT_DIR = resolve(__dirname, "../contract");
const readCopy = (name: string) => JSON.parse(readFileSync(resolve(CONTRACT_DIR, name), "utf8"));

/** 판 4 라운드 S1(백엔드 e15a109 기준) 백엔드 골든과 같은 바이트. */
const EVALUATE_COPY_SHA256: Record<string, string> = {
  "evaluate_binary_csv.json": "bcc6543255de9561f786dd58566711b1b80df3bfbd3c4837dbfaadc27a45a71e",
  "evaluate_multiclass_csv.json": "11d70a93343ec907b4249b8987ee5f0b1c6f8ef8586de2d68966fa570c0117f7",
  "evaluate_multilabel_csv.json": "da1f63d90e4e3a46759a7751530b2d2d5de4b05a2660f5b087002b246741421c",
};

const IMBALANCE_RAW_KEYS = [
  "imbalance_ratio_raw",
  "accuracy_minus_macro_f1_raw",
  "majority_minus_minority_f1_raw",
  "accuracy_raw",
  "macro_f1_raw",
  "majority_f1_raw",
  "minority_f1_raw",
];

type Interval = { low: number | null; high: number | null; low_raw?: number | null; high_raw?: number | null };

describe("계약 평가 응답 사본 — 판 4 새 칸(옆 저장소 없이)", () => {
  it("세 사본은 박아 둔 sha256 과 바이트까지 같다", () => {
    const actual = Object.fromEntries(
      Object.keys(EVALUATE_COPY_SHA256).map((name) => [
        name,
        createHash("sha256").update(readFileSync(resolve(CONTRACT_DIR, name))).digest("hex"),
      ]),
    );
    expect(actual).toEqual(EVALUATE_COPY_SHA256);
  });

  it("최상위 source_file·engine_version", () => {
    const expected: Record<string, unknown> = {
      "evaluate_binary_csv.json": { sha256: "58580086a1c6173120449862ac0f203a8d32122a23faf88833aa7df284207433", size_bytes: 4434 },
      "evaluate_multiclass_csv.json": { sha256: "14fc967358890d88f53a0065c0f79188f66ae000771ce518014e32756b3d7aca", size_bytes: 5705 },
      "evaluate_multilabel_csv.json": { sha256: "9ea5b889a2406e561e155a5a008d9683d831d70f8777acccd3b698c06540fdfe", size_bytes: 10009 },
    };
    for (const [name, sourceFile] of Object.entries(expected)) {
      const j = readCopy(name);
      expect([name, j.source_file, j.engine_version]).toEqual([name, sourceFile, "1.0.0"]);
    }
  });

  it("신뢰구간마다 low_raw·high_raw 가 있고 넷째 자리 칸은 그 반올림이다", () => {
    for (const name of Object.keys(EVALUATE_COPY_SHA256)) {
      const intervals = readCopy(name).results.success_metrics.confidence_intervals as Record<string, Interval>;
      expect([name, Object.keys(intervals).length > 0]).toEqual([name, true]);
      for (const [id, ci] of Object.entries(intervals)) {
        expect([name, id, "low_raw" in ci, "high_raw" in ci]).toEqual([name, id, true, true]);
        if (ci.low_raw != null) expect([name, id, Number(ci.low_raw.toFixed(4))]).toEqual([name, id, ci.low]);
        if (ci.high_raw != null) expect([name, id, Number(ci.high_raw.toFixed(4))]).toEqual([name, id, ci.high]);
      }
    }
    // 대표값 — 이진 M1(Wilson) 경계 원값.
    const m1 = readCopy("evaluate_binary_csv.json").results.success_metrics.confidence_intervals.M1;
    expect([m1.low_raw, m1.high_raw]).toEqual([0.43627000033527485, 0.5735415464009526]);
  });

  it("불균형 영향의 원값 7칸", () => {
    const ratio: Record<string, number> = {
      "evaluate_binary_csv.json": 1.105263157894737,
      "evaluate_multiclass_csv.json": 1.2982456140350878,
      "evaluate_multilabel_csv.json": 1.1030927835051547,
    };
    for (const [name, r] of Object.entries(ratio)) {
      const effect = readCopy(name).results.success_metrics.imbalance_effect;
      expect([name, IMBALANCE_RAW_KEYS.filter((k) => !(k in effect))]).toEqual([name, []]);
      expect([name, effect.imbalance_ratio_raw]).toEqual([name, r]);
    }
    // 멀티레이블은 정확도 갈래 셋이 null.
    const ml = readCopy("evaluate_multilabel_csv.json").results.success_metrics.imbalance_effect;
    expect([ml.accuracy_raw, ml.macro_f1_raw, ml.accuracy_minus_macro_f1_raw]).toEqual([null, null, null]);
  });

  it("이진 f1_threshold_gain 은 기존 6칸 + 판 4 13칸 그대로", () => {
    const gain = readCopy("evaluate_binary_csv.json").results.success_metrics.f1_threshold_gain;
    expect(gain).toEqual({
      max_f1: 0.6483,
      current_f1: 0.5123,
      gain: 0.136,
      best_threshold: 0.03,
      notable: true,
      gain_text: "0.136",
      best_recall: 0.9895,
      best_precision: 0.4821,
      current_recall: 0.5474,
      current_precision: 0.4815,
      max_f1_raw: 0.6482758620689655,
      current_f1_raw: 0.5123152709359606,
      gain_raw: 0.13596059113300485,
      best_threshold_raw: 0.03,
      best_recall_raw: 0.9894736842105263,
      best_precision_raw: 0.48205128205128206,
      current_recall_raw: 0.5473684210526316,
      current_precision_raw: 0.48148148148148145,
      best_threshold_text: "0.030",
    });
  });
});
