import type { DynamicQueryOperator, DynamicQueryValueType } from '../core/dynamic-query.types';

export interface QueryFilterCapabilityDto {
  readonly field: string;
  readonly labelKey: string;
  readonly operators: readonly DynamicQueryOperator[];
  readonly type: DynamicQueryValueType;
}

export interface QuerySortCapabilityDto {
  readonly field: string;
  readonly labelKey: string;
}

export interface QueryCapabilitiesDto {
  readonly defaultPageSize: number;
  readonly defaultSorts: string;
  readonly filters: readonly QueryFilterCapabilityDto[];
  readonly maxPageSize: number;
  readonly sorts: readonly QuerySortCapabilityDto[];
}
