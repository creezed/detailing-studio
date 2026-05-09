import type { DynamicQueryOperator, DynamicQueryValueType } from '@det/backend-shared-querying';

export interface QueryFilterCapabilityDto {
  readonly field: string;
  readonly label: string;
  readonly operators: readonly DynamicQueryOperator[];
  readonly type: DynamicQueryValueType;
}

export interface QuerySortCapabilityDto {
  readonly field: string;
  readonly label: string;
}

export interface QueryCapabilitiesDto {
  readonly defaultPageSize: number;
  readonly defaultSorts: string;
  readonly filters: readonly QueryFilterCapabilityDto[];
  readonly maxPageSize: number;
  readonly sorts: readonly QuerySortCapabilityDto[];
}
