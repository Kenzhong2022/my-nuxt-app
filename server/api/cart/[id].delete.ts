import type { ApiResponse } from "~~/types/common";

/**
 * 删除购物车商品
 * url: /api/cart/:productId
 * method: DELETE
 *
 * 购物车不占用库存（加购/改数量均不扣减），删除仅移除 store_cart_items 记录，无需归还
 *
 * return: 200 { qty: 删除的数量 } / 404 购物车项不存在
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<{ qty: number } | null>> => {
    // auth.global.ts 非白名单接口已校验 token 并注入 userId
    const userId = event.context.user!.userId;
    const productId = Number(getRouterParam(event, "id"));

    if (!Number.isInteger(productId) || productId <= 0) {
      return { code: 400, message: "无效的商品ID", data: null };
    }

    const { sql } = setupDatabase();

    try {
      const rows = (await sql`
        DELETE FROM store_cart_items
        WHERE user_id = ${userId} AND product_id = ${productId}
        RETURNING qty
      `) as unknown as { qty: number }[];

      if (!rows.length || !rows[0]) {
        return { code: 404, message: "购物车中不存在该商品", data: null };
      }

      return { code: 200, message: "success", data: { qty: Number(rows[0].qty) } };
    } catch (error) {
      console.error("删除购物车商品失败:", error);
      return { code: 500, message: "删除购物车商品失败", data: null };
    }
  },
);
