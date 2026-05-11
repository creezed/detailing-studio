export class CreateBranchCommand {
  constructor(
    public readonly name: string,
    public readonly address: string,
    public readonly timezone: string,
  ) {}
}
