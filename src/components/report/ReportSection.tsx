import type { ReactNode } from "react";

interface ReportSectionProps {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}

export function ReportSection({ number, title, description, children }: ReportSectionProps) {
  return (
    <section className="space-y-6 border-t border-slate-200 py-12 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Section {String(number).padStart(2, "0")}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        </div>
        {description ? <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
