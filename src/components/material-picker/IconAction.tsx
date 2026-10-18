/**
 * 아이콘만 있는 동작 버튼 — 툴팁과 이름(aria-label)이 같다(docs/MATERIAL_PICKER.md §12.3, U2).
 * 꺼진 상태는 `aria-disabled` 다(포커스를 잃지 않게).
 *
 * `title` 대신 툴팁을 쓰고, 공용 Button 의 포커스 링을 그대로 얻는다. `reveal` 을 주면 그 그룹에
 * 마우스를 올리거나 포커스가 갈 때만 보인다(터치에서는 늘 보임, `REVEAL`).
 */
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../../utils/styling/styles";
import { REVEAL, type RevealGroup } from "./controlStyles";

interface IconActionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  reveal?: RevealGroup;
  className?: string;
  children: ReactNode;
}

export function IconAction({ label, onClick, disabled, reveal, className, children }: IconActionProps) {
  // 꺼져도 네이티브 disabled 를 쓰지 않는다 — 블록째 넣기처럼 누른 뒤 꺼지는 버튼에서 포커스가 body 로
  // 떨어지지 않게, 같은 요소로 남겨 aria-disabled 로 알리고 누르기만 막는다.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-disabled={disabled || undefined}
          onClick={disabled ? undefined : onClick}
          className={cn(
            "text-foreground-subtle hover:text-foreground",
            disabled && "cursor-default opacity-40 hover:bg-transparent hover:text-foreground-subtle",
            reveal && REVEAL[reveal],
            className,
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
