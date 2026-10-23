/**
 * 카드 값을 기존 저장소 필드에도 흘려보낸다.
 *
 * ⑨ 모델 설정·실행 환경은 카드가 생기기 전부터 `basicInfo` 가 같은 것을 받고 있었고,
 * **성적서를 그리는 코드는 그쪽을 읽는다**(`lib/report/mapWorkflowToFinalReport.ts`). 두
 * 입력란을 한 화면에 나란히 두면 사용자가 같은 값을 두 번 적게 되므로, 입력란은 카드 하나로
 * 합치고 값만 양쪽에 쓴다.
 *
 * ⑥ 학습 데이터는 여기를 거치지 않는다 — 기존 저장소를 없애고 성적서가 카드 값을 직접 읽는다.
 *
 * 어느 필드가 어디로 가는지는 레지스트리의 `legacy` 가 들고 있다 — 매핑표를 여기 또 적으면
 * 두 벌이 된다.
 *
 * 순수 함수다. 성적서 입력을 만들 때 ⑨ 실행 환경을 `basicInfo.env*` 로 옮기는 데 쓴다
 * (`lib/report/mapWorkflowToFinalReport.ts` 의 `buildReportInput`). 종전의 Details "시험 환경"
 * 폼은 없앴다(docs/MATERIAL_PICKER.md §5).
 */
import type {
  ComposerField,
  ComposerFieldValue,
  LegacyTarget,
} from "../../types/reportComposer.types";
import { isEntryUnknown } from "../../data/reportComposer";

export interface LegacyPatch {
  basicInfo?: Record<string, string>;
}

/** `entries` 를 한 줄로 합친다 — 칸이 동적이라 짝지을 기존 필드가 하나뿐일 때 쓴다. */
function joinEntries(value: ComposerFieldValue): string {
  return (value.entries ?? [])
    .filter((entry) => entry.key.trim() !== "" || entry.value.trim() !== "")
    .map((entry) => `${entry.key} ${entry.value}`.trim())
    .join(" / ");
}

/** 한 칸의 값. 없으면 빈 문자열 — 지웠다는 사실도 기존 저장소에 전해야 한다. */
function entryValue(value: ComposerFieldValue, key: string): string {
  return value.entries?.find((entry) => entry.key === key)?.value ?? "";
}

/**
 * 이 필드 하나를 기존 저장소에 반영하는 patch. 연결이 없으면 빈 객체다.
 *
 * **"모름"은 빈 값으로 보낸다**(필드 모름이면 모든 칸, 칸별 모름이면 그 칸). 기존 저장소에는 모름을 담을
 * 자리가 없고, 성적서는 빈 칸을 "제공되지 않음"으로 그린다 — 뜻이 맞아떨어진다.
 */
export function buildLegacyPatch(
  field: ComposerField,
  value: ComposerFieldValue,
): LegacyPatch {
  const link = field.legacy;
  if (!link) return {};

  const target: LegacyTarget = link.target;
  const cleared = Boolean(value.unknown);

  if ("byKey" in link) {
    const patch: Record<string, string> = {};
    // 칸별 "모름"(W3)은 그 칸만 비운다 — 4절은 그 칸만 "제공되지 않음", 2층 7번은 그 칸 이름만 빠졌다고 센다.
    for (const [key, legacyField] of Object.entries(link.byKey)) {
      patch[legacyField] = cleared || isEntryUnknown(value, key) ? "" : entryValue(value, key);
    }
    return { [target]: patch };
  }

  const text =
    cleared ? "" : field.input === "entries" ? joinEntries(value) : (value.text ?? "");
  return { [target]: { [link.field]: text } };
}
