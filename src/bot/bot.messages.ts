import { Access, Product, ProductType } from '@prisma/client';

// Formata Decimal do Prisma ou número como moeda BRL
const brl = (value: number | string | { toString(): string }): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value.toString()),
  );

const ptBRDate = (date: Date): string =>
  date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// =============================================================================
// Mensagens do Bot
// =============================================================================

export const Messages = {
  // ── Boas-vindas ─────────────────────────────────────────────────────────────
  welcome: (firstName: string) =>
    `👋 Olá, *${firstName}*\\! Que bom te ver por aqui\\.\n\n` +
    `Aqui você encontra nossos produtos e pode realizar seu pagamento com segurança, diretamente pelo Telegram\\.\n\n` +
    `O que deseja fazer hoje?`,

  // ── Lista de produtos ────────────────────────────────────────────────────────
  productList: {
    header: `🛍 *Nossos Produtos*\n\nEscolha um produto abaixo para ver os detalhes e formas de pagamento:`,

    empty:
      `😔 *Nenhum produto disponível no momento\\.*\n\n` +
      `Entre em contato com o suporte para mais informações\\.`,
  },

  // ── Detalhe do produto ───────────────────────────────────────────────────────
  productDetail: (product: Product): string => {
    const price =
      product.type === ProductType.RECURRING
        ? `${brl(product.price)}/mês`
        : brl(product.price);

    const typeInfo =
      product.type === ProductType.ONE_TIME
        ? `⚡ *Acesso único* — liberado imediatamente após o pagamento\\.`
        : `♻️ *Assinatura mensal* — renovação automática\\. Cancele quando quiser\\.`;

    const description = product.description
      ? `\n_${escapeMd(product.description)}_\n`
      : '';

    return (
      `📦 *${escapeMd(product.name)}*\n` +
      `${description}\n` +
      `💰 *Valor:* ${escapeMd(price)}\n` +
      `${typeInfo}\n\n` +
      `Como deseja pagar?`
    );
  },

  // ── Pix ─────────────────────────────────────────────────────────────────────
  pix: {
    generating: `⏳ Gerando seu QR Code Pix\\.\\.\\.`,

    ready: (pixCopyPaste: string, expiresAt: Date): string =>
      `✅ *Pagamento Pix gerado com sucesso\\!*\n\n` +
      `Escaneie o QR Code acima ou copie o código abaixo:\n\n` +
      `\`${pixCopyPaste}\`\n\n` +
      `⏱ *Válido até:* ${escapeMd(ptBRDate(expiresAt))}\n\n` +
      `Assim que o pagamento for confirmado, você receberá o acesso automaticamente\\. ✨`,

    readyNoImage: (pixCopyPaste: string, expiresAt: Date): string =>
      `✅ *Pagamento Pix gerado com sucesso\\!*\n\n` +
      `Copie o código abaixo e cole no app do seu banco:\n\n` +
      `\`${pixCopyPaste}\`\n\n` +
      `⏱ *Válido até:* ${escapeMd(ptBRDate(expiresAt))}\n\n` +
      `Assim que o pagamento for confirmado, você receberá o acesso automaticamente\\. ✨`,

    confirmed: (productName: string): string =>
      `🎉 *Pagamento confirmado\\!*\n\n` +
      `Seu acesso ao produto *${escapeMd(productName)}* foi liberado\\.\n\n` +
      `Use o botão abaixo para entrar no grupo\\.`,

    error:
      `❌ *Não foi possível gerar o Pix no momento\\.*\n\n` +
      `Por favor, tente novamente ou entre em contato com o suporte\\.`,

    cancelled: `↩️ Pagamento cancelado\\. Use /start para voltar ao menu principal\\.`,
  },

  // ── Cartão / Assinatura ──────────────────────────────────────────────────────
  card: {
    generating: `⏳ Gerando seu link de pagamento\\.\\.\\.`,

    ready: (checkoutUrl: string): string =>
      `✅ *Sua assinatura está pronta para ser ativada\\!*\n\n` +
      `Clique no botão abaixo para concluir o pagamento com segurança\\.\n\n` +
      `🔒 O checkout é realizado em ambiente seguro \\(Stripe\\)\\.\n\n` +
      `Após o pagamento, seu acesso será liberado automaticamente\\. ✨\n\n` +
      `🔗 [Acessar checkout](${checkoutUrl})`,

    confirmed: (productName: string): string =>
      `🎉 *Assinatura ativada com sucesso\\!*\n\n` +
      `Seu acesso ao produto *${escapeMd(productName)}* está ativo\\.\n\n` +
      `Use o botão abaixo para entrar no grupo\\.`,

    pastDue: (productName: string): string =>
      `⚠️ *Pagamento em atraso — ${escapeMd(productName)}*\n\n` +
      `Não conseguimos processar a cobrança da sua assinatura\\.\n\n` +
      `Verifique seu cartão e tente novamente pelo link enviado\\.\n` +
      `Seu acesso será suspenso caso o pagamento não seja regularizado\\.`,

    cancelled: (productName: string): string =>
      `😔 *Assinatura cancelada — ${escapeMd(productName)}*\n\n` +
      `Seu acesso foi revogado\\.\n\n` +
      `Se quiser reativar, use /start a qualquer momento\\.`,

    error:
      `❌ *Não foi possível gerar o link de pagamento\\.*\n\n` +
      `Por favor, tente novamente ou entre em contato com o suporte\\.`,

    aborted: `↩️ Ação cancelada\\. Use /start para voltar ao menu principal\\.`,
  },

  // ── Meus acessos ────────────────────────────────────────────────────────────
  myAccesses: {
    empty:
      `📭 *Você não possui nenhum acesso ativo no momento\\.*\n\n` +
      `Use o menu abaixo para adquirir um produto\\.`,

    header: (count: number): string =>
      `📦 *Seus Acessos \\(${count}\\)*\n\n` +
      `Estes são seus produtos ativos:`,

    item: (access: Access & { product: { name: string } }): string =>
      `• *${escapeMd(access.product.name)}* — ✅ Ativo`,
  },

  // ── Suporte ──────────────────────────────────────────────────────────────────
  support:
    `💬 *Suporte*\n\n` +
    `Para dúvidas ou problemas, fale com nossa equipe:\n\n` +
    `👉 @suporte\\_usuario\n\n` +
    `🕘 Atendimento: segunda a sexta, 9h às 18h\\.`,

  // ── Genérico ─────────────────────────────────────────────────────────────────
  error:
    `⚠️ Ocorreu um erro inesperado\\. Por favor, tente novamente\\.\n\n` +
    `Se o problema persistir, use /start para reiniciar\\.`,

  backToMenu: `↩️ Use /start para voltar ao menu principal\\.`,
};

/**
 * Escapa caracteres especiais do MarkdownV2 do Telegram.
 * Necessário para textos dinâmicos (nomes, preços, datas).
 */
export function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}
