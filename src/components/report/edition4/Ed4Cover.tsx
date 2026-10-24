/**
 * 판 4 표지와 시험 결과 요약(예시본 맨 앞 — 제목·상태 줄·표준 문구·발급 기관·발급 문구(22)·정보 표·"시험 결과 요약" 4줄).
 * 지금은 제목만 그린다(판 4 라운드 S4·S5 1단계 뼈대) — 2단계가 예시본 모양으로 채운다(B1~B4).
 */
import type { Ed4PartProps } from "./shared/ed4PartProps";

export function Ed4Cover({ data, mode }: Ed4PartProps) {
  return (
    <section data-ed4-part="Ed4Cover">
      <h1 className="text-3xl font-bold text-slate-900">{data.meta.title}</h1>
    </section>
  );
}
