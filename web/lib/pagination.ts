/**
 * Generic paginated list result type
 */
export type PaginatedList<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
};
