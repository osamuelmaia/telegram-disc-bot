import { Context as TelegrafContext, Scenes } from 'telegraf';

// Dados persistidos na sessão entre interações do usuário
export interface BotSessionData extends Scenes.SceneSessionData {
  selectedProductId?: string;
}

/**
 * Contexto customizado do bot.
 * Extende o Context do Telegraf com suporte a scenes e sessão tipada.
 * Injetar como parâmetro em todos os handlers com @Ctx().
 */
export type BotContext = TelegrafContext & {
  scene: Scenes.SceneContextScene<BotContext, BotSessionData>;
  session: BotSessionData;
};
