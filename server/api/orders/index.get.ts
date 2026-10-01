import type { ApiResponse } from "~~/types/common";
import type {
  OrderListResult,
  OrderStatus,
  StoreOrder,
  OrderAddressSnapshot,
  StoreOrderItem,
} from "~~/types/order";

/** 合法状态筛选值（非法值一律视为全部） */
const STATUS_SET = new Set<OrderStatus>([
  "pending",
  "paid",
  "shipped",
  "completed",
  "cancelled",
  "expired",
]);

/**
 * 我的订单列表（含惰性超时释放）
 * url: /api/orders?status=pending&page=1&pageSize=10
 * method: GET
 *
 * 设计说明：
 * - 惰性释放：每次拉列表先执行一条「过期清理」语句——把 expired_at 已过的 pending
 *   订单置 expired 并按订单明细归还库存/回滚销量。单语句原子（UPDATE RETURNING 的
 *   行锁保证并发下同一订单只被一个请求清理一次，库存不会重复归还）
 * - 清理与列表查询拆成两条顺序语句：同一语句内后续 CTE 读不到前序 UPDATE 的新值
 *   （快照语义），必须分开执行才能查到释放后的状态
 * - 明细经 json_agg 聚合成数组随主查询一次带回，避免 N+1
 * - 走 (status, expired_at) 部分索引，仅 pending 行参与过期扫描
 *
 * return: 200 OrderListResult / 400 分页参数无效
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<OrderListResult | null>> => {
    // auth.global.ts 非白名单接口已校验 token 并注入 userId
    const userId = event.context.user!.userId;
    const query = getQuery(event);

    const statusParam = String(query.status ?? "");
    const status = STATUS_SET.has(statusParam as OrderStatus)
      ? statusParam
      : null; // 非法/空 = 全部
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const { sql } = setupDatabase();

    try {
      // ---- 1. 惰性超时释放（单语句原子：置 expired + 归还库存/回滚销量）----
      await sql`
        WITH e AS (
          UPDATE store_orders
          SET status = 'expired', cancelled_at = now(), updated_at = now()
          WHERE status = 'pending' AND expired_at < now()
          RETURNING id
        ),
        r AS (
          UPDATE mall_products m
          SET stock = m.stock + oi.qty, sales = m.sales - oi.qty, updated_at = now()
          FROM store_order_items oi
          JOIN e ON e.id = oi.order_id
          WHERE m.id = oi.product_id
          RETURNING 1
        )
        SELECT count(*) AS released FROM e
      `;

      // ---- 2. 分页查订单 + json_agg 聚合明细 ----
      const rows = (await sql`
        SELECT o.id, o.order_no, o.total_amount, o.status, o.remark,
               o.created_at, o.expired_at, o.address_snapshot,
               COALESCE(i.items, '[]'::json) AS items,
               COUNT(*) OVER()::int AS total
        FROM store_orders o
        LEFT JOIN LATERAL (
          SELECT json_agg(json_build_object(
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productImage', oi.product_image,
            'unitPrice', oi.unit_price,
            'qty', oi.qty
          ) ORDER BY oi.id) AS items
          FROM store_order_items oi
          WHERE oi.order_id = o.id
        ) i ON TRUE
        WHERE o.user_id = ${userId}
          AND (${status}::text IS NULL OR o.status = ${status})
        ORDER BY o.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `) as unknown as {
        id: string;
        order_no: string;
        total_amount: string;
        status: OrderStatus;
        remark: string | null;
        created_at: string;
        expired_at: string | null;
        address_snapshot: OrderAddressSnapshot;
        items: StoreOrderItem[];
        total: number;
      }[];

      const items: StoreOrder[] = rows.map((r) => ({
        id: Number(r.id),
        orderNo: r.order_no,
        totalAmount: Number(r.total_amount),
        status: r.status,
        remark: r.remark,
        createdAt: r.created_at,
        expiredAt: r.expired_at,
        address: r.address_snapshot,
        items: (r.items ?? []).map((it) => ({
          ...it,
          productId: Number(it.productId),
          unitPrice: Number(it.unitPrice),
        })),
      }));

      return {
        code: 200,
        message: "success",
        data: { items, total: rows[0]?.total ?? 0, page, pageSize },
      };
    } catch (error) {
      console.error("获取订单列表失败:", error);
      return { code: 500, message: "获取订单列表失败", data: null };
    }
  },
);
