import { Markup } from 'telegraf';

/**
 * Menu principal — exibido no /start e no "Voltar ao menu".
 */
export const mainKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback('🛍  Ver Produtos', 'show_products')],
    [Markup.button.callback('📦  Meus Acessos', 'my_accesses')],
    [Markup.button.callback('💬  Suporte', 'support')],
  ]);
