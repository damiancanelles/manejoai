const TONES = {
  red: { border: 'border-red-200', bg: 'bg-red-50', label: 'text-red-700', value: 'text-red-800' },
  amber: { border: 'border-amber-200', bg: 'bg-amber-50', label: 'text-amber-700', value: 'text-amber-800' },
  green: { border: 'border-green-200', bg: 'bg-green-50', label: 'text-green-700', value: 'text-green-800' },
} as const;

export default function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <div className={`rounded-lg border ${t.border} ${t.bg} p-4`}>
      <div className={`text-sm ${t.label}`}>{label}</div>
      <div className={`text-2xl font-bold ${t.value}`}>{value}</div>
      {sub && <div className={`text-sm ${t.label}`}>{sub}</div>}
    </div>
  );
}
