export interface CatalogSkuReadModel {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
}

export interface ICatalogSkuPort {
  getMany(skuIds: readonly string[]): Promise<readonly CatalogSkuReadModel[]>;
}
