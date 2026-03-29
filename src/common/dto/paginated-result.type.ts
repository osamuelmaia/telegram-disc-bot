export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  /** Total de páginas disponíveis */
  pages: number;
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}
