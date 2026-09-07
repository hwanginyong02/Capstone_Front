/**
 * PDF 다운로드 — 브라우저 인쇄 경로.
 *
 * **서버 PDF 는 존재하지 않는다**(ISSUES.md F-05, 2026-09-07 ★결정 8 로 이번 범위에서
 * 제외). 종전에는 `POST /api/reports/:id/pdf` 를 매번 **호출해 보고 실패한 뒤** catch 에서
 * 새 탭을 열었다(ISSUES.md E-07). 그 왕복은 항상 실패하므로 하는 일이 없고, 다만
 *
 *   · 클릭할 때마다 불필요한 네트워크 요청과 콘솔 오류를 만들고,
 *   · 느린 회선에서는 새 탭이 열리기까지 사용자가 아무 반응 없는 시간을 겪으며,
 *   · 실제로 서버 PDF 가 생기는 날 이 코드가 이미 '돌아가고 있는 것처럼' 보여
 *     구현 여부를 코드만으로 판단할 수 없게 만든다.
 *
 * 존재하지 않는 것을 기다리지 않는다. 서버 PDF 가 생기면 여기서 분기를 되살린다.
 */
export function usePdfDownload(id: string) {
  const download = () => {
    // PrintLayout(@media print)이 적용된 인쇄 경로를 새 탭으로 연다.
    window.open(`/report/${id}/print`, "_blank", "noopener");
  };

  return { download };
}
