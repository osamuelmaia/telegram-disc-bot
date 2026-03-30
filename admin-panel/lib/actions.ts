'use server';

import { revalidatePath } from 'next/cache';
import * as api from './api';

export async function cancelSubscriptionAction(id: string, immediately: boolean) {
  await api.cancelSubscription(id, immediately);
  revalidatePath('/subscriptions');
}

export async function revokeAccessAction(id: string, reason: string) {
  await api.revokeAccess(id, reason);
  revalidatePath('/accesses');
}

export async function grantAccessAction(formData: FormData) {
  const body = {
    userId: formData.get('userId') as string,
    productId: formData.get('productId') as string,
    chatId: formData.get('chatId') as string,
    expiresAt: (formData.get('expiresAt') as string) || undefined,
  };
  await api.grantAccess(body);
  revalidatePath('/accesses');
}

export async function createProductAction(formData: FormData) {
  const body = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || undefined,
    type: formData.get('type') as 'ONE_TIME' | 'RECURRING',
    price: parseFloat(formData.get('price') as string),
    currency: 'BRL',
    billingInterval: (formData.get('billingInterval') as string) || undefined,
    trialDays: formData.get('trialDays') ? Number(formData.get('trialDays')) : undefined,
    chatId: (formData.get('chatId') as string) || undefined,
  };
  await api.createProduct(body);
  revalidatePath('/products');
}

export async function updateProductAction(id: string, formData: FormData) {
  const body = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || undefined,
    price: parseFloat(formData.get('price') as string),
    chatId: (formData.get('chatId') as string) || undefined,
    active: formData.get('active') === 'true',
  };
  await api.updateProduct(id, body);
  revalidatePath('/products');
}

export async function deleteProductAction(id: string) {
  await api.deleteProduct(id);
  revalidatePath('/products');
}

export async function retryWebhookAction(id: string) {
  await api.retryWebhook(id);
  revalidatePath('/webhooks');
}

export async function suspendTenantAction(id: string) {
  await api.suspendTenant(id);
  revalidatePath('/tenants');
}

export async function activateTenantAction(id: string) {
  await api.activateTenant(id);
  revalidatePath('/tenants');
}

export async function updateTenantSettingsAction(id: string, formData: FormData) {
  const feeStr = formData.get('feePercent') as string;
  const daysStr = formData.get('cardReleaseDays') as string;
  await api.updateTenantSettings(id, {
    feePercent: feeStr ? parseFloat(feeStr) / 100 : undefined,
    cardReleaseDays: daysStr ? parseInt(daysStr) : undefined,
  });
  revalidatePath('/tenants');
}

export async function approveWithdrawalAction(id: string) {
  await api.approveWithdrawal(id);
  revalidatePath('/withdrawals');
}

export async function rejectWithdrawalAction(id: string, reason: string) {
  await api.rejectWithdrawal(id, reason);
  revalidatePath('/withdrawals');
}

export async function updatePlatformConfigAction(formData: FormData) {
  await api.updatePlatformConfig({
    feePercent: parseFloat(formData.get('feePercent') as string),
    minWithdrawalAmount: parseFloat(formData.get('minWithdrawalAmount') as string),
    withdrawalPaymentDays: parseInt(formData.get('withdrawalPaymentDays') as string),
  });
  revalidatePath('/config');
}

export async function upsertPlatformGatewayAction(type: string, formData: FormData) {
  const credentials: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && value) {
      credentials[key] = value;
    }
  }
  await api.upsertPlatformGateway(type, credentials);
  revalidatePath('/gateways');
}

export async function setPlatformGatewayActiveAction(type: string, active: boolean) {
  await api.setPlatformGatewayActive(type, active);
  revalidatePath('/gateways');
}
