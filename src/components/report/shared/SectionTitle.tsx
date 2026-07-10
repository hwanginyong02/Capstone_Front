import { cn } from "../../../utils/styling/styles";

interface SectionTitleProps {
  number: number;
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionTitle({ number, title, subtitle, className }: SectionTitleProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
        Section {String(number).padStart(2, "0")}
      </div>
      <h2 className="text-2xl font-semibold text-slate-900">
        {number}. {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}
