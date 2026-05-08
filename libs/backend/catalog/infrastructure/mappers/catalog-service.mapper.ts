import { PricingType, Service } from '@det/backend/catalog/domain';
import type {
  MaterialNormSnapshot,
  ServicePricingSnapshot,
  ServiceSnapshot,
} from '@det/backend/catalog/domain';

import { CatalogMaterialNormSchema } from '../persistence/catalog-material-norm.schema';
import { CatalogServiceCategorySchema } from '../persistence/catalog-service-category.schema';
import { CatalogServicePricingSchema } from '../persistence/catalog-service-pricing.schema';
import { CatalogServiceSchema } from '../persistence/catalog-service.schema';

import type { EntityManager } from '@mikro-orm/postgresql';

export function mapCatalogServiceToDomain(schema: CatalogServiceSchema): Service {
  const pricing = buildPricingSnapshot(schema);
  const materialNorms = schema.materialNorms.getItems().map((n) => buildMaterialNormSnapshot(n));

  const snapshot: ServiceSnapshot = {
    categoryId: schema.categoryId,
    description: schema.descriptionMd,
    displayOrder: schema.displayOrder,
    durationMinutes: schema.durationMinutes,
    id: schema.id,
    isActive: schema.isActive,
    materialNorms,
    name: schema.name,
    pricing,
    version: schema.version,
  };

  return Service.restore(snapshot);
}

export function mapCatalogServiceToPersistence(
  domain: Service,
  existing: CatalogServiceSchema | null,
  em: EntityManager,
): CatalogServiceSchema {
  const schema = existing ?? new CatalogServiceSchema();
  const snapshot = domain.toSnapshot();

  schema.id = snapshot.id;
  schema.category = em.getReference(CatalogServiceCategorySchema, snapshot.categoryId);
  schema.name = snapshot.name;
  schema.descriptionMd = snapshot.description;
  schema.durationMinutes = snapshot.durationMinutes;
  schema.pricingType = snapshot.pricing.type;
  schema.basePriceCents = snapshot.pricing.fixedPriceCents ?? null;
  schema.isActive = snapshot.isActive;
  schema.displayOrder = snapshot.displayOrder;
  if (!existing) {
    schema.createdAt = new Date();
  }
  schema.updatedAt = new Date();

  syncPricingEntries(schema, snapshot.pricing);
  syncMaterialNorms(schema, snapshot.materialNorms);

  return schema;
}

function buildPricingSnapshot(schema: CatalogServiceSchema): ServicePricingSnapshot {
  if (schema.pricingType === (PricingType.FIXED as string)) {
    return {
      fixedPriceCents: schema.basePriceCents ?? '0',
      type: PricingType.FIXED,
    };
  }

  const bodyTypePrices = schema.pricingEntries.getItems().map((p) => ({
    bodyType: p.bodyType,
    priceCents: p.priceCents,
  }));

  return {
    bodyTypePrices,
    type: PricingType.BY_BODY_TYPE,
  };
}

function buildMaterialNormSnapshot(n: CatalogMaterialNormSchema): MaterialNormSnapshot {
  const snapshot: {
    skuId: string;
    amount: number;
    bodyTypeCoefficients?: Array<{ bodyType: string; coefficient: number }>;
  } = {
    amount: n.amount,
    skuId: n.skuId,
  };

  if (n.bodyTypeCoefficients) {
    snapshot.bodyTypeCoefficients = Object.entries(n.bodyTypeCoefficients).map(([bt, coeff]) => ({
      bodyType: bt,
      coefficient: coeff,
    }));
  }

  return snapshot;
}

function syncPricingEntries(schema: CatalogServiceSchema, pricing: ServicePricingSnapshot): void {
  schema.pricingEntries.removeAll();

  if (pricing.type === PricingType.BY_BODY_TYPE && pricing.bodyTypePrices) {
    for (const entry of pricing.bodyTypePrices) {
      const p = new CatalogServicePricingSchema();
      p.service = schema;
      p.bodyType = entry.bodyType;
      p.priceCents = entry.priceCents;
      schema.pricingEntries.add(p);
    }
  }
}

function syncMaterialNorms(
  schema: CatalogServiceSchema,
  norms: readonly MaterialNormSnapshot[],
): void {
  schema.materialNorms.removeAll();

  for (const norm of norms) {
    const n = new CatalogMaterialNormSchema();
    n.id = crypto.randomUUID();
    n.service = schema;
    n.skuId = norm.skuId;
    n.amount = norm.amount;
    n.unit = 'PCS';
    n.bodyTypeCoefficients = norm.bodyTypeCoefficients
      ? Object.fromEntries(norm.bodyTypeCoefficients.map((c) => [c.bodyType, c.coefficient]))
      : null;
    schema.materialNorms.add(n);
  }
}
