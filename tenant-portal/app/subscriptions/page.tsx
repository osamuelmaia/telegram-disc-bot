import { redirect } from 'next/navigation';

export default function SubscriptionsPage() {
  redirect('/sales?tab=subscriptions');
}
