export interface CrmClientReadModel {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string | null;
}

export interface ICrmClientPort {
  getById(clientId: string): Promise<CrmClientReadModel | null>;
}
