'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { API_BASE } from './api';

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function registerAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
    signal: AbortSignal.timeout(8000),
  });

  if (!registerRes.ok) {
    const status = registerRes.status === 409 ? 'exists' : '1';
    redirect(`/register?error=${status}`);
  }

  // Registro ok — faz login automático para obter o token
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(8000),
  });

  if (!loginRes.ok) redirect('/login');

  const { access_token } = await loginRes.json();

  cookies().set('token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  redirect('/');
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    redirect('/login?error=1');
  }

  const { access_token } = await res.json();

  cookies().set('token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  });

  redirect('/');
}

export async function logoutAction() {
  cookies().delete('token');
  redirect('/login');
}

// ── Perfil ─────────────────────────────────────────────────────────────────────

export async function completeProfileAction(formData: FormData) {
  const token = cookies().get('token')?.value ?? '';
  await fetch(`${API_BASE}/dashboard/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      personType: formData.get('personType'),
      document: formData.get('document'),
      birthDate: formData.get('birthDate') || undefined,
      zipCode: formData.get('zipCode'),
      address: formData.get('address'),
      profileCompleted: true,
    }),
    signal: AbortSignal.timeout(8000),
  });
  revalidatePath('/');
}

export async function updateProfileAction(formData: FormData) {
  const token = cookies().get('token')?.value ?? '';
  await fetch(`${API_BASE}/dashboard/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: formData.get('name'),
      pixKeyType: formData.get('pixKeyType') || undefined,
      pixKeyValue: formData.get('pixKeyValue') || undefined,
    }),
    signal: AbortSignal.timeout(8000),
  });
  revalidatePath('/');
}

// ── Bot ────────────────────────────────────────────────────────────────────────

export async function upsertBotAction(formData: FormData) {
  const token = cookies().get('token')?.value ?? '';
  await fetch(`${API_BASE}/dashboard/bot`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      token: formData.get('token'),
      welcomeMessage: formData.get('welcomeMessage') || undefined,
      supportContact: formData.get('supportContact') || undefined,
    }),
    signal: AbortSignal.timeout(15000),
  });
  revalidatePath('/bot');
}

// ── Gateways ──────────────────────────────────────────────────────────────────

export async function upsertGatewayAction(formData: FormData) {
  const token = cookies().get('token')?.value ?? '';
  const type = formData.get('type') as string;

  let credentials: Record<string, unknown> = {};
  if (type === 'EFI') {
    credentials = {
      clientId: formData.get('clientId'),
      clientSecret: formData.get('clientSecret'),
      pixKey: formData.get('pixKey'),
      sandbox: formData.get('sandbox') === 'true',
      webhookSecret: formData.get('webhookSecret') || undefined,
    };
  } else if (type === 'STRIPE') {
    credentials = {
      secretKey: formData.get('secretKey'),
      webhookSecret: formData.get('webhookSecret'),
      apiVersion: '2024-04-10',
    };
  }

  await fetch(`${API_BASE}/dashboard/gateways/${type}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ credentials, active: true }),
    signal: AbortSignal.timeout(8000),
  });
  revalidatePath('/gateways');
}

// ── Produtos ──────────────────────────────────────────────────────────────────

export async function createProductAction(formData: FormData) {
  const token = cookies().get('token')?.value ?? '';
  await fetch(`${API_BASE}/dashboard/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      type: formData.get('type'),
      price: parseFloat(formData.get('price') as string),
      currency: 'BRL',
      billingInterval: formData.get('billingInterval') || undefined,
      trialDays: formData.get('trialDays') ? Number(formData.get('trialDays')) : undefined,
      chatId: formData.get('chatId') || undefined,
    }),
    signal: AbortSignal.timeout(8000),
  });
  revalidatePath('/products');
}

export async function deleteProductAction(id: string) {
  const token = cookies().get('token')?.value ?? '';
  await fetch(`${API_BASE}/dashboard/products/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  revalidatePath('/products');
}

// ── Carteira ──────────────────────────────────────────────────────────────────

export async function requestWithdrawalAction(formData: FormData) {
  const token = cookies().get('token')?.value ?? '';
  const amount = parseFloat(formData.get('amount') as string);
  await fetch(`${API_BASE}/dashboard/wallet/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount }),
    signal: AbortSignal.timeout(8000),
  });
  revalidatePath('/wallet');
  revalidatePath('/withdrawals');
}
