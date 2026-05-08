import type { ServiceCategorySnapshot } from '@det/backend/catalog/domain';

export interface ServiceCategoryDto {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly displayOrder: number;
  readonly isActive: boolean;
}

export function toServiceCategoryDto(snapshot: ServiceCategorySnapshot): ServiceCategoryDto {
  return {
    displayOrder: snapshot.displayOrder,
    icon: snapshot.icon,
    id: snapshot.id,
    isActive: snapshot.isActive,
    name: snapshot.name,
  };
}
