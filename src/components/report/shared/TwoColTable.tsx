import { cn } from "../../../utils/styling/styles";

export interface TableRow {
  label: string;
  value: string;
}

interface TwoColTableProps {
  rows: TableRow[];
  className?: string;
}

export function TwoColTable({ rows, className }: TwoColTableProps) {
  return (
    <table className={cn("w-full text-sm border-collapse", className)}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-slate-100 last:border-b-0">
            <td className="w-40 py-2 pr-4 font-medium text-slate-500 align-top">{row.label}</td>
            <td className="py-2 text-slate-900">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
