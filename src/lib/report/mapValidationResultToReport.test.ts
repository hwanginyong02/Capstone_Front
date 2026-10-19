/**
 * 검증 항목의 한국어 이름(M3·M4).
 *
 * 백엔드가 새 검증 항목 "Probability column names"(확률 컬럼 이름, error)와 "Latency unit"(지연시간 단위,
 * warning)을 낸다. 이름 표에 없으면 검증 화면과 성적서 6절에 영문 이름이 그대로 찍힌다. 백엔드가 내는
 * 이름 전부가 표에 있는지 대조한다 — 새 항목은 상수(`*_CHECK`)를 `name=` 에 넘기므로 상수 정의 줄도 모은다.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { CHECK_NAME_KO, checkNameKo, mapValidationResultToReport } from "./mapValidationResultToReport";
import type { ValidateDataResponseData } from "../../types/validation.types";

const response = (details: ValidateDataResponseData["validation_details"]): ValidateDataResponseData =>
  ({
    execution_summary: [],
    validation_details: details,
  }) as unknown as ValidateDataResponseData;

describe("새 검증 항목의 한국어 이름", () => {
  it("확률 컬럼 이름 · 지연시간 단위", () => {
    expect(checkNameKo("Probability column names")).toBe("확률 컬럼 이름");
    expect(checkNameKo("Latency unit")).toBe("지연시간 단위");
  });

  it("성적서 6절 검증 표도 같은 이름을 쓴다", () => {
    const mapped = mapValidationResultToReport(
      response([
        { name: "Probability column names", result: "x", handling: "", status: "error", group: "multiclass" },
        { name: "Latency unit", result: "All 3 values < 1 (max=0.5)", handling: "", status: "warning", group: "latency" },
      ] as ValidateDataResponseData["validation_details"]),
      3,
    );
    expect(mapped.dataValidation.map((row) => row.checkName)).toEqual(["확률 컬럼 이름", "지연시간 단위"]);
    expect(mapped.dataValidation.map((row) => row.status)).toEqual(["fail", "warning"]);
  });

  it("확률 컬럼 이름의 결과는 한국어 문구라 영문 낱말 바꾸기를 하지 않는다", () => {
    // 백엔드 문구 그대로 — 데이터의 클래스 이름 'rows'·'found' 가 '건'·'발견'으로 바뀌면 안 된다.
    const result =
      "확률 컬럼 ['prob_a', 'prob_b'] 의 이름에서 클래스를 확정할 수 없습니다(데이터의 클래스: ['found', 'rows']). " +
      "컬럼명을 'prob_<클래스명>' 처럼 짓거나 예측 컬럼을 직접 매핑해 주세요.";
    const mapped = mapValidationResultToReport(
      response([
        { name: "Probability column names", result, handling: "", status: "error", group: "multiclass" },
        { name: "Missing value", result: "3 rows", handling: "", status: "warning", group: "common" },
      ] as ValidateDataResponseData["validation_details"]),
      10,
    );
    expect(mapped.dataValidation[0].detail).toBe(result);
    // 다른 항목은 종전대로 바꾼다.
    expect(mapped.dataValidation[1].detail).toBe("3 건");
  });

  it("라벨 표기 맞춤(S2)도 한국어 문구라 클래스 이름을 바꾸지 않는다", () => {
    const result = "정답 ' rows' → 'rows'; 예측 'classes' · ' classes' → 'classes'";
    const mapped = mapValidationResultToReport(
      response([
        { name: "Label notation", result, handling: "", status: "warning", group: "common" },
      ] as ValidateDataResponseData["validation_details"]),
      4,
    );
    expect(mapped.dataValidation[0].checkName).toBe("라벨 표기 맞춤");
    expect(mapped.dataValidation[0].detail).toBe(result);
  });

  // 백엔드 저장소가 옆에 없으면(프론트만 받은 CI) 대조를 건너뛴다. 파일을 읽기 전에 확인한다.
  const backendChecks = resolve(__dirname, "../../../../Capstone_Back/app/analysis/validation_checks.py");
  it.skipIf(!existsSync(backendChecks))("백엔드가 내는 검증 항목 이름은 모두 한국어 이름이 있다", () => {
    const source = readFileSync(backendChecks, "utf-8");
    const names = new Set<string>();
    // name="A" 와 name="A" if … else "B"
    for (const m of source.matchAll(/name="([^"]+)"(?:\s+if\b[\s\S]*?\belse\s+"([^"]+)")?/g)) {
      names.add(m[1]);
      if (m[2]) names.add(m[2]);
    }
    // 상수로 넘기는 새 항목 — PROBABILITY_COLUMN_NAMES_CHECK = "…", LATENCY_UNIT_CHECK = "…"
    const constants = [...source.matchAll(/^([A-Z_]+_CHECK)\s*=\s*"([^"]+)"/gm)];
    expect(constants.map((m) => m[1]).sort()).toEqual(["LATENCY_UNIT_CHECK", "PROBABILITY_COLUMN_NAMES_CHECK"]);
    constants.forEach((m) => names.add(m[2]));

    expect(names.size).toBeGreaterThan(15);
    expect(names).toContain("Probability column names");
    expect(names).toContain("Latency unit");
    expect(names).toContain("Column mapped to multiple roles");
    const missing = [...names].filter((name) => !(name in CHECK_NAME_KO));
    expect(missing).toEqual([]);
  });
});
