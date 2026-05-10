import type { SkuId } from './sku-id';
import type { Sku } from './sku.aggregate';
import type { ArticleNumber } from '../value-objects/article-number.value-object';
import type { Barcode } from '../value-objects/barcode.value-object';

export interface ISkuRepository {
  findById(id: SkuId): Promise<Sku | null>;
  findByArticleNumber(articleNumber: ArticleNumber): Promise<Sku | null>;
  findByBarcode(barcode: Barcode): Promise<Sku | null>;
  save(sku: Sku): Promise<void>;
}
