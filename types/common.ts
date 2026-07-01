export interface Pagination {
  current: number;
  pageSize: number;
  total: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  pagination?: Pagination;
}
