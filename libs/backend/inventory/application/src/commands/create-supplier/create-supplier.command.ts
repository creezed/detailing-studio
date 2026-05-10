export class CreateSupplierCommand {
  constructor(
    public readonly name: string,
    public readonly inn: string | null,
    public readonly contact: {
      readonly phone: string | null;
      readonly email: string | null;
      readonly address: string | null;
    },
  ) {}
}
