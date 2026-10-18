/**
 * ⑥ 학습 데이터 예시 파일(B15) — 여러 개를 한 번에 받고, 파일이 있는 칸에도 끌어 놓을 수 있고, 형식을
 * 확인하며, 두 칸 모두 '선택' 항목으로 보인다. 용량 안내는 숫자로.
 *
 * 이미지 축소는 jsdom 에 캔버스가 없어 CSV·JSON 으로 본다(축소는 examplePreview 의 순수 함수가 맡는다).
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { TrainingExamplesSection } from "./TrainingExamplesSection";
import type { UploadedFileInfo } from "../../types/workflow.types";

function Harness({ initial = [] as UploadedFileInfo[] }) {
  const [valid, setValid] = useState<UploadedFileInfo[]>(initial);
  const [unsuitable, setUnsuitable] = useState<UploadedFileInfo[]>([]);
  return (
    <>
      <TrainingExamplesSection
        trainingExampleFiles={valid}
        onTrainingExampleFilesChange={setValid}
        trainingUnsuitableExampleFiles={unsuitable}
        onTrainingUnsuitableExampleFilesChange={setUnsuitable}
      />
      <output data-testid="valid">{valid.map((file) => file.name).join(",")}</output>
      <output data-testid="unsuitable">{unsuitable.map((file) => file.name).join(",")}</output>
    </>
  );
}

const csv = (name: string) => new File(["a,b\n1,2"], name, { type: "text/csv" });
const json = (name: string) => new File(["{}"], name, { type: "application/json" });
const exe = (name: string) => new File(["MZ"], name, { type: "application/x-msdownload" });

describe("[B15] 예시 파일", () => {
  it("두 칸 모두 '선택' 배지가 있다", () => {
    render(<Harness />);
    const valid = screen.getByTestId("example-slot-적합 예시");
    const unsuitable = screen.getByTestId("example-slot-부적합 예시");
    expect(within(valid).getByText("선택")).toBeInTheDocument();
    expect(within(unsuitable).getByText("선택")).toBeInTheDocument();
  });

  it("파일 고르기는 여러 개를 받는다 — 두 파일을 고르면 고른 순서대로 둘 다 더해진다", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("적합 예시 파일") as HTMLInputElement;
    expect(input).toHaveAttribute("multiple");
    await userEvent.upload(input, [csv("b.csv"), json("a.json")]);
    await waitFor(() => expect(screen.getByTestId("valid")).toHaveTextContent("b.csv,a.json"));
    expect(screen.getByTestId("unsuitable")).toHaveTextContent("");
  });

  it("파일이 이미 있는 칸에 놓아도 더해진다 — 여러 개를 한 번에", async () => {
    render(<Harness initial={[{ name: "old.csv", size: "1 B", type: "text/csv" }]} />);
    fireEvent.drop(screen.getByTestId("example-slot-적합 예시"), {
      dataTransfer: { files: [csv("c.csv"), json("d.json")] },
    });
    await waitFor(() => expect(screen.getByTestId("valid")).toHaveTextContent("old.csv,c.csv,d.json"));
  });

  it("이미지·CSV·JSON 이 아니면 이름을 알리고 뺀다 — 나머지는 받는다", async () => {
    render(<Harness />);
    fireEvent.drop(screen.getByTestId("example-slot-부적합 예시"), {
      dataTransfer: { files: [exe("run.exe"), csv("ok.csv")] },
    });
    await waitFor(() => expect(screen.getByTestId("unsuitable")).toHaveTextContent("ok.csv"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "올릴 수 없는 형식이라 뺐습니다: run.exe. 이미지·CSV·JSON 파일만 올릴 수 있어요.",
    );
    expect(screen.getByTestId("unsuitable")).not.toHaveTextContent("run.exe");
  });

  it("[S9] 형식이 빈 채 저장된 HEIC 도 이미지로 보고 미리보기가 없다고 알린다", () => {
    render(<Harness initial={[{ name: "photo.heic", size: "2 MB", type: "unknown" }]} />);
    expect(screen.getByRole("note")).toHaveTextContent("미리보기를 만들 수 없는 이미지 형식입니다: photo.heic");
  });

  it("미리보기 합계가 권장값을 넘으면 합계와 권장값을 숫자로 알린다", () => {
    const big = (name: string): UploadedFileInfo => ({
      name,
      size: "1 MB",
      type: "image/jpeg",
      previewUrl: "x".repeat(350 * 1024),
    });
    render(<Harness initial={[big("a.jpg"), big("b.jpg")]} />);
    expect(screen.getByRole("note")).toHaveTextContent("합계 700 KB로 권장 600 KB를 넘었습니다");
  });
});
