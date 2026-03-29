import { redirect } from 'next/navigation';

export default function WithdrawalsPage() {
  redirect('/wallet?tab=withdrawals');
}
