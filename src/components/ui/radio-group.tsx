"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { CheckIcon, CircleIcon } from "lucide-react";

import { cn } from "../../utils/styling/styles";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

const BASE_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50";

/**
 * 네모 변형(`shape="square"`)은 체크박스와 같은 모양이다.
 *
 * 16px 짜리 동그라미 하나는 누르기에 작다는 지적에서 왔다. 모양을 체크박스와 맞추면
 * 호출하는 쪽이 하나를 고르는 질문과 여럿을 고르는 질문을 **같은 타일**로 그릴 수 있고,
 * 그러면 줄 전체가 누를 수 있는 넓이가 된다(`composer-input/ComposerFieldInput.tsx`).
 * 역할은 그대로 radio 라, 하나만 고를 수 있다는 사실은 보조 기술에 그대로 전해진다.
 */
function RadioGroupItem({
  className,
  shape = "circle",
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  shape?: "circle" | "square";
}) {
  const square = shape === "square";

  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        BASE_CLASS,
        square
          ? "bg-input-background flex items-center justify-center rounded-[4px] data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          : "text-primary rounded-full",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        {square ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
        )}
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
