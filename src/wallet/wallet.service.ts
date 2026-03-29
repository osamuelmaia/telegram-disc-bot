import { Injectable, Logger } from '@nestjs/common';
import { Prisma, WalletTransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
// WalletService — ledger financeiro por tenant (append-only)
// =============================================================================
// Todas as operações que alteram saldo usam transação serializable para
// garantir consistência mesmo sob concorrência.
// =============================================================================

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWallet(tenantId: string) {
    return this.prisma.wallet.upsert({
      where: { tenantId },
      create: { tenantId, balance: 0, totalReceived: 0, totalFees: 0, totalWithdrawn: 0 },
      update: {},
    });
  }

  async getBalance(tenantId: string): Promise<Decimal> {
    const wallet = await this.getOrCreateWallet(tenantId);
    return new Decimal(wallet.balance.toString());
  }

  /**
   * Credita o valor líquido de uma venda na carteira do tenant.
   * Registra duas entradas no ledger: CREDIT_SALE (bruto) e DEBIT_PLATFORM_FEE.
   * A operação é atômica e usa isolamento serializable.
   */
  async creditSale(
    tenantId: string,
    orderId: string,
    grossAmount: Decimal,
    feeAmount: Decimal,
  ): Promise<void> {
    const netAmount = grossAmount.minus(feeAmount);

    await this.prisma.$transaction(
      async (tx) => {
        // Upsert da carteira — garante existência
        await tx.wallet.upsert({
          where: { tenantId },
          create: { tenantId, balance: 0, totalReceived: 0, totalFees: 0, totalWithdrawn: 0 },
          update: {},
        });

        const wallet = await tx.wallet.findUniqueOrThrow({ where: { tenantId } });
        const balanceBefore = new Decimal(wallet.balance.toString());
        const balanceAfter = balanceBefore.plus(netAmount);

        // Entrada de crédito (valor bruto da venda)
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.CREDIT_SALE,
            amount: grossAmount,
            balanceBefore,
            balanceAfter,
            description: `Venda #${orderId.substring(0, 8)}`,
            orderId,
          },
        });

        // Entrada de débito da taxa da plataforma
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.DEBIT_PLATFORM_FEE,
            amount: feeAmount.negated(),
            balanceBefore,
            balanceAfter,
            description: `Taxa plataforma - Venda #${orderId.substring(0, 8)}`,
            orderId,
          },
        });

        // Atualiza saldo e totais
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: balanceAfter,
            totalReceived: { increment: grossAmount },
            totalFees: { increment: feeAmount },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(
      `[${tenantId}] Sale credited — gross=${grossAmount} fee=${feeAmount} net=${netAmount} order=${orderId}`,
    );
  }

  /**
   * Credita o valor líquido de uma fatura de assinatura (Stripe) na carteira do tenant.
   * Idêntico ao creditSale, mas a entrada de ledger é vinculada ao subscriptionPaymentId.
   */
  async creditSubscriptionPayment(
    tenantId: string,
    subscriptionPaymentId: string,
    grossAmount: Decimal,
    feeAmount: Decimal,
  ): Promise<void> {
    const netAmount = grossAmount.minus(feeAmount);

    await this.prisma.$transaction(
      async (tx) => {
        await tx.wallet.upsert({
          where: { tenantId },
          create: { tenantId, balance: 0, totalReceived: 0, totalFees: 0, totalWithdrawn: 0 },
          update: {},
        });

        const wallet = await tx.wallet.findUniqueOrThrow({ where: { tenantId } });
        const balanceBefore = new Decimal(wallet.balance.toString());
        const balanceAfter = balanceBefore.plus(netAmount);

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.CREDIT_SALE,
            amount: grossAmount,
            balanceBefore,
            balanceAfter,
            description: `Assinatura #${subscriptionPaymentId.substring(0, 8)}`,
            subscriptionPaymentId,
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.DEBIT_PLATFORM_FEE,
            amount: feeAmount.negated(),
            balanceBefore,
            balanceAfter,
            description: `Taxa plataforma - Assinatura #${subscriptionPaymentId.substring(0, 8)}`,
            subscriptionPaymentId,
          },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: balanceAfter,
            totalReceived: { increment: grossAmount },
            totalFees: { increment: feeAmount },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(
      `[${tenantId}] Subscription payment credited — gross=${grossAmount} fee=${feeAmount} net=${netAmount} payment=${subscriptionPaymentId}`,
    );
  }

  /**
   * Cria uma solicitação de saque e debita o saldo da carteira atomicamente.
   * O admin aprova/rejeita depois; se rejeitado, chamar reverseWithdrawal().
   */
  async requestWithdrawal(
    tenantId: string,
    amount: Decimal,
    pixKeyType: string,
    pixKeyValue: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.wallet.upsert({
          where: { tenantId },
          create: { tenantId, balance: 0, totalReceived: 0, totalFees: 0, totalWithdrawn: 0 },
          update: {},
        });

        const wallet = await tx.wallet.findUniqueOrThrow({ where: { tenantId } });
        const balanceBefore = new Decimal(wallet.balance.toString());

        if (balanceBefore.lessThan(amount)) {
          throw new Error('Saldo insuficiente para realizar o saque');
        }

        const balanceAfter = balanceBefore.minus(amount);

        // Cria a solicitação
        const withdrawal = await tx.withdrawalRequest.create({
          data: {
            walletId: wallet.id,
            tenantId,
            amount,
            pixKeyType,
            pixKeyValue,
            status: 'PENDING',
          },
        });

        // Debita o saldo (reserva o valor)
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.DEBIT_WITHDRAWAL,
            amount: amount.negated(),
            balanceBefore,
            balanceAfter,
            description: `Saque solicitado #${withdrawal.id.substring(0, 8)}`,
            withdrawalRequestId: withdrawal.id,
          },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: balanceAfter,
            totalWithdrawn: { increment: amount },
          },
        });

        this.logger.log(`[${tenantId}] Withdrawal requested — amount=${amount} id=${withdrawal.id}`);
        return withdrawal;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Reverte um saque rejeitado: devolve o valor ao saldo da carteira.
   */
  async reverseWithdrawal(tenantId: string, withdrawalRequestId: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const withdrawal = await tx.withdrawalRequest.findUniqueOrThrow({
          where: { id: withdrawalRequestId },
        });

        const wallet = await tx.wallet.findUniqueOrThrow({ where: { tenantId } });
        const balanceBefore = new Decimal(wallet.balance.toString());
        const balanceAfter = balanceBefore.plus(withdrawal.amount);

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.CREDIT_REFUND,
            amount: new Decimal(withdrawal.amount.toString()),
            balanceBefore,
            balanceAfter,
            description: `Estorno de saque rejeitado #${withdrawalRequestId.substring(0, 8)}`,
            withdrawalRequestId,
          },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: balanceAfter,
            totalWithdrawn: { decrement: withdrawal.amount },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(`[${tenantId}] Withdrawal reversed — id=${withdrawalRequestId}`);
  }

  async getTransactions(tenantId: string, take = 50) {
    const wallet = await this.getOrCreateWallet(tenantId);
    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
