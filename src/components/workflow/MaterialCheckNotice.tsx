/**
 * 생성 전 안내 — 재료 선택 점검의 2·3층 부족을 성적서 생성 전에 보여 준다(입력 설계 › 재료 선택 점검
 * 6절). 판정은 하지 않고 `materialCheck` 결과를 읽기만 한다.
 *
 * 진행을 막지 않는다. 검증 화면의 "다음"을 누르면 이 안내를 보고 진행한 사실이 기록되고, 성적서 6.0
 * 에 "확인 후 진행"으로 찍힌다. 빠진 재료마다 고칠 곳으로 바로 갈 수 있게 한다.
 *
 * 빠진 보고 항목은 **고칠 곳별로 묶는다.** 카드 하나가 보고 항목 여럿을 받아서(학습 데이터 1·3·9,
 * 실행 환경 7·10·11) 항목마다 버튼을 달면 같은 버튼이 줄줄이 반복되고, 검증 결과가 화면 아래로
 * 밀려난다.
 */
import { Info, RefreshCw } from "lucide-react";
import { METRICS } from "../../data/evaluationData";
import { MATERIAL_CHECK_VERSION, isMaterialCheckOutdated } from "../../lib/report/materialCheck";
import { COMPOSER_CARDS, fieldOfLeaf, getCard, isLeafReceived, stepOfLeaf } from "../../data/reportComposer";
import { getStepDefinition } from "../../data/workflowSteps";
import type { MaterialCheckItem, MaterialCheckLine, MaterialCheckResult } from "../../types/finalReport.types";
import type { ComposerCardId, ComposerSelection, MaterialPicks } from "../../types/reportComposer.types";
import type { StepId } from "../../types/workflow.types";

/**
 * 빠진 재료를 고칠 곳. 선택 카드는 두 갈래다 — 평가 흐름 만들기(블록을 넣지 않았거나 그 항목을 넣지
 * 않았으면 입력 화면에 칸이 없다)와 그 블록의 입력 화면("모름"으로 답했거나 비워 둔 경우).
 *
 * `leafIds` 가 있으면 그 항목을 가리킨다 — 평가 흐름 만들기는 그 항목을 강조하고, 입력 화면은 그 항목을
 * 받는 화면(`stepId`)이다. ① 지연시간 컬럼이 그렇다: 놓지 않았으면 컬럼 매핑에 latency 역할이 없어서,
 * 컬럼 매핑으로 바로 보내면 막다른 길이다(docs/MATERIAL_PICKER.md §12.4).
 */
export type MaterialCheckTarget =
  | { kind: "card"; cardId: ComposerCardId; leafIds?: string[] }
  | { kind: "cardInput"; cardId: ComposerCardId; stepId?: StepId }
  | { kind: "step"; stepId: StepId };

/**
 * 2층 보고 항목 → 그 값을 받는 블록과 항목 id — 레지스트리의 `standardBasis.reportingItem` 에서 찾는다.
 * 받는 항목이 없으면(6번처럼 시스템이 계산하는 항목) null. 한 항목의 필드는 한 블록에 있다(테스트가 지킨다).
 */
export function leavesOfReportingItem(item: number): { cardId: ComposerCardId; leafIds: string[] } | null {
  for (const card of COMPOSER_CARDS) {
    const leafIds = card.fields
      .filter((field) => field.standardBasis?.reportingItem === item)
      .map((field) => field.id);
    if (leafIds.length > 0) return { cardId: card.id, leafIds };
  }
  return null;
}

/**
 * 2층 보고 항목 → 그 값을 받는 곳(재료 선택 점검 4.2 "받는 입력"). 블록과 함께 그 항목을 받는 항목 id
 * (`leafIds`)를 단다 — 블록은 넣었어도 그 항목을 넣지 않았으면 입력 화면에 칸이 없어서다(S10 마무리).
 * 8번(지연시간)은 평가 데이터 › 지연시간 컬럼. 12번(멀티레이블 지표 선택 기준)은 지표 화면.
 * 레지스트리에서 항목을 찾지 못하면 종전대로 블록만 가리킨다.
 */
export function targetOfItem(item: number): MaterialCheckTarget {
  if (item === 12) return { kind: "step", stepId: "metrics" };
  const leaves = leavesOfReportingItem(item);
  if (leaves) return { kind: "card", ...leaves };
  if (item === 2) return { kind: "card", cardId: "testData" };
  if (item === 4 || item === 5) return { kind: "card", cardId: "groundTruth" };
  if (item === 7 || item === 10 || item === 11) return { kind: "card", cardId: "modelEnv" };
  return { kind: "card", cardId: "trainingData" }; // 1·3·9
}

/** 3층 줄 → 고칠 곳. 지연시간은 2층 8번과 같은 곳(평가 데이터 › 지연시간 컬럼), 나머지는 지표 화면. */
export function targetOfLine(id: MaterialCheckLine["id"]): MaterialCheckTarget {
  return id === "latency" ? targetOfItem(8) : { kind: "step", stepId: "metrics" };
}

/** 입력 화면 쪽 갈래 — 항목을 가리키면 그 항목을 받는 화면이다. */
export function inputTargetOf(target: Extract<MaterialCheckTarget, { kind: "card" }>): MaterialCheckTarget {
  return target.leafIds?.length
    ? { kind: "cardInput", cardId: target.cardId, stepId: stepOfLeaf(target.cardId, target.leafIds[0]) }
    : { kind: "cardInput", cardId: target.cardId };
}

interface ItemGroup {
  key: string;
  target: MaterialCheckTarget;
  items: MaterialCheckItem[];
}

/**
 * 고칠 곳이 같은 항목끼리 묶는다 — 블록이 같으면 한 묶음이고, 묶음의 `leafIds` 는 그 항목들의 항목 id
 * 를 모은 것이다(하나라도 블록만 가리키면 묶음도 블록만). 묶음 순서는 그 묶음의 첫 항목 순서다.
 */
export function groupByTarget(items: MaterialCheckItem[]): ItemGroup[] {
  const groups: ItemGroup[] = [];
  for (const item of items) {
    const target = targetOfItem(item.item);
    const key = target.kind === "step" ? "step:" + target.stepId : "card:" + target.cardId;
    const group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      groups.push({ key, target, items: [item] });
      continue;
    }
    group.items.push(item);
    if (group.target.kind === "card" && target.kind === "card") {
      const leafIds =
        group.target.leafIds && target.leafIds ? [...new Set([...group.target.leafIds, ...target.leafIds])] : undefined;
      group.target = { kind: "card", cardId: target.cardId, ...(leafIds ? { leafIds } : {}) };
    }
  }
  return groups;
}

/**
 * 입력 화면에서 고칠 수 있는가 — 블록을 넣었고(잠긴 블록은 늘 들어 있다), 항목을 가리키면 그 항목 중
 * 하나라도 입력 화면이 받는가(`isLeafReceived`). 놓지 않은 항목뿐이면 입력 화면에 칸이 없으니 "평가 흐름
 * 만들기에서 넣기"만 보인다(S10 마무리). 묶음이 항목 여럿이면(학습 데이터 1·3·9) 받는 항목이 하나라도
 * 있을 때 입력 화면이 쓸모 있다.
 */
export function canFixInInputOf(
  target: Extract<MaterialCheckTarget, { kind: "card" }>,
  composerCards: Partial<ComposerSelection>,
  materialPicks: MaterialPicks,
): boolean {
  const placed = getCard(target.cardId).locked || Boolean((composerCards as Partial<Record<ComposerCardId, boolean>>)[target.cardId]);
  if (!placed) return false;
  if (!target.leafIds?.length) return true;
  return target.leafIds.some((leafId) => isLeafReceived(target.cardId, leafId, materialPicks[target.cardId]));
}

/**
 * 묶음 머리에 쓰는 이름 — 블록 이름, 단계면 단계 표시줄의 이름. 잠긴 블록의 항목 하나를 가리키면 "블록 ›
 * 항목"이다(지연시간 — 블록은 늘 들어 있어 항목이 고칠 곳이다). 선택 블록은 묶음 안 항목 이름이 이미
 * 무엇이 빠졌는지 말하므로 블록 이름만 쓴다.
 */
export function targetName(target: MaterialCheckTarget): string {
  if (target.kind === "step") return getStepDefinition(target.stepId).label;
  const card = getCard(target.cardId);
  const leafId = target.kind === "card" && card.locked && target.leafIds?.length === 1 ? target.leafIds[0] : undefined;
  const field = leafId ? fieldOfLeaf(target.cardId, leafId) : undefined;
  return field ? `${card.name} › ${field.label}` : card.name;
}

const metricName = (id: string) => METRICS.find((metric) => metric.id === id)?.name ?? id;

interface MaterialCheckNoticeProps {
  check: MaterialCheckResult;
  onFix: (target: MaterialCheckTarget) => void;
  /**
   * 입력 화면에서 고칠 수 있는가 — 블록이면 넣었는지, 항목을 가리키면 그 항목을 받는지. 참이면
   * "입력 화면에서 고치기"(지연시간이면 "컬럼 매핑에서 고치기")도 보인다. 계산은 검증 화면이 한다.
   */
  canFixInInput?: (target: Extract<MaterialCheckTarget, { kind: "card" }>) => boolean;
}

const LINK = "text-sm text-foreground-secondary underline underline-offset-4 hover:text-foreground";
const BOX = "flex flex-col overflow-hidden rounded-md border border-border";
const BOX_HEAD = "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-muted px-4 py-2";

export function MaterialCheckNotice({ check, onFix, canFixInInput = () => false }: MaterialCheckNoticeProps) {
  if (check.warningIds.length === 0) return null;
  const missing = check.reporting.items.filter((item) => !item.provided);
  const unmet = check.purpose.lines.filter((line) => !line.met);

  const fixButtons = (target: MaterialCheckTarget) => {
    if (target.kind !== "card") {
      return (
        <button type="button" onClick={() => onFix(target)} className={LINK}>
          {target.kind === "step" && target.stepId === "metrics" ? "지표 화면에서 추가" : "넣으러 가기"}
        </button>
      );
    }
    const input = inputTargetOf(target);
    return (
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <button type="button" onClick={() => onFix(target)} className={LINK}>
          평가 흐름 만들기에서 넣기
        </button>
        {canFixInInput(target) && (
          <button type="button" onClick={() => onFix(input)} className={LINK}>
            {input.kind === "cardInput" && input.stepId === "mapping" ? "컬럼 매핑에서 고치기" : "입력 화면에서 고치기"}
          </button>
        )}
      </span>
    );
  };

  return (
    <section aria-label="생성 전 안내" className="mb-6 rounded-lg border border-border-strong bg-card px-5 py-4">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        성적서에 부족하게 표시될 항목이 있습니다.
      </p>
      <p className="mt-1 text-sm text-foreground-secondary">
        진행은 막지 않습니다. "다음"을 누르면 이 안내를 확인하고 진행한 것으로 성적서 6.0에 기록됩니다
        (점검 표 {check.version}).
      </p>

      {missing.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-foreground-secondary">
            보고 항목 {check.reporting.total}개 중 {missing.length}개가 성적서에 "제공되지 않음"으로 표시됩니다.
          </p>
          <ul aria-label="빠진 보고 항목" className="mt-2 grid items-start gap-3 xl:grid-cols-2">
            {groupByTarget(missing).map((group) => (
              <li key={group.key} className={BOX}>
                <div className={BOX_HEAD}>
                  <span className="text-sm font-semibold text-foreground">{targetName(group.target)}</span>
                  {fixButtons(group.target)}
                </div>
                <ul className="flex flex-col divide-y divide-border px-4">
                  {group.items.map((item) => (
                    <li key={item.item} className="py-2.5">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
                        빠진 칸: {item.missing.join(" · ")}. {item.impact} 판단할 수 없게 됩니다.
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unmet.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-foreground-secondary">
            목적별 점검 {check.purpose.applicable}줄 중 {unmet.length}줄이 맞지 않습니다.
          </p>
          <ul aria-label="맞지 않는 목적별 점검" className="mt-2 grid items-start gap-3 xl:grid-cols-2">
            {unmet.map((line) => (
              <li key={line.id} className={BOX}>
                <div className={BOX_HEAD}>
                  <span className="text-sm font-semibold text-foreground">
                    {line.title} ({line.declared})
                  </span>
                  {fixButtons(targetOfLine(line.id))}
                </div>
                <p className="px-4 py-2.5 text-xs leading-relaxed text-foreground-secondary">
                  {line.recommended.length > 0
                    ? `추천 지표: ${line.recommended.map(metricName).join(", ")}`
                    : "평가 흐름에 지연시간 컬럼을 넣고 매핑하면 채워집니다."}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * 점검 표가 바뀐 뒤의 "다시 확인" 안내 문장(점검 표 2.0). 진행 중인 run 의 재료 선택 점검(표지·1.4·6.0)은 run 을
 * 만들 때 저장되어 다시 계산되지 않으므로, 옛 점검 표로 만든 결과가 그대로 남는다.
 */
export function materialCheckOutdatedMessage(storedVersion: string): string {
  return (
    `점검 표가 바뀌어(${storedVersion} → ${MATERIAL_CHECK_VERSION}) 다시 확인이 필요합니다. ` +
    "이 평가의 재료 선택 점검(표지·1.4·6.0)은 옛 점검 표로 만든 것입니다. " +
    "데이터 검증 화면에서 생성 전 안내를 다시 보고 \"다음\"을 누르면 새 점검 표로 성적서를 다시 만듭니다."
  );
}

/**
 * 진행 중인 run 의 점검 결과가 지금 점검 표와 다른 버전이면 "다시 확인" 안내를 그린다. 발급된 성적서는 발급
 * 당시 모양 그대로라 그리지 않는다(`active` 가 거짓). 검증 화면과 성적서 화면이 같이 쓴다.
 */
export function MaterialCheckOutdatedNotice({
  check,
  active,
}: {
  check: { version: string } | null | undefined;
  active: boolean;
}) {
  if (!active || !isMaterialCheckOutdated(check)) return null;
  return (
    <section
      aria-label="점검 표 변경 안내"
      className="mb-6 flex items-start gap-2 rounded-lg border border-warning-border bg-warning-subtle px-5 py-4 text-sm text-warning-strong"
    >
      <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{materialCheckOutdatedMessage(check!.version)}</p>
    </section>
  );
}
