interface YearSwitcherProps {
  years: number[]; // newest first, e.g. from yearsWithInvoices()
  selected: number | null; // null = all time
  onChange: (year: number | null) => void;
}

/** Same pill-button style as the app's other status/tab filters. */
export default function YearSwitcher({ years, selected, onChange }: YearSwitcherProps) {
  if (years.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {years.map((y) => (
        <button
          key={y}
          onClick={() => onChange(y)}
          className={`rounded px-3 py-1 text-sm transition-colors ${
            selected === y ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {y}
        </button>
      ))}
      <button
        onClick={() => onChange(null)}
        className={`rounded px-3 py-1 text-sm transition-colors ${
          selected === null ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        All time
      </button>
    </div>
  );
}
