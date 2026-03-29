const COLORS: Record<string, string> = {
  // Orders
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
  REFUNDED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  // Subscriptions
  ACTIVE: 'bg-green-100 text-green-800',
  TRIALING: 'bg-blue-100 text-blue-800',
  PAST_DUE: 'bg-orange-100 text-orange-800',
  UNPAID: 'bg-red-100 text-red-800',
  // Accesses
  REVOKED: 'bg-red-100 text-red-800',
  // Webhooks
  PROCESSED: 'bg-green-100 text-green-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-gray-100 text-gray-600',
  IGNORED: 'bg-gray-100 text-gray-400',
};

export function Badge({ value }: { value: string }) {
  const cls = COLORS[value] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {value}
    </span>
  );
}
