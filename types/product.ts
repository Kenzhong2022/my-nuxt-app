import type { ApiResponse } from "./common";

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

/**
 * 商品 API 请求参数
 */
export interface ProductListApiRequest {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}

/**
 * 商品 API 响应参数
 */
export type ProductListApiResponse = ApiResponse<Product[]>;

/**
 * mall_products 表对应的数据库模型（PostgreSQL 数值/数组类型经 JSON 序列化后的形态）
 */
export interface MallProductRow {
  id: string;
  title: string;
  name: string;
  description: string;
  price: string;
  original_price: string | null;
  image: string;
  category: string;
  stock: number;
  sales: number;
  rating_rate: string;
  rating_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

/**
 * product_details 表对应的数据库模型（JSONB 字段为普通对象）
 */
export interface MallProductDetailRow {
  id: string;
  product_id: string;
  gallery: string[];
  detail_content: string;
  specs: Record<string, string>;
  highlights: string[];
  packaging: string[];
  services: string[];
  view_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 商品详情（前端形态）：基础信息 + 详情内容
 */
export interface ProductDetail extends Product {
  gallery: string[];
  detailContent: string;
  specs: Record<string, string>;
  highlights: string[];
  packaging: string[];
  services: string[];
  viewCount: number;
}
