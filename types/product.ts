import type { ApiResponse } from "./common";
import type { StoreAddress } from "./address";

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

/**
 * 购物车单项（前端形态）：商品快照 + 数量 + 加购时间
 * 服务端 GET /api/cart 返回的 items 元素即此结构
 */
export interface CartItem extends Product {
  qty: number;
  addedAt: string;
}

/**
 * 结算预览中被标记为库存不足的商品
 * stock = 商品当前剩余库存，qty = 购物车中的购买数量
 */
export interface CheckoutInsufficient {
  productId: number;
  name: string;
  stock: number;
  qty: number;
}

/**
 * 结算预览（前端形态）：GET /api/checkout 返回的 data 结构
 * totalAmount 为服务端重算的勾选商品总价（不信任前端金额）
 */
export interface CheckoutPreview {
  items: CartItem[];
  totalAmount: number;
  insufficient: CheckoutInsufficient[];
  addresses: StoreAddress[];
}
