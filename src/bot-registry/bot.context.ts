import { Context, Scenes } from 'telegraf';

export interface BotSession extends Scenes.SceneSession {
  productId?: string;
  endUserId?: string;
}

export interface BotContext extends Context {
  tenantId: string;
  session: BotSession;
  scene: Scenes.SceneContextScene<BotContext, Scenes.SceneSessionData>;
}
