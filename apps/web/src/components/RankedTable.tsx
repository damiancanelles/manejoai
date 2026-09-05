import { money, type RankedRow } from '../lib/invoiceStats';

// A ranked list with an inline magnitude bar - the "table (or table + chart)"
// form for more categories than a bar chart can comfortably seat. Single
// hue, no legend: every row is the same metric (gross income).
export default function RankedTable({ rows, emptyLabel }: { rows: RankedRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>;
  }
  const max = Math.max(...rows.map((r) => r.cents), 1);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-slate-100 first:border-t-0">
              <td className="px-4 py-2">{r.name}</td>
              <td className="w-40 px-4 py-2">
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-indigo-600"
                    style={{ width: `${Math.max((r.cents / max) * 100, r.cents > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </td>
              <td className="w-28 whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums">{money(r.cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
