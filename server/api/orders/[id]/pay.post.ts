import type { ApiResponse } from "~~/types/common";

/**
 * 支付订单（模拟支付：默认支付成功，仅扭转状态）
 * url: /api/orders/:id/pay
 * method: POST
 *
 * 状态机：pending → paid（条件更新防并发重复支付；已支付幂等返回成功；
 * cancelled/expired 等终态不可支付）。真实支付接入时替换本接口为
 * 支付网关回调验签 + 同样的条件更新即可。
 *
 * return: 200 / 404 订单不存在 / 409 当前状态不可支付
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
      // 条件更新：仅 pending 可支付；行锁保证并发下只有一笔成功
      const paid = (await sql`
        UPDATE store_orders
        SET status = 'paid', paid_at = now(), updated_at = now()
        WHERE id = ${orderId} AND user_id = ${userId} AND status = 'pending'
        RETURNING id
      `) as unknown as { id: string }[];

      if (paid.length) {
        return { code: 200, message: "success", data: null };
      }

      // 未命中：区分 不存在 / 已支付（幂等）/ 其他状态
      const rows = (await sql`
        SELECT status FROM store_orders
        WHERE id = ${orderId} AND user_id = ${userId}
        LIMIT 1
      `) as unknown as { status: string }[];

      const order = rows[0];
      if (!order) {
        return { code: 404, message: "订单不存在", data: null };
      }
      if (order.status === "paid") {
        // 幂等：已支付视为成功
        return { code: 200, message: "success", data: null };
      }
      return { code: 409, message: "该订单当前状态不可支付", data: null };
    } catch (error) {
      console.error("支付订单失败:", error);
      return { code: 500, message: "支付订单失败", data: null };
    }
  },
);
