export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<TItem> {
  items: TItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function buildPaginationParams(rawPage: unknown, rawPageSize: unknown): PaginationParams {
  const page = Math.max(1, Number(rawPage) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(rawPageSize) || 10))
  return { page, pageSize }
}

export function buildSkipTake(params: PaginationParams): { skip: number; take: number } {
  return {
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  }
}

export function buildPaginatedResult<TItem>(
  items: TItem[],
  total: number,
  params: PaginationParams,
): PaginatedResult<TItem> {
  const totalPages = Math.ceil(total / params.pageSize)
  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPreviousPage: params.page > 1,
  }
}
