const OPTIONS = [
  { label: 'Hoje', value: 'today' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
];

export default function PeriodSelector({ current }: { current: string }) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
      {OPTIONS.map((opt) => (
        <a
          key={opt.value}
          href={`?period=${opt.value}`}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            current === opt.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </a>
      ))}
    </div>
  );
}
