/**
 * 인쇄(PDF) 준비 훅.
 *
 * 리포트 데이터가 채워지고 AI 서술(7·8·9절) 병합이 끝나면(narrativePending=false)
 * 컨테이너에 data-pdf-ready 속성을 표시하고 브라우저 인쇄를 자동 호출한다.
 * Puppeteer 는 data-pdf-ready 를 기다렸다 캡처하므로 PDF 완결성이 보장된다(D6b).
 * ReportPrint 페이지에서 사용하며, 반환한 ref 를 인쇄 대상 컨테이너에 연결한다.
 */
import { useEffect, useRef } from "react";

export function usePrintOnReady(data: unknown, narrativePending: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || narrativePending || !containerRef.current) return;
    const raf = requestAnimationFrame(() => {
      containerRef.current?.setAttribute("data-pdf-ready", "true");
      // 레이아웃 렌더링이 완료된 후 자동으로 브라우저 인쇄 다이얼로그 호출
      setTimeout(() => {
        window.print();
      }, 300);
    });
    return () => cancelAnimationFrame(raf);
  }, [data, narrativePending]);

  return containerRef;
}
