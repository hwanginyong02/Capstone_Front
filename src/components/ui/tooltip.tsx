"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "../../utils/styling/styles";

/**
 * 툴팁. `title` 속성 대신 쓴다 — 키보드 포커스에도 뜨고 화면 낭독기가 설명으로 읽는다.
 *
 * - 바깥에 `TooltipProvider` 가 있으면 그것을 나눠 쓰고(지연 시간·이어 보기를 함께), 없으면 `Tooltip` 이
 *   스스로 Provider 를 감싸 단독으로 쓸 수 있다.
 * - **화살표를 그리지 않는다.** Radix 의 Arrow 는 `useSize` 가 가드 없이 `new ResizeObserver` 를
 *   불러 jsdom(테스트)에서 깨진다.
 */
/** 바깥에 Provider 가 있는지. Radix 는 이것을 알려 주지 않아 따로 둔다. */
const HasProvider = React.createContext(false);

function TooltipProvider({
  delayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <HasProvider.Provider value={true}>
      <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
    </HasProvider.Provider>
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const root = <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
  return React.useContext(HasProvider) ? root : <TooltipProvider>{root}</TooltipProvider>;
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-72 rounded-md bg-foreground px-2.5 py-1.5 text-xs leading-[18px] text-background shadow-md",
          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
