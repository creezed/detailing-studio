import type { DynamicQueryOperator } from './dynamic-query.types';

export const STRING_EQUALITY_OPERATORS: readonly DynamicQueryOperator[] = ['==', '!=', '*=', '!*='];

export const STRING_SEARCH_OPERATORS: readonly DynamicQueryOperator[] = [
  '==',
  '!=',
  '@=',
  '_=',
  '^=',
  '!@=',
];

export const NUMBER_OPERATORS: readonly DynamicQueryOperator[] = ['==', '!=', '>', '<', '>=', '<='];

export const BOOLEAN_OPERATORS: readonly DynamicQueryOperator[] = ['==', '!='];

export const DATE_OPERATORS: readonly DynamicQueryOperator[] = ['==', '!=', '>', '<', '>=', '<='];
