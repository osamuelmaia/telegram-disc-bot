import { Markup } from 'telegraf';
import { Product } from '@prisma/client';

export function buildProductListKeyboard(products: Product[]) {
  const buttons = products.map((p) =>
    [Markup.button.callback(
      `${p.name} — R$ ${Number(p.price).toFixed(2)}`,
      `product_${p.id}`,
    )],
  );
  return Markup.inlineKeyboard(buttons);
}

export function buildProductDetailKeyboard(productId: string, type: 'ONE_TIME' | 'RECURRING') {
  const buttons = [
    [Markup.button.callback('💳 Pagar com Pix', `pay_pix_${productId}`)],
  ];
  if (type === 'RECURRING') {
    buttons.push([Markup.button.callback('💳 Assinar com Cartão', `pay_card_${productId}`)]);
  }
  buttons.push([Markup.button.callback('⬅️ Voltar', 'show_products')]);
  return Markup.inlineKeyboard(buttons);
}
