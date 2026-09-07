import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePdfDownload } from "./usePdfDownload";

/**
 * ISSUES.md E-07 — 존재하지 않는 엔드포인트를 await 한 뒤 catch 에서 새 탭을 열었다.
 * 서버 PDF 는 ★결정 8 로 이번 범위에서 제외됐으므로, 그 왕복은 **영원히 실패한다**.
 */
describe("usePdfDownload", () => {
  const openSpy = vi.fn();
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("open", openSpy);
    vi.stubGlobal("fetch", fetchSpy);
    openSpy.mockReset();
    fetchSpy.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("인쇄 경로를 새 탭으로 연다", () => {
    usePdfDownload("run-1").download();

    expect(openSpy).toHaveBeenCalledWith("/report/run-1/print", "_blank", "noopener");
  });

  it("존재하지 않는 PDF 엔드포인트를 호출하지 않는다", () => {
    usePdfDownload("run-1").download();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("동기적으로 창을 연다 — 팝업 차단에 걸리지 않는다", () => {
    // await 뒤에 window.open 을 부르면 사용자 제스처 컨텍스트를 잃어 브라우저가 막는다.
    const result = usePdfDownload("run-1").download();

    expect(result).toBeUndefined();
    expect(openSpy).toHaveBeenCalledTimes(1);
  });
});
