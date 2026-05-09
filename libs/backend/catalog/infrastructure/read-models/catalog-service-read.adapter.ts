import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import {
  CATALOG_SERVICE_DYNAMIC_QUERY_CONFIG,
  type IServiceReadPort,
  type ServiceDto,
  toServiceDto,
} from '@det/backend/catalog/application';
import {
  DynamicQueryAstParser,
  MikroOrmDynamicQueryAdapter,
  MikroOrmDynamicQueryCompiler,
  createPaginatedResponse,
  type DynamicQueryRequest,
  type PaginatedResponseDto,
} from '@det/backend/shared/querying';

import { mapCatalogServiceToDomain } from '../mappers/catalog-service.mapper';
import { CatalogServiceSchema } from '../persistence/catalog-service.schema';

@Injectable()
export class CatalogServiceReadAdapter implements IServiceReadPort {
  private readonly compiler = new MikroOrmDynamicQueryCompiler<CatalogServiceSchema>(
    new DynamicQueryAstParser(),
    new MikroOrmDynamicQueryAdapter<CatalogServiceSchema>(),
  );

  constructor(private readonly em: EntityManager) {}

  async list(query: DynamicQueryRequest): Promise<PaginatedResponseDto<ServiceDto>> {
    const compiled = this.compiler.compile(query, CATALOG_SERVICE_DYNAMIC_QUERY_CONFIG);
    const [schemas, totalCount] = await this.em.findAndCount(CatalogServiceSchema, compiled.where, {
      ...compiled.options,
      populate: ['pricingEntries', 'materialNorms'],
    });
    const items = schemas.map((schema) =>
      toServiceDto(mapCatalogServiceToDomain(schema).toSnapshot()),
    );

    return createPaginatedResponse(items, totalCount, compiled.page, compiled.pageSize);
  }
}
