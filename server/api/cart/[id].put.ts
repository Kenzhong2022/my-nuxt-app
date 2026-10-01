import type { ApiResponse } from "~~/types/common";

/**
 * 修改购物车商品数量（只校验库存，不调整库存——库存留到结算环节扣）
 * url: /api/cart/:productId
 * method: PUT
 * body: { qty: number }（目标数量，qty <= 0 走删除语义由前端处理，此处拒绝）
 *
 * 设计说明：
 * - 购物车数量不占用库存，改数量只需校验 目标qty <= 商品剩余库存
 * - 单语句原子：UPDATE ... FROM mall_products 带 status=1 AND stock >= qty 条件，
 *   条件不满足（下架/库存不足）则不更新任何行，无中间态
 *
 * return: 200 { qty: 更新后的数量 } / 409 库存不足 / 404 购物车项不存在或商品已下架
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<{ qty: number } | null>> => {
    // auth.global.ts 非白名单接口已校验 token 并注入 userId
    const userId = event.context.user!.userId;
    const productId = Number(getRouterParam(event, "id"));
    const body = await readBody<{ qty?: number }>(event);
    const qty = Number(body?.qty);

    if (!Number.isInteger(productId) || productId <= 0) {
      return { code: 400, message: "无效的商品ID", data: null };
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return { code: 400, message: "无效的购买数量", data: null };
    }

    const { sql } = setupDatabase();

    try {
      const rows = (await sql`
        UPDATE store_cart_items c
        SET qty = ${qty}, added_at = now()
        FROM mall_products p
        WHERE c.user_id = ${userId} AND c.product_id = ${productId}
          AND p.id = c.product_id AND p.status = 1 AND p.stock >= ${qty}
        RETURNING c.qty
      `) as unknown as { qty: number }[];

      if (!rows.length) {
        // 未更新：区分 购物车项不存在 / 商品下架 / 库存不足
        const current = (await sql`
          SELECT p.status, p.stock
          FROM store_cart_items c
          JOIN mall_products p ON p.id = c.product_id
          WHERE c.user_id = ${userId} AND c.product_id = ${productId}
          LIMIT 1
        `) as unknown as { status: number; stock: number }[];

        if (!current.length) {
          return { code: 404, message: "购物车中不存在该商品", data: null };
        }
        if (current[0].status !== 1) {
          return { code: 404, message: "商品不存在或已下架", data: null };
        }
        return { code: 409, message: "库存不足，请调整数量", data: null };
      }

      return { code: 200, message: "success", data: { qty: Number(rows[0].qty) } };
    } catch (error) {
      console.error("修改购物车数量失败:", error);
      return { code: 500, message: "修改购物车数量失败", data: null };
    }
  },
);
