/**
 * 예시 파일 정보 만들기(`toUploadedFileInfoAsync`) — 축소본을 만들지는 `isExampleImage` 하나로 정한다(S9).
 *
 * 일부 브라우저는 HEIC 등의 형식(MIME)을 비워 준다. 그때도 확장자로 이미지로 보고 축소본을 시도해야
 * 받기·축소본·"미리보기 없음" 안내 세 곳이 같은 판정을 쓴다. jsdom 은 이미지를 읽지 못하므로 축소본 함수는
 * 가짜로 바꿔, 불렸는지만 본다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const makeExamplePreview = vi.fn(async (_file: Blob): Promise<string | null> => "data:image/jpeg;base64,AAAA");

vi.mock("../../utils/image/examplePreview", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/image/examplePreview")>()),
  makeExamplePreview: (file: Blob) => makeExamplePreview(file),
}));

const { toUploadedFileInfoAsync } = await import("./shared");

describe("[S9] 예시 파일 축소본은 isExampleImage 판정을 따른다", () => {
  beforeEach(() => makeExamplePreview.mockClear());

  it("형식이 빈 HEIC 도 축소본을 시도하고, 저장 정보의 형식은 'unknown' 이다", async () => {
    const info = await toUploadedFileInfoAsync(new File(["x"], "IMG_0001.HEIC", { type: "" }));
    expect(makeExamplePreview).toHaveBeenCalledTimes(1);
    expect(info).toMatchObject({ name: "IMG_0001.HEIC", type: "unknown", previewUrl: "data:image/jpeg;base64,AAAA" });
  });

  it("image/* 는 축소본을 시도한다", async () => {
    await toUploadedFileInfoAsync(new File(["x"], "a.png", { type: "image/png" }));
    expect(makeExamplePreview).toHaveBeenCalledTimes(1);
  });

  it("CSV·형식을 알려 준 비이미지는 시도하지 않는다", async () => {
    const csv = await toUploadedFileInfoAsync(new File(["a,b"], "rows.csv", { type: "" }));
    await toUploadedFileInfoAsync(new File(["x"], "a.heic", { type: "application/octet-stream" }));
    expect(makeExamplePreview).not.toHaveBeenCalled();
    expect(csv.previewUrl).toBeUndefined();
  });
});
