export interface IamUserReadModel {
  readonly id: string;
  readonly fullName: string;
}

export interface IIamUserPort {
  getById(userId: string): Promise<IamUserReadModel | null>;
}
