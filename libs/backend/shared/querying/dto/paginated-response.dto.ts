export class PaginatedResponseDto<T> {
  declare items: T[];

  declare totalCount: number;

  declare page: number;

  declare pageSize: number;

  declare totalPages: number;
}

export function createPaginatedResponse<T>(
  items: T[],
  totalCount: number,
  page: number,
  pageSize: number,
): PaginatedResponseDto<T> {
  return {
    items,
    page,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
