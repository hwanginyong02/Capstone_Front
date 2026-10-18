/**
 * 아이콘만 있는 동작 버튼 — 툴팁과 이름(aria-label)이 같다(docs/MATERIAL_PICKER.md §12.3, U2).
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
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("text-foreground-subtle hover:text-foreground", reveal && REVEAL[reveal], className)}
    >
      {children}
    </Button>
  );
  // 꺼진 버튼은 포인터 이벤트를 받지 않아 툴팁이 뜨지 않는다 — 이름(aria-label)으로 충분하다.
  if (disabled) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
