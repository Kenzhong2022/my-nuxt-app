import type { ApiResponse } from "./common";

// ==================== 门店相关类型 ====================

export interface Store {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  codePrefix: string;
  status: 0 | 1; // 1:营业 0:停业
  createdAt?: string;
  updatedAt?: string;
}

// ==================== 商品（菜单）相关类型 ====================

export interface Product {
  id: number;
  storeId: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  sortOrder?: number;
  status: 0 | 1; // 1:上架 0:下架
  createdAt?: string;
  updatedAt?: string;
}

// ==================== 订单状态枚举 ====================

/**
 * 订单状态枚举
 * @description 订单状态流转：pending(待支付) -> paid(待取餐) -> completed(已完成) | expired(已过期)
 *              cancelled(已取消) 可从 pending 状态触发
 */
export type OrderStatus =
  | "pending"
  | "paid"
  | "completed"
  | "cancelled"
  | "expired";

// ==================== 订单商品明细 ====================

/**
 * 订单商品明细（订单项）
 */
export interface OrderItem {
  id?: number;
  orderId?: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  totalPrice: number;
}

/**
 * 订单商品明细请求体（创建订单时使用）
 */
export interface OrderItemRequest {
  productId: number;
  quantity: number;
}

// ==================== 订单创建 ====================

/**
 * 订单创建请求体
 */
export interface CreateOrderRequest {
  storeId: number;
  items: OrderItemRequest[];
}

/**
 * 订单创建响应体
 */
export interface CreateOrderResponse {
  orderId: number;
  orderNo: string;
  totalAmount: number;
  status: OrderStatus;
  qrcodeFull?: string; // 支付完成后才有值
  qrcodeShort?: number;
  qrcodeSign?: string;
  qrcodeExpiredAt?: string;
  paidAt?: string;
  createdAt: string;
}

// ==================== 订单查询/详情 ====================

/**
 * 订单详情响应体
 */
export interface OrderDetail {
  id: number;
  orderNo: string;
  userId: number;
  storeId: number;
  storeName?: string;
  totalAmount: number;
  status: OrderStatus;
  qrcodeShort?: number;
  qrcodeSign?: string;
  qrcodeFull?: string;
  qrcodeExpiredAt?: string;
  paidAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

// ==================== 订单列表查询 ====================

export interface OrderQuery {
  page?: number;
  pageSize?: number;
  userId?: number;
  storeId?: number;
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
}

// ==================== 支付相关 ====================

/**
 * 订单支付请求体
 */
export interface PayOrderRequest {
  orderId: number;
}

/**
 * 订单支付响应体
 */
export interface PayOrderResponse {
  orderId: number;
  orderNo: string;
  status: OrderStatus;
  qrcodeFull: string;
  qrcodeShort: number;
  qrcodeSign: string;
  qrcodeExpiredAt: string;
  paidAt: string;
}

// ==================== 核销相关 ====================

/**
 * 取餐码核销请求体
 */
export interface VerifyQrcodeRequest {
  storeId: number;
  qrcodeShort: number;
  qrcodeSign: string;
}

/**
 * 取餐码核销响应体
 */
export interface VerifyQrcodeResponse {
  orderId: number;
  orderNo: string;
  totalAmount: number;
  status: OrderStatus;
  completedAt: string;
}
