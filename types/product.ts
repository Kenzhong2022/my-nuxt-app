export interface Product {
  id: number;
  title: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating?: Rating;
  sales?: number;
  tags?: string[];
  description?: string;
  category?: string;
  stock?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Rating {
  rate: number;
  count: number;
}

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

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}
