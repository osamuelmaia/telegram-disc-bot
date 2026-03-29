interface Props {
  title: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'default';
}

const ACCENT: Record<string, string> = {
  green: 'border-l-green-500',
  blue: 'border-l-blue-500',
  orange: 'border-l-orange-500',
  red: 'border-l-red-500',
  purple: 'border-l-purple-500',
  default: 'border-l-slate-400',
};

export function StatsCard({ title, value, sub, accent = 'default' }: Props) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${ACCENT[accent]} p-5`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
