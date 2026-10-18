/**
 * 확률 컬럼 이름 규칙(M3).
 *
 * 다중 클래스·다중 레이블에서 예측 컬럼 없이 확률만 매핑하면, 백엔드는 컬럼 이름에서 접두어를 떼어 낸
 * 나머지를 클래스·레이블 이름으로 본다. 종전에는 이 규칙을 화면이 알리지 않아 평가 단계에서야 400 을
 * 만났다. 이제 백엔드 검증이 "Probability column names" 오류로 앞당겨 막고, 업로드·매핑 화면이 규칙을
 * 미리 알린다. 접두어는 백엔드 `PROB_COLUMN_PREFIXES` 의 사본이라 대조한다.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PROBABILITY_COLUMN_PREFIXES, probabilityColumnNameRule } from "./evaluationData";
import { DataUpload } from "../components/data-upload/DataUpload";
import { RequiredColumnsCard } from "../components/column-mapping/RequiredColumnsCard";

describe("확률 컬럼 이름 규칙 문장", () => {
  it("다중 클래스는 클래스, 다중 레이블은 레이블 — 접두어를 모두 적고 예를 든다", () => {
    expect(PROBABILITY_COLUMN_PREFIXES.length).toBeGreaterThan(0);
    const multiclass = probabilityColumnNameRule("multiclass")!;
    const multilabel = probabilityColumnNameRule("multilabel")!;
    for (const prefix of PROBABILITY_COLUMN_PREFIXES) {
      expect(multiclass).toContain(prefix);
      expect(multilabel).toContain(prefix);
    }
    expect(multiclass).toContain("클래스 이름");
    expect(multiclass).toContain("prob_cat");
    expect(multilabel).toContain("레이블 이름");
    expect(multilabel).toContain("score_sports");
    expect(multiclass).toContain("검증 화면에서 막힙니다");
  });

  it("이진은 확률 컬럼이 하나라 이름을 보지 않는다 — 안내하지 않는다", () => {
    expect(probabilityColumnNameRule("binary")).toBeNull();
  });

  // 백엔드 저장소가 옆에 없으면(프론트만 받은 CI) 대조를 건너뛴다. 파일을 읽기 전에 확인한다.
  const backendPreprocessor = resolve(__dirname, "../../../Capstone_Back/app/evaluation/preprocessor.py");
  it.skipIf(!existsSync(backendPreprocessor))("접두어는 백엔드 PROB_COLUMN_PREFIXES 와 같은 순서·글자다", () => {
    const source = readFileSync(backendPreprocessor, "utf-8");
    const block = source.match(/^PROB_COLUMN_PREFIXES\s*=\s*\(([^)]*)\)/m);
    expect(block).not.toBeNull();
    const backend = [...block![1].matchAll(/"([^"]+)"|'([^']+)'/g)].map((m) => m[1] ?? m[2]);
    expect(backend.length).toBeGreaterThan(0);
    expect([...PROBABILITY_COLUMN_PREFIXES]).toEqual(backend);
  });
});

describe("화면 — 업로드와 매핑이 같은 문장을 보인다", () => {
  const upload = (taskType: "binary" | "multiclass" | "multilabel") =>
    render(
      <DataUpload taskType={taskType} uploadedFile={null} onUploadedFileChange={() => {}} evalDataPicks={undefined} />,
    );

  it("업로드: 다중 클래스의 클래스별 확률 안내에 규칙이 있다", () => {
    upload("multiclass");
    expect(screen.getByText(probabilityColumnNameRule("multiclass")!, { exact: false })).toBeInTheDocument();
  });

  it("업로드: 다중 레이블의 레이블별 확률 안내에 규칙이 있다", () => {
    upload("multilabel");
    expect(screen.getByText(probabilityColumnNameRule("multilabel")!, { exact: false })).toBeInTheDocument();
  });

  it("업로드: 이진에는 이름 규칙 안내가 없다", () => {
    upload("binary");
    expect(screen.queryByText(/확률 컬럼 이름은 접두어/)).toBeNull();
  });

  it("매핑: 다중 클래스·다중 레이블은 규칙을, 이진은 보이지 않는다", () => {
    const { unmount } = render(<RequiredColumnsCard taskType="multiclass" requiredRoles={[]} roleCounts={{}} />);
    expect(screen.getByText(probabilityColumnNameRule("multiclass")!)).toBeInTheDocument();
    unmount();

    const second = render(<RequiredColumnsCard taskType="multilabel" requiredRoles={[]} roleCounts={{}} />);
    expect(screen.getByText(probabilityColumnNameRule("multilabel")!)).toBeInTheDocument();
    second.unmount();

    render(<RequiredColumnsCard taskType="binary" requiredRoles={[]} roleCounts={{}} />);
    expect(screen.queryByText(/확률 컬럼 이름은 접두어/)).toBeNull();
  });
});
