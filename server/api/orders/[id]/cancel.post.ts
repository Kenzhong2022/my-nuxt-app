import type { ApiResponse } from "~~/types/common";

/**
 * 取消订单（仅待支付订单可取消，取消即归还库存）
 * url: /api/orders/:id/cancel
 * method: POST
 *
 * 单语句原子：c 条件更新（status='pending' 才置 cancelled，行锁保证并发下
 * 同一订单只被取消一次）→ r 按订单明细归还库存/回滚销量。
 * 未命中（订单不存在/已支付/已取消）时 c 返回 0 行，r 自然无事可做。
 *
 * return: 200 / 404 订单不存在 / 409 当前状态不可取消
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<null>> => {
    // auth.global.ts 非白名单接口已校验 token 并注入 userId
    const userId = event.context.user!.userId;
    const orderId = Number(getRouterParam(event, "id"));

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return { code: 400, message: "无效的订单ID", data: null };
    }

    const { sql } = setupDatabase();

    try {
      const rows = (await sql`
        WITH c AS (
          UPDATE store_orders
          SET status = 'cancelled', cancelled_at = now(), updated_at = now()
          WHERE id = ${orderId} AND user_id = ${userId} AND status = 'pending'
          RETURNING id, status
        ),
        r AS (
          UPDATE mall_products m
          SET stock = m.stock + oi.qty, sales = m.sales - oi.qty, updated_at = now()
          FROM store_order_items oi
          JOIN c ON c.id = oi.order_id
          WHERE m.id = oi.product_id
          RETURNING 1
        )
        SELECT
          (SELECT count(*) FROM c) AS cancelled,
          EXISTS (
            SELECT 1 FROM store_orders
            WHERE id = ${orderId} AND user_id = ${userId}
          ) AS owned
      `) as unknown as { cancelled: string; owned: boolean }[];

      const row = rows[0];
      if (!row) {
        return { code: 500, message: "取消订单失败", data: null };
      }
      if (Number(row.cancelled) > 0) {
        return { code: 200, message: "success", data: null };
      }
      if (!row.owned) {
        return { code: 404, message: "订单不存在", data: null };
      }
      return { code: 409, message: "该订单当前状态不可取消", data: null };
    } catch (error) {
      console.error("取消订单失败:", error);
      return { code: 500, message: "取消订单失败", data: null };
    }
  },
);
