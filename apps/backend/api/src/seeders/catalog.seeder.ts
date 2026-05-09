import { Seeder } from '@mikro-orm/seeder';

import {
  CatalogServiceCategorySchema,
  CatalogServicePricingSchema,
  CatalogServiceSchema,
} from '@det/backend-catalog-infrastructure';

import { CATEGORIES, SERVICES } from './data/catalog.data';
import { seederLog } from './helpers/seeder-logger';

import type { EntityManager } from '@mikro-orm/core';

const LABEL = 'Catalog Seeder';

export class CatalogSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const categoryExists = await em.count(CatalogServiceCategorySchema);

    if (categoryExists > 0) {
      seederLog(LABEL, 'Categories already exist — skipping');

      return;
    }

    seederLog(LABEL, 'Seeding service categories...');

    for (const cat of CATEGORIES) {
      em.create(CatalogServiceCategorySchema, {
        displayOrder: cat.displayOrder,
        icon: cat.icon,
        id: cat.id,
        isActive: true,
        name: cat.name,
      });
    }

    await em.flush();

    seederLog(LABEL, `Inserted ${String(CATEGORIES.length)} categories`);
    seederLog(LABEL, 'Seeding services with pricing...');

    const now = new Date();

    for (const [index, svc] of SERVICES.entries()) {
      const service = em.create(CatalogServiceSchema, {
        basePriceCents: svc.basePriceCents,
        category: em.getReference(CatalogServiceCategorySchema, svc.categoryId),
        categoryId: svc.categoryId,
        createdAt: now,
        descriptionMd: svc.descriptionMd,
        displayOrder: index + 1,
        durationMinutes: svc.durationMinutes,
        id: svc.id,
        isActive: true,
        name: svc.name,
        pricingType: svc.pricingType,
        updatedAt: now,
        version: 1,
      });

      for (const entry of svc.pricing) {
        em.create(CatalogServicePricingSchema, {
          bodyType: entry.bodyType,
          priceCents: entry.priceCents,
          service,
        });
      }
    }

    await em.flush();

    seederLog(LABEL, `Inserted ${String(SERVICES.length)} services with pricing entries`);
  }
}
