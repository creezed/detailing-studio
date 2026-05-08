import type {
  MaterialNormSnapshot,
  ServicePricingSnapshot,
  ServiceSnapshot,
} from '@det/backend/catalog/domain';

export interface ServiceDto {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly categoryId: string;
  readonly durationMinutes: number;
  readonly pricing: ServicePricingSnapshot;
  readonly materialNorms: readonly MaterialNormSnapshot[];
  readonly isActive: boolean;
  readonly displayOrder: number;
  readonly version: number;
}

export interface ServiceCatalogItemDto {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly categoryId: string;
  readonly durationMinutes: number;
  readonly pricing: ServicePricingSnapshot;
  readonly displayOrder: number;
}

export function toServiceDto(snapshot: ServiceSnapshot): ServiceDto {
  return {
    categoryId: snapshot.categoryId,
    description: snapshot.description,
    displayOrder: snapshot.displayOrder,
    durationMinutes: snapshot.durationMinutes,
    id: snapshot.id,
    isActive: snapshot.isActive,
    materialNorms: snapshot.materialNorms,
    name: snapshot.name,
    pricing: snapshot.pricing,
    version: snapshot.version,
  };
}

export function toServiceCatalogItemDto(snapshot: ServiceSnapshot): ServiceCatalogItemDto {
  return {
    categoryId: snapshot.categoryId,
    description: snapshot.description,
    displayOrder: snapshot.displayOrder,
    durationMinutes: snapshot.durationMinutes,
    id: snapshot.id,
    name: snapshot.name,
    pricing: snapshot.pricing,
  };
}
