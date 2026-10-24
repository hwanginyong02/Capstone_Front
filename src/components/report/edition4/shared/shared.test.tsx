/** 판 4 공용 작은 부품 — 예시본 모양(머리 행 있는 표, "Section 0N" 없는 제목, 따옴표·blockquote 없는 서술 문단). */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Ed4SectionTitle, Ed4SubsectionTitle, Ed4TableTitle } from "./Ed4Headings";
import { Ed4Narrative, Ed4Paragraph } from "./Ed4Paragraph";
import { Ed4ItemTable, Ed4Table } from "./Ed4Table";

const rowsOf = (el: HTMLElement) =>
  [...el.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th,td")].map((c) => c.textContent));

describe("판 4 표", () => {
  it("Ed4Table — 머리 행(th)과 칸", () => {
    const { container } = render(<Ed4Table columns={["Metric ID", "시험항목"]} rows={[["M1", "Accuracy"], ["M3", "Recall"]]} />);
    expect(container.querySelectorAll("thead th")).toHaveLength(2);
    expect(rowsOf(container)).toEqual([["Metric ID", "시험항목"], ["M1", "Accuracy"], ["M3", "Recall"]]);
  });

  it("Ed4ItemTable — 기본 머리 행 '항목 | 내용', 바꿀 수 있음", () => {
    const a = render(<Ed4ItemTable rows={[{ label: "회사명", value: "(주)시연고객" }]} />);
    expect(rowsOf(a.container)).toEqual([["항목", "내용"], ["회사명", "(주)시연고객"]]);
    const b = render(<Ed4ItemTable headers={["이름", "값"]} rows={[{ label: "C", value: "0.5" }]} />);
    expect(rowsOf(b.container)).toEqual([["이름", "값"], ["C", "0.5"]]);
  });
});

describe("판 4 제목", () => {
  it("절(h2) '1. 시험 개요', 소절(h3) '4.3 지표별 결과', 판 3 'Section 0N' 머리글 없음", () => {
    const { container } = render(
      <>
        <Ed4SectionTitle number="1" />
        <Ed4SubsectionTitle number="4.3" />
        <Ed4TableTitle>의뢰자</Ed4TableTitle>
      </>,
    );
    expect(container.querySelector("h2")?.textContent).toBe("1. 시험 개요");
    expect(container.querySelector("h3")?.textContent).toBe("4.3 지표별 결과");
    expect(container.querySelector("p")?.textContent).toBe("의뢰자");
    expect(container.textContent).not.toMatch(/Section/);
  });
});

describe("판 4 서술 문단", () => {
  it("빈 줄로 문단을 나누고 blockquote·따옴표로 감싸지 않는다", () => {
    const { container } = render(<Ed4Narrative text={"첫 문단이다.\n\n둘째 문단이다."} />);
    expect([...container.querySelectorAll("p")].map((p) => p.textContent)).toEqual(["첫 문단이다.", "둘째 문단이다."]);
    expect(container.querySelector("blockquote")).toBeNull();
    expect(container.textContent).not.toMatch(/[“”"]/);
  });

  it("빈 글·없음은 아무것도 그리지 않는다", () => {
    expect(render(<Ed4Narrative text="" />).container.innerHTML).toBe("");
    expect(render(<Ed4Narrative text={null} />).container.innerHTML).toBe("");
    expect(render(<Ed4Paragraph>— 끝 —</Ed4Paragraph>).container.textContent).toBe("— 끝 —");
  });
});
