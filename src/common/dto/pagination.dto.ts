// Valores-padrão conservadores: página pequena evita queries pesadas acidentais
export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

export class PaginationDto {
  page: number = 1;
  limit: number = PAGINATION_DEFAULT_LIMIT;

  get skip(): number {
    return (this.page - 1) * this.take;
  }

  get take(): number {
    return Math.min(this.limit, PAGINATION_MAX_LIMIT);
  }
}
