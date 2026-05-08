export class CreateServiceCategoryCommand {
  constructor(
    public readonly name: string,
    public readonly icon: string,
    public readonly displayOrder: number,
  ) {}
}
