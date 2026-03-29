import { Markup } from 'telegraf';
import { Product, ProductType } from '@prisma/client';

// callback_data tem limite de 64 bytes. cuid() tem 25 chars.
// "select_product_" = 15 chars → 15 + 25 = 40 bytes. OK.
// "pay_pix_"        =  8 chars →  8 + 25 = 33 bytes. OK.
// "pay_card_"       =  9 chars →  9 + 25 = 34 bytes. OK.

const formatPrice = (product: Product): string => {
  const value = Number(product.price.toString()).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return product.type === ProductType.RECURRING ? `R$ ${value}/mês` : `R$ ${value}`;
};

/**
 * Lista de produtos — um botão por produto com ícone de tipo e preço.
 */
export const productListKeyboard = (products: Product[]) =>
  Markup.inlineKeyboard([
    ...products.map((p) => [
      Markup.button.callback(
        `${p.type === ProductType.ONE_TIME ? '⚡' : '♻️'}  ${p.name}  —  ${formatPrice(p)}`,
        `select_product_${p.id}`,
      ),
    ]),
    [Markup.button.callback('↩️  Menu Principal', 'back_to_menu')],
  ]);

/**
 * Opções de pagamento para um produto específico.
 * Exibe apenas o método compatível com o tipo do produto.
 */
export const paymentMethodKeyboard = (product: Product) => {
  const buttons = [];

  if (product.type === ProductType.ONE_TIME) {
    buttons.push([
      Markup.button.callback('💰  Pagar com Pix', `pay_pix_${product.id}`),
    ]);
  }

  if (product.type === ProductType.RECURRING) {
    buttons.push([
      Markup.button.callback('💳  Assinar com Cartão', `pay_card_${product.id}`),
    ]);
  }

  buttons.push([Markup.button.callback('↩️  Ver outros produtos', 'show_products')]);

  return Markup.inlineKeyboard(buttons);
};

/**
 * Botão de cancelar exibido durante o fluxo de checkout.
 */
export const cancelCheckoutKeyboard = (type: 'pix' | 'card') =>
  Markup.inlineKeyboard([
    [Markup.button.callback('❌  Cancelar', type === 'pix' ? 'cancel_pix' : 'cancel_card')],
  ]);

/**
 * Botão de acesso ao grupo/canal — enviado após confirmação do pagamento.
 */
export const accessGrantedKeyboard = (inviteLink: string) =>
  Markup.inlineKeyboard([
    [Markup.button.url('🔑  Acessar agora', inviteLink)],
    [Markup.button.callback('↩️  Menu Principal', 'back_to_menu')],
  ]);
