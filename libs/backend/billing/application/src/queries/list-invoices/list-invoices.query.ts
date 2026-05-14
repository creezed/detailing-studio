import type { TenantId } from '@det/shared-types';

export class ListInvoicesQuery {
  constructor(
    public readonly tenantId: TenantId,
    public readonly limit: number = 20,
  ) {}
}

export interface InvoiceDto {
  readonly id: string;
  readonly planCode: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly periodStartedAt: string;
  readonly periodEndsAt: string;
  readonly status: string;
  readonly issuedAt: string;
  readonly paidAt: string | null;
}
