/**
 * 프리셋 토글 — 최소 구성 / 전체.
 *
 * 현재 카드 상태가 어느 프리셋과도 같지 않으면(사용자가 일부만 켬) **두 칸 모두 선택
 * 해제**로 보인다(docs/COMPOSER_DESIGN.md "프리셋"). 둘 중 하나를 억지로 켜 두면 화면이
 * 거짓을 말한다.
 *
 * 꺼진 칸의 글자는 회색 배경 위라 `foreground-secondary` 를 쓴다 — `muted-foreground` 는
 * 그 배경에서 4.4:1 로 기준에 못 미친다(같은 문서 "색").
 */
import { cn } from "../../utils/styling/styles";
import type { ComposerPreset } from "../../types/reportComposer.types";

const PRESETS: Array<{ id: ComposerPreset; label: string }> = [
  { id: "minimal", label: "최소 구성" },
  { id: "full", label: "전체" },
];

interface PresetToggleProps {
  /** 지금 상태와 같은 프리셋. 어느 쪽도 아니면 null. */
  active: ComposerPreset | null;
  onApply: (preset: ComposerPreset) => void;
}

export function PresetToggle({ active, onApply }: PresetToggleProps) {
  return (
    <div
      role="group"
      aria-label="프리셋"
      className="inline-flex h-8 items-center gap-1 rounded-md bg-muted p-1"
    >
      {PRESETS.map((preset) => {
        const isActive = active === preset.id;

        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onApply(preset.id)}
            className={cn(
              "h-6 rounded-sm px-3 text-body-medium",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isActive
                ? "border border-border bg-card font-medium text-foreground"
                : "text-foreground-secondary",
            )}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
