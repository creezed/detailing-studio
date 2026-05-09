import type {
  DynamicQueryOperator,
  DynamicQueryParserConfig,
  DynamicQueryValueType,
} from '@det/backend-shared-querying';

import type { QueryCapabilitiesDto } from '../dto/query-capabilities.dto';

interface QueryFieldCapability {
  readonly field: string;
  readonly filterable: boolean;
  readonly label: string;
  readonly operators: readonly DynamicQueryOperator[];
  readonly sortable: boolean;
  readonly type: DynamicQueryValueType;
}

const STRING_EQUALS_OPERATORS: readonly DynamicQueryOperator[] = ['==', '!=', '*=', '!*='];
const STRING_SEARCH_OPERATORS: readonly DynamicQueryOperator[] = [
  '==',
  '!=',
  '@=',
  '_=',
  '^=',
  '!@=',
];
const NUMBER_OPERATORS: readonly DynamicQueryOperator[] = ['==', '!=', '>', '<', '>=', '<='];
const BOOLEAN_OPERATORS: readonly DynamicQueryOperator[] = ['==', '!='];
const DATE_OPERATORS: readonly DynamicQueryOperator[] = ['==', '!=', '>', '<', '>=', '<='];

export const CATALOG_SERVICE_DEFAULT_PAGE_SIZE = 25;
export const CATALOG_SERVICE_DEFAULT_SORTS = 'displayOrder,name';
export const CATALOG_SERVICE_MAX_PAGE_SIZE = 100;

export const CATALOG_SERVICE_QUERY_FIELDS: readonly QueryFieldCapability[] = [
  {
    field: 'id',
    filterable: true,
    label: 'ID услуги',
    operators: STRING_EQUALS_OPERATORS,
    sortable: false,
    type: 'string',
  },
  {
    field: 'name',
    filterable: true,
    label: 'Название',
    operators: STRING_SEARCH_OPERATORS,
    sortable: true,
    type: 'string',
  },
  {
    field: 'categoryId',
    filterable: true,
    label: 'Категория',
    operators: STRING_EQUALS_OPERATORS,
    sortable: true,
    type: 'string',
  },
  {
    field: 'isActive',
    filterable: true,
    label: 'Активность',
    operators: BOOLEAN_OPERATORS,
    sortable: true,
    type: 'boolean',
  },
  {
    field: 'durationMinutes',
    filterable: true,
    label: 'Длительность, мин',
    operators: NUMBER_OPERATORS,
    sortable: true,
    type: 'number',
  },
  {
    field: 'pricingType',
    filterable: true,
    label: 'Тип цены',
    operators: STRING_EQUALS_OPERATORS,
    sortable: true,
    type: 'string',
  },
  {
    field: 'displayOrder',
    filterable: true,
    label: 'Порядок отображения',
    operators: NUMBER_OPERATORS,
    sortable: true,
    type: 'number',
  },
  {
    field: 'createdAt',
    filterable: true,
    label: 'Дата создания',
    operators: DATE_OPERATORS,
    sortable: true,
    type: 'date',
  },
  {
    field: 'updatedAt',
    filterable: true,
    label: 'Дата обновления',
    operators: DATE_OPERATORS,
    sortable: true,
    type: 'date',
  },
];

export const CATALOG_SERVICE_DYNAMIC_QUERY_CONFIG: DynamicQueryParserConfig = {
  allowedFields: Object.fromEntries(
    CATALOG_SERVICE_QUERY_FIELDS.map((field) => [
      field.field,
      {
        filterable: field.filterable,
        operators: field.operators,
        sortable: field.sortable,
        type: field.type,
      },
    ]),
  ),
  defaultPageSize: CATALOG_SERVICE_DEFAULT_PAGE_SIZE,
  defaultSorts: CATALOG_SERVICE_DEFAULT_SORTS,
  maxConditions: 20,
  maxFilterLength: 2000,
  maxPageSize: CATALOG_SERVICE_MAX_PAGE_SIZE,
  maxSorts: 5,
};

export const CATALOG_SERVICE_QUERY_CAPABILITIES: QueryCapabilitiesDto = {
  defaultPageSize: CATALOG_SERVICE_DEFAULT_PAGE_SIZE,
  defaultSorts: CATALOG_SERVICE_DEFAULT_SORTS,
  filters: CATALOG_SERVICE_QUERY_FIELDS.filter((field) => field.filterable).map((field) => ({
    field: field.field,
    label: field.label,
    operators: field.operators,
    type: field.type,
  })),
  maxPageSize: CATALOG_SERVICE_MAX_PAGE_SIZE,
  sorts: CATALOG_SERVICE_QUERY_FIELDS.filter((field) => field.sortable).map((field) => ({
    field: field.field,
    label: field.label,
  })),
};
