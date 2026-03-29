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

  async getTransactions(tenantId: string, take = 50) {
    const wallet = await this.getOrCreateWallet(tenantId);
    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
