/**
 * 提交订单请求载荷
 * addressId：收货地址 id（服务端校验归属后做 JSONB 快照）
 * productIds：勾选结算的商品 id 列表（与购物车行取交集下单）
 * remark：订单备注（可空，≤200 字）
 */
export interface CreateOrderPayload {
  addressId: number;
  productIds: number[];
  remark?: string;
}

/**
 * 下单成功返回结果
 * orderNo：展示用订单号；totalAmount：服务端重算的订单总额
 */
export interface OrderCreateResult {
  orderId: number;
  orderNo: string;
  totalAmount: number;
}

/** 订单状态（与 store_orders.status CHECK 约束一致） */
export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled"
  | "expired";

/** 订单收货地址快照（下单时固化，后续删改地址不影响历史订单） */
export interface OrderAddressSnapshot {
  receiver: string;
  phone: string;
  region: string;
  detail: string;
}

/** 订单明细行（商品快照冗余） */
export interface StoreOrderItem {
  productId: number;
  productName: string;
  productImage: string;
  unitPrice: number;
  qty: number;
}

/** 订单（前端形态）：GET /api/orders 返回的 items 元素 */
export interface StoreOrder {
  id: number;
  orderNo: string;
  totalAmount: number;
  status: OrderStatus;
  remark: string | null;
  createdAt: string;
  /** 待支付截止时间（仅 pending 订单有意义） */
  expiredAt: string | null;
  address: OrderAddressSnapshot;
  items: StoreOrderItem[];
}

/** 订单列表分页结果 */
export interface OrderListResult {
  items: StoreOrder[];
  total: number;
  page: number;
  pageSize: number;
}
