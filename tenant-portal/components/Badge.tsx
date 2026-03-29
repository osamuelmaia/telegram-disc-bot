type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple';

const styles: Record<Variant, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
};

export function Badge({ label, variant = 'gray' }: { label: string; variant?: Variant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[variant]}`}>
      {label}
    </span>
  );
}
