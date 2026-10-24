/**
 * 판 4 2절 시험 대상(갈래 b1) — bc_strong 을 화면·인쇄·번호 열기로 그려 예시본 "## 2. 시험 대상" 블록과 줄 전체를 맞춘다. 가림은
 * ○ 칸 2개(파일 해시·파일 크기)뿐이고, 그 자리는 실제 값(소문자 64자 해시, "3,727바이트")으로 바꿔 대조한다. 다중·멀티 픽스처로
 * 감지된 클래스 목록·클래스 레이블 설명·해당 없음 칸·제공되지 않음 칸을, 복사 데이터로 B30·해시 없음·학습 데이터 예시 표를 본다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { asRendered, cellsOf, fillCircles, partOf } from "../../../lib/report/edition4/render/coverTestKit";
import { loadEd4, loadEd4Issuance } from "../../../test/edition4/render/ed4Fixtures";
import { byNumberText, exampleBlock, printText, screenText } from "../../../test/edition4/render/renderEd4";
import type { FinalReportData } from "../../../types/finalReport.types";
import { Ed4Target } from "./Ed4Target";

const FIRST = "2. 시험 대상";
const NEXT = "3. 시험 방법";
const BC_SHA256 = "4ead9f2ccc8da32c0c3148f02ea6ff4e030c156d9873eeb99883df73f3a49f9d";
/** 원본 CSV — 저장소 안 사본(RPT-2026-0001 에 올린 파일 바이트 그대로, S6 ② 에서 옮김). */
const BC_CSV = resolve(__dirname, "../../../test/edition4/rpt0001/bc_strong.csv");

const copy = (data: FinalReportData, change: (d: FinalReportData) => void): FinalReportData => {
  const d = structuredClone(data);
  change(d);
  return d;
};

/** 그린 2절에서 `label` 로 시작하는 표 줄 하나의 칸 배열(정확히 하나여야 함). */
const rowOf = (lines: string[], label: string) => {
  const hits = lines.filter((l) => l.startsWith(`| ${label} |`));
  expect(hits).toHaveLength(1);
  return cellsOf(hits[0]);
};
/** 소제목 뒤 표/문단 줄(다음 소제목·소절 제목 앞까지 — `stop` 줄 앞). */
const between = (lines: string[], from: string, stop: string) => lines.slice(lines.indexOf(from), lines.indexOf(stop, lines.indexOf(from) + 1));

describe("2절 — bc_strong = 예시본 2절 블록(줄 전체·순서), 가림은 ○ 2개", () => {
  const block = exampleBlock("## 2. 시험 대상");
  const want = asRendered(fillCircles(block, [BC_SHA256, "3,727바이트"]));

  it("예시본 블록 자체: ○ 는 정확히 2개이고 해시·크기 칸이다", () => {
    expect(block.split("○").length - 1).toBe(2);
    expect(block).toContain("| 파일 해시(SHA-256) | ○ | 시스템 확인 |");
    expect(block).toContain("| 파일 크기 | ○ | 시스템 확인 |");
    expect(want).toHaveLength(58);
  });

  it("○ 칸 실제 값: 해시는 소문자 64자 전부, 크기는 3,727바이트", () => {
    const lines = partOf(screenText(loadEd4("bc_strong", "issued")), FIRST, NEXT);
    expect(rowOf(lines, "파일 해시(SHA-256)")).toEqual(["파일 해시(SHA-256)", BC_SHA256, "시스템 확인"]);
    expect(BC_SHA256).toMatch(/^[0-9a-f]{64}$/);
    expect(rowOf(lines, "파일 크기")).toEqual(["파일 크기", "3,727바이트", "시스템 확인"]);
  });

  it("해시·크기 = 원본 CSV 에서 직접 계산한 값(저장소 안 사본)", () => {
    const bytes = readFileSync(BC_CSV);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(BC_SHA256);
    expect(bytes.length).toBe(3727);
  });

  it("화면(발급본)", () => {
    expect(partOf(screenText(loadEd4("bc_strong", "issued")), FIRST, NEXT)).toEqual(want);
  });

  it("화면(미발급)", () => {
    expect(partOf(screenText(loadEd4("bc_strong", "final")), FIRST, NEXT)).toEqual(want);
  });

  it("인쇄", async () => {
    expect(partOf(await printText(loadEd4("bc_strong", "issued")), FIRST, NEXT)).toEqual(want);
  });

  it("번호 열기", async () => {
    const page = await byNumberText(loadEd4("bc_strong", "final"), loadEd4Issuance("bc_strong"), { dropRecord: true });
    expect(partOf(page, FIRST, NEXT)).toEqual(want);
  });

  it("2.1 에 평가 시스템 값(라이브러리·수행 일시·엔진 버전)이 없다 — 3.5 몫", () => {
    const lines = partOf(screenText(loadEd4("bc_strong", "issued")), FIRST, NEXT);
    const env = between(lines, "학습·추론 환경", "2.2 평가 데이터");
    expect(env.join("\n")).not.toMatch(/주요 라이브러리|평가 수행 일시|엔진|1\.0\.0|scikit-learn 1\.9/);
  });
});

describe("2절 — digits_strong(다중)", () => {
  const lines = partOf(screenText(loadEd4("digits_strong", "issued")), FIRST, NEXT);

  it("2.1 — 하이퍼파라미터 세 줄·의뢰자 환경", () => {
    expect(between(lines, "하이퍼파라미터", "학습·추론 환경")).toEqual(["하이퍼파라미터", "| 이름 | 값", "| C | 3", "| kernel | rbf", "| gamma | scale"]);
    expect(rowOf(lines, "운영체제")).toEqual(["운영체제", "macOS 15"]);
    expect(rowOf(lines, "CPU")).toEqual(["CPU", "Apple M3"]);
    expect(rowOf(lines, "알고리즘")).toEqual(["알고리즘", "서포트 벡터 머신(RBF 커널)"]);
  });

  it("2.2 평가 데이터 — 해시·크기·클래스 10개 목록·샘플 수·출처 열", () => {
    expect(between(lines, "| 항목 | 내용 | 출처", "정답 라벨")).toEqual([
      "| 항목 | 내용 | 출처",
      "| 업로드 파일명 | digits_strong.csv | 시스템 확인",
      "| 파일 해시(SHA-256) | e92372fe028dc722132977c87a56929bc0933c3a28a4e6277bcd2dba8e3d66d4 | 시스템 확인",
      "| 파일 크기 | 43,332바이트 | 시스템 확인",
      "| 데이터셋 형식 | 정형 데이터 (CSV) | 시스템 확인",
      "| 입력 컬럼 | sample_id, label, pred, prob_0, prob_1, prob_2, prob_3, prob_4, prob_5, prob_6, prob_7, prob_8, prob_9 | 시스템 확인",
      "| 평가 데이터셋 샘플 수 | 540개 | 시스템 확인",
      "| 평가 유형 | 다중 클래스 분류 | 의뢰자 제공",
      "| 감지된 클래스 수 | 10개 — 클래스 목록: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 | 시스템 확인",
      "| 평가 데이터 출처 | 같은 데이터의 30% 층화 분할 | 의뢰자 제공",
      "| 학습 데이터와의 관계 | 같은 출처 | 의뢰자 제공",
    ]);
  });

  it("정답 라벨 — 단일 라벨러면 라벨러 수·일치도 '해당 없음'(찍는다)", () => {
    expect(between(lines, "정답 라벨", "클래스 레이블 설명")).toEqual([
      "정답 라벨",
      "다음 값은 모두 의뢰자가 제공하였습니다.",
      "| 항목 | 내용",
      "| 정답 라벨 구축 방법 | 운영 로그 (의뢰자 제공: 필기자에게 적게 한 숫자를 그대로 정답으로 씀)",
      "| 정답 라벨 신뢰성 | 단일 라벨러",
      "| 라벨러 수 | 해당 없음",
      "| 라벨 일치도 | 해당 없음",
    ]);
  });

  it("클래스 레이블 설명 — 설명을 단 세 클래스만", () => {
    expect(between(lines, "클래스 레이블 설명", "2.3 학습 데이터")).toEqual([
      "클래스 레이블 설명",
      "다음 설명은 의뢰자가 제공하였습니다.",
      "| 클래스 | 설명",
      "| 0 | 숫자 0",
      "| 1 | 숫자 1",
      "| 7 | 숫자 7(가로줄 없는 필체 포함)",
    ]);
  });

  it("2.3 — 학습 클래스 분포 글 그대로, 채널 효과 덧붙인 글", () => {
    expect(rowOf(lines, "학습 샘플 수")).toEqual(["학습 샘플 수", "1,257개"]);
    expect(rowOf(lines, "학습 클래스 분포")).toEqual(["학습 클래스 분포", "0 124 / 1 127 / 2 124 / 3 128 / 4 127 / 5 127 / 6 127 / 7 125 / 8 122 / 9 126"]);
    expect(rowOf(lines, "채널 효과")).toEqual(["채널 효과", "수집자 차이 (의뢰자 제공: 필기자 43명 중 학습·평가에 같은 사람이 섞여 있다.)"]);
    expect(lines.at(-1)).toBe("| 학습·평가 전처리 일치 | 같음");
  });
});

describe("2절 — yeast_strong(멀티, 인쇄)", () => {
  it("레이블 14개 목록·크기·학습 클래스 분포 제공되지 않음", async () => {
    const lines = partOf(await printText(loadEd4("yeast_strong", "issued")), FIRST, NEXT);
    expect(rowOf(lines, "감지된 클래스 수")).toEqual([
      "감지된 클래스 수",
      "14개 — 클래스 목록: Class1, Class2, Class3, Class4, Class5, Class6, Class7, Class8, Class9, Class10, Class11, Class12, Class13, Class14",
      "시스템 확인",
    ]);
    expect(rowOf(lines, "파일 해시(SHA-256)")[1]).toBe("0db2f6db36743028b268e01ad2d75aa8b0b5700e5cb632e56fefaebc53e145b8");
    expect(rowOf(lines, "파일 크기")).toEqual(["파일 크기", "123,672바이트", "시스템 확인"]);
    expect(rowOf(lines, "평가 데이터셋 샘플 수")).toEqual(["평가 데이터셋 샘플 수", "917개", "시스템 확인"]);
    expect(rowOf(lines, "평가 유형")).toEqual(["평가 유형", "다중 레이블 분류", "의뢰자 제공"]);
    expect(rowOf(lines, "학습 클래스 분포")).toEqual(["학습 클래스 분포", "제공되지 않음"]);
    expect(rowOf(lines, "라벨 일치도")).toEqual(["라벨 일치도", "측정 안 함"]);
    expect(between(lines, "클래스 레이블 설명", "2.3 학습 데이터").slice(3)).toEqual(["| Class1 | 대사", "| Class2 | 에너지", "| Class12 | 세포 운명"]);
  });
});

describe("2절 — 픽스처에 없는 갈래(복사 데이터)", () => {
  const base = loadEd4("bc_strong", "issued");

  it("해시·크기를 받지 못한 run(sourceFile null) — 두 칸 '—'", () => {
    const lines = partOf(screenText(copy(base, (d) => (d.datasetInfo.sourceFile = null))), FIRST, NEXT);
    expect(rowOf(lines, "파일 해시(SHA-256)")).toEqual(["파일 해시(SHA-256)", "—", "시스템 확인"]);
    expect(rowOf(lines, "파일 크기")).toEqual(["파일 크기", "—", "시스템 확인"]);
  });

  it("B30 — 하이퍼파라미터 미제공: 소제목 아래 '제공되지 않음' 한 줄, 표 없음", () => {
    const lines = partOf(screenText(copy(base, (d) => (d.materials!.hyperparameters.rows = null))), FIRST, NEXT);
    expect(between(lines, "하이퍼파라미터", "학습·추론 환경")).toEqual(["하이퍼파라미터", "제공되지 않음"]);
    expect(lines).not.toContain("| 이름 | 값");
  });

  it("알고리즘·모델 분류가 비면 '제공되지 않음'", () => {
    const data = copy(base, (d) => {
      d.materials!.hyperparameters.algorithm = null;
      d.evalScope.modelCategory = "";
    });
    const lines = partOf(screenText(data), FIRST, NEXT);
    expect(rowOf(lines, "알고리즘")).toEqual(["알고리즘", "제공되지 않음"]);
    expect(rowOf(lines, "모델 분류")).toEqual(["모델 분류", "제공되지 않음"]);
  });

  it("평가 데이터 재료 줄(수집 기간 포함)은 모두 의뢰자 제공, 표 끝에 그 순서로", () => {
    const data = copy(base, (d) => d.materials!.test.push({ label: "수집 기간", value: "2024-01 ~ 2024-06" }));
    const lines = partOf(screenText(data), FIRST, NEXT);
    const from = lines.findIndex((l) => l.startsWith("| 평가 데이터 출처 |"));
    expect(lines.slice(from, lines.indexOf("정답 라벨"))).toEqual([
      "| 평가 데이터 출처 | 같은 데이터의 30% 층화 분할(학습에 쓰지 않음) | 의뢰자 제공",
      "| 학습 데이터와의 관계 | 같은 출처 (의뢰자 제공: 같은 병원·같은 장비에서 나온 기록이다.) | 의뢰자 제공",
      "| 수집 기간 | 2024-01 ~ 2024-06 | 의뢰자 제공",
    ]);
  });

  it("빈 클래스 설명은 '설명 미입력', 설명이 하나도 없으면 표·안내 없음", () => {
    const one = copy(base, (d) => (d.datasetInfo.classLabelDescriptions = [{ label: "benign", description: "" }]));
    expect(between(partOf(screenText(one), FIRST, NEXT), "클래스 레이블 설명", "2.3 학습 데이터").slice(3)).toEqual(["| benign | 설명 미입력"]);
    const none = copy(base, (d) => (d.datasetInfo.classLabelDescriptions = []));
    const text = partOf(screenText(none), FIRST, NEXT).join("\n");
    expect(text).not.toMatch(/클래스 레이블 설명|다음 설명은 의뢰자가 제공하였습니다/);
  });

  it("학습 데이터 예시 표(P1) — 적합·부적합 칸, 파일명 · 크기, 빈 칸 글, 그림", () => {
    const data = copy(base, (d) => {
      d.trainingDatasetInfo!.validExamples = [
        { name: "ok1.png", size: "12 KB", type: "image/png", previewUrl: "data:image/png;base64,AAAA" },
        { name: "ok2.png", size: "", type: "image/png" },
      ];
    });
    const lines = partOf(screenText(data), FIRST, NEXT);
    expect(lines.slice(-3)).toEqual(["학습 데이터 예시", "| 적합 예시 | 부적합 예시", "| ok1.png · 12 KB, ok2.png | 등록된 부적합 예시 없음"]);
    const { container } = render(<Ed4Target data={data} mode="print" />);
    const images = [...container.querySelectorAll("img")];
    expect(images.map((img) => [img.getAttribute("src"), img.getAttribute("alt")])).toEqual([["data:image/png;base64,AAAA", "ok1.png"]]);
  });

  it("학습 데이터 예시가 없으면 표 없음(bc_strong)", () => {
    expect(partOf(screenText(base), FIRST, NEXT).join("\n")).not.toMatch(/학습 데이터 예시/);
  });

  it("재료가 없는 데이터 — 정답 라벨·학습 데이터 표 없음, 하이퍼파라미터 B30", () => {
    const lines = partOf(screenText(copy(base, (d) => delete d.materials)), FIRST, NEXT);
    expect(lines.join("\n")).not.toMatch(/정답 라벨|학습 데이터셋명/);
    expect(between(lines, "하이퍼파라미터", "학습·추론 환경")).toEqual(["하이퍼파라미터", "제공되지 않음"]);
    expect(lines.at(-1)).toBe("2.3 학습 데이터");
  });
});

describe("2.2 해시 칸 줄바꿈(S6 스모크 발견 3 — 인쇄 표가 오른쪽 여백을 넘던 것)", () => {
  it("해시 칸만 break-all 로 감싸고 글은 64자 그대로, 다른 칸은 감싸지 않는다", () => {
    const view = render(<Ed4Target data={loadEd4("bc_strong", "final")} mode="print" />);
    const hashes = view.container.querySelectorAll("[data-ed4-hash]");
    expect(hashes).toHaveLength(1);
    expect(hashes[0].classList.contains("break-all")).toBe(true);
    expect(hashes[0].textContent).toBe(BC_SHA256);
    // 해시 줄의 '내용' 칸 안에 있다(항목 칸·출처 칸이 아님)
    const cells = [...(hashes[0].closest("tr")?.querySelectorAll("td") ?? [])];
    expect(cells).toHaveLength(3);
    expect(cells[0].textContent).toBe("파일 해시(SHA-256)");
    expect(cells[1].firstElementChild).toBe(hashes[0]);
    expect(view.container.querySelectorAll(".break-all")).toHaveLength(1);
    view.unmount();
  });

  it("2.2 표 '출처' 칸은 모두 줄바꿈 금지(한 글자씩 쌓이지 않게), 글은 그대로", () => {
    const view = render(<Ed4Target data={loadEd4("bc_strong", "final")} mode="print" />);
    const hashRow = view.container.querySelector("[data-ed4-hash]")!.closest("tr")!;
    const rows = [...hashRow.closest("tbody")!.querySelectorAll("tr")];
    expect(rows.length).toBeGreaterThan(5);
    for (const tr of rows) {
      const src = tr.querySelectorAll("td")[2].querySelector("[data-ed4-source]");
      expect(src?.classList.contains("whitespace-nowrap")).toBe(true);
      expect(["시스템 확인", "의뢰자 제공"]).toContain(src?.textContent);
    }
    // 다른 표(2.1 등)의 칸은 건드리지 않는다
    expect(view.container.querySelectorAll("[data-ed4-source]")).toHaveLength(rows.length);
    view.unmount();
  });
});
