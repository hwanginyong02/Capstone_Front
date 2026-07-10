import { Badge } from "../../ui/badge";
import { cn } from "../../../utils/styling/styles";

type Verdict = "pass" | "fail" | "warning" | "unavailable";

const config: Record<Verdict, { label: string; className: string }> = {
  pass:        { label: "합격",       className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  warning:     { label: "조건부합격", className: "border-amber-200 bg-amber-50 text-amber-700" },
  fail:        { label: "불합격",     className: "border-red-200 bg-red-50 text-red-700" },
  // 계산 실패(측정 불가) — 미정의 키 접근 크래시를 막고 회색으로 명확히 구분(D4/X4).
  unavailable: { label: "측정 불가",  className: "border-slate-200 bg-slate-100 text-slate-500" },
};

interface PassBadgeProps {
  verdict: Verdict;
  className?: string;
}

export function PassBadge({ verdict, className }: PassBadgeProps) {
  const { label, className: variantClass } = config[verdict];
  return (
    <Badge className={cn(variantClass, className)}>
      {label}
    </Badge>
  );
}
