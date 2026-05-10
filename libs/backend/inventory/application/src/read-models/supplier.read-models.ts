export interface SupplierListItemReadModel {
  readonly id: string;
  readonly name: string;
  readonly inn: string | null;
  readonly isActive: boolean;
}

export interface SupplierDetailReadModel {
  readonly id: string;
  readonly name: string;
  readonly inn: string | null;
  readonly contact: {
    readonly phone: string | null;
    readonly email: string | null;
    readonly address: string | null;
  };
  readonly isActive: boolean;
}
