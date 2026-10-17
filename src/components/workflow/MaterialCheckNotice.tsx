/**
 * 생성 전 안내 — 재료 선택 점검의 2·3층 부족을 성적서 생성 전에 보여 준다(입력 설계 › 재료 선택 점검
 * 6절). 판정은 하지 않고 `materialCheck` 결과를 읽기만 한다.
 *
 * 진행을 막지 않는다. 검증 화면의 "다음"을 누르면 이 안내를 보고 진행한 사실이 기록되고, 성적서 6.0
 * 에 "확인 후 진행"으로 찍힌다. 빠진 재료마다 고칠 곳으로 바로 갈 수 있게 한다.
 */
import { Info } from "lucide-react";
import { METRICS } from "../../data/evaluationData";
import type { MaterialCheckLine, MaterialCheckResult } from "../../types/finalReport.types";
import type { ComposerCardId } from "../../types/reportComposer.types";
import type { StepId } from "../../types/workflow.types";

/** 빠진 재료를 고칠 곳 — 선택 카드(재료 고르기 또는 그 입력 화면) 또는 단계. */
export type MaterialCheckTarget = { kind: "card"; cardId: ComposerCardId } | { kind: "step"; stepId: StepId };

/** 2층 보고 항목 → 그 값을 받는 곳(재료 선택 점검 4.2 "받는 입력"). */
export function targetOfItem(item: number): MaterialCheckTarget {
  if (item === 2) return { kind: "card", cardId: "testData" };
  if (item === 4 || item === 5) return { kind: "card", cardId: "groundTruth" };
  if (item === 7 || item === 10 || item === 11) return { kind: "card", cardId: "modelEnv" };
  if (item === 8) return { kind: "step", stepId: "mapping" };
  if (item === 12) return { kind: "step", stepId: "metrics" };
  return { kind: "card", cardId: "trainingData" }; // 1·3·9
}

/** 3층 줄 → 고칠 곳. 지연시간은 컬럼 매핑, 나머지는 지표 화면. */
export function targetOfLine(id: MaterialCheckLine["id"]): MaterialCheckTarget {
  return id === "latency" ? { kind: "step", stepId: "mapping" } : { kind: "step", stepId: "metrics" };
}

const metricName = (id: string) => METRICS.find((metric) => metric.id === id)?.name ?? id;

interface MaterialCheckNoticeProps {
  check: MaterialCheckResult;
  onFix: (target: MaterialCheckTarget) => void;
}

export function MaterialCheckNotice({ check, onFix }: MaterialCheckNoticeProps) {
  if (check.warningIds.length === 0) return null;
  const missing = check.reporting.items.filter((item) => !item.provided);
  const unmet = check.purpose.lines.filter((line) => !line.met);

  return (
    <section aria-label="생성 전 안내" className="mb-6 rounded-lg border border-border-strong bg-card px-5 py-4">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        성적서에 부족하게 표시될 재료가 있습니다.
      </p>
      <p className="mt-1 text-sm text-foreground-secondary">
        진행은 막지 않습니다. "다음"을 누르면 이 안내를 확인하고 진행한 것으로 성적서 6.0에 기록됩니다
        (점검 표 {check.version}).
      </p>

      {missing.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-sm text-foreground-secondary">
            보고 항목 {check.reporting.total}개 중 {missing.length}개가 성적서에 "제공되지 않음"으로 표시됩니다.
          </p>
          <ul aria-label="빠진 보고 항목" className="mt-1 flex flex-col">
            {missing.map((item) => (
              <li
                key={item.item}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 border-t border-border py-3 first:border-t-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                  <span className="text-sm text-foreground-secondary">
                    빠진 칸: {item.missing.join(" · ")}. {item.impact} 판단할 수 없게 됩니다.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onFix(targetOfItem(item.item))}
                  className="text-sm text-foreground-secondary underline underline-offset-4 hover:text-foreground"
                >
                  넣으러 가기
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unmet.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-sm text-foreground-secondary">
            목적별 점검 {check.purpose.applicable}줄 중 {unmet.length}줄이 맞지 않습니다.
          </p>
          <ul aria-label="맞지 않는 목적별 점검" className="mt-1 flex flex-col">
            {unmet.map((line) => (
              <li
                key={line.id}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 border-t border-border py-3 first:border-t-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">
                    {line.title} ({line.declared})
                  </span>
                  <span className="text-sm text-foreground-secondary">
                    {line.recommended.length > 0
                      ? `추천 지표: ${line.recommended.map(metricName).join(", ")}`
                      : "응답시간(latency) 컬럼을 매핑하면 채워집니다."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onFix(targetOfLine(line.id))}
                  className="text-sm text-foreground-secondary underline underline-offset-4 hover:text-foreground"
                >
                  {line.id === "latency" ? "컬럼 매핑으로" : "지표 화면에서 추가"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
