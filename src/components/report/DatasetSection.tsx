import type { ReactNode } from "react";
import { BarChart3, Database, FileDigit, Layers3 } from "lucide-react";
import { ReportSection } from "./ReportSection";
import type { ReportDataset } from "@/types/report.types";

interface DatasetSectionProps {
  dataset: ReportDataset;
}

export function DatasetSection({ dataset }: DatasetSectionProps) {
  const evaluationRatio = dataset.totalSamples > 0 ? (dataset.evaluationSamples / dataset.totalSamples) * 100 : 0;
  const trainingRatio = dataset.totalSamples > 0 ? (dataset.trainingSamples / dataset.totalSamples) * 100 : 0;

  return (
    <ReportSection
      number={2}
      title="Dataset"
      description="This section stitches together the upload step and dataset form fields so the report reflects what the user actually configured."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Database className="h-4 w-4 text-sky-700" />} label="Total samples" value={dataset.totalSamples.toLocaleString()} />
        <KpiCard icon={<Layers3 className="h-4 w-4 text-sky-700" />} label="Training samples" value={dataset.trainingSamples.toLocaleString()} />
        <KpiCard
          icon={<BarChart3 className="h-4 w-4 text-sky-700" />}
          label="Evaluation samples"
          value={dataset.evaluationSamples.toLocaleString()}
        />
        <KpiCard icon={<FileDigit className="h-4 w-4 text-sky-700" />} label="Dataset format" value={dataset.format} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="text-sm font-semibold text-slate-900">Source and split</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoRow label="Source file" value={dataset.sourceName} />
            <InfoRow label="Class labels" value={dataset.classLabels.join(", ")} />
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              <span>Train / Eval split</span>
              <span>{trainingRatio.toFixed(1)}% / {evaluationRatio.toFixed(1)}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-100">
              <div className="flex h-full">
                <div className="bg-slate-900" style={{ width: `${trainingRatio}%` }} />
                <div className="bg-sky-500" style={{ width: `${evaluationRatio}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="text-sm font-semibold text-slate-900">Notes</div>
          <ul className="mt-4 space-y-3">
            {dataset.notes.map((note) => (
              <li key={note} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ReportSection>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm leading-6 text-slate-900">{value}</div>
    </div>
  );
}
