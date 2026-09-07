/**
 * 미평가 초안은 인쇄하지 않는다는 안내 (ISSUES.md H-03 파생 · F-05 와 같은 뿌리).
 *
 * **왜 인쇄를 막는가.** 서버는 PDF 를 만들지도 보관하지도 않는다(★결정 8 로 F-05 제외).
 * 즉 **브라우저 인쇄물이 이 서비스의 최종 산출물**이다. 그런데 인쇄 탭은 새 문서라
 * 워크플로우 store 의 `rawFile`(File 객체, persist 불가)이 없고, 그래서 저장된
 * `run.reportData` 를 그대로 렌더한다 — 서술 병합이 끝나기 전이면 그것은 **초안**이다.
 *
 * 초안은 지표표가 비어 있고 판정이 `buildConclusion([])` 의 기본값,
 * 즉 **"조건부 적합 / 0.0%"** 다. 그것을 인쇄하면 공식 문서처럼 보이는 파일이 만들어진다.
 * 종전에는 `usePrintOnReady` 가 그것을 **자동으로** 인쇄 다이얼로그까지 띄웠고,
 * 그 창은 평가마다 서술 병합 구간(최대 160초) 내내 열려 있었다.
 *
 * 인쇄를 막는 것이 정답이다 — 잘못된 산출물보다 산출물이 없는 편이 안전하다.
 */
export function DraftNotPrintableNotice() {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-slate-800">
        아직 인쇄할 수 없는 성적서입니다
      </h1>
      <p className="text-sm leading-relaxed text-slate-600">
        이 성적서는 평가·서술이 끝나지 않은 <strong>초안</strong>입니다. 이 상태로
        인쇄하면 지표표가 비어 있고 종합 판정이 기본값(<code>조건부 적합 · 0.0%</code>)인
        문서가 만들어집니다.
      </p>
      <p className="text-sm leading-relaxed text-slate-600">
        성적서 화면으로 돌아가 <strong>AI 정성 서술 생성이 끝날 때까지</strong> 기다린 뒤
        다시 인쇄해 주세요. 평가가 아예 수행되지 않았다면 6단계에서 평가를 다시 실행해야 합니다.
      </p>
    </div>
  );
}
