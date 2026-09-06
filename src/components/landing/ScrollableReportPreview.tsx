import { REPORT_SHOWCASE } from "../../data/reportShowcase";
import { ReportSections } from "../report/ReportSections";

/**
 * 랜딩의 최종 성적서 미리보기.
 *
 * **iframe 이 아니라 고정 예시를 직접 렌더한다**(ISSUES.md E-06).
 * 종전에는 `/report/preview` 를 iframe 으로 띄웠는데 그 URL 에 `?showcase=1` 이 없어
 * persist 우회가 발동하지 않았다 — iframe 이 방문자의 localStorage 를 정상 재수화해
 * **방문자의 실제 회사명·사업자등록번호·주소가 공개 랜딩 페이지에 렌더**됐다.
 *
 * 정적 렌더로 바꾸면서 iframe 스크롤 오버레이(휠/드래그로 contentWindow 를 밀던 것)도
 * 필요 없어졌다 — 평범한 overflow 컨테이너가 같은 일을 한다.
 */
export function ScrollableReportPreview() {
  return (
    <div
      className="landing-report-preview-scroll h-full overflow-y-auto overscroll-contain bg-white"
      aria-label="Final report preview"
    >
      <div className="landing-report-preview-page mx-auto max-w-[820px] p-8">
        <ReportSections data={REPORT_SHOWCASE} />
      </div>
    </div>
  );
}
