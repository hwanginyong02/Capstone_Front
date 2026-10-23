/**
 * 인쇄(PDF) 준비 훅.
 *
 * 인쇄할 수 있는 완성본(`ready` — 서술까지 끝난 저장본)이면 컨테이너에 data-pdf-ready 속성을 표시하고 브라우저 인쇄를
 * 자동 호출한다. Puppeteer 는 data-pdf-ready 를 기다렸다 캡처하므로 PDF 완결성이 보장된다(D6b).
 * 서술이 끝나지 않았거나 실패한 성적서는 인쇄하지 않는다(서술 라운드 S3b) — 종전에는 "기다리는 중"만 막아서 실패한
 * 빈 서술·미평가 초안이 곧바로 인쇄됐다.
 * ReportPrint 페이지에서 사용하며, 반환한 ref 를 인쇄 대상 컨테이너에 연결한다.
 */
import { useEffect, useRef } from "react";

export function usePrintOnReady(data: unknown, ready: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !ready || !containerRef.current) return;
    const raf = requestAnimationFrame(() => {
      containerRef.current?.setAttribute("data-pdf-ready", "true");
      // 레이아웃 렌더링이 완료된 후 자동으로 브라우저 인쇄 다이얼로그 호출
      setTimeout(() => {
        window.print();
      }, 300);
    });
    return () => cancelAnimationFrame(raf);
  }, [data, ready]);

  return containerRef;
}
