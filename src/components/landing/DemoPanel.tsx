import type { ReactNode } from "react";
import { MousePointer2 } from "lucide-react";
import { cn } from "../../utils/styling/styles";

/**
 * LiveProcessDemo 애니메이션의 각 단계 패널 래퍼. 커서 오버레이와 등장 애니메이션을 담당한다.
 */
export function DemoPanel({
  index,
  children,
  action,
}: {
  index: number;
  children: ReactNode;
  action: string;
}) {
  return (
    <div
      className="landing-live-panel absolute inset-0 overflow-hidden px-8 pb-10 pt-8"
      style={{ animationDelay: `${index * 4.2}s` }}
    >
      <div className={cn("landing-demo-cursor", `landing-demo-cursor-${index}`)}>
        <MousePointer2 className="h-5 w-5 fill-primary text-primary" />
        <span>{action}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * 데모 패널 내부에서 사용하는 라벨 + 값 필드(입력 흉내). typing 이면 타이핑 애니메이션을 적용한다.
 */
export function DemoField({
  label,
  value,
  typing = false,
}: {
  label: string;
  value: string;
  typing?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} <span className="text-red-600">*</span>
      </label>
      <div className={cn("rounded-md border bg-input-background px-3 py-2 text-sm", typing && "landing-type")}>
        {value}
      </div>
    </div>
  );
}
