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
