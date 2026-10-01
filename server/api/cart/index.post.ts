import type { ApiResponse } from "~~/types/common";

/**
 * 加入购物车（只校验库存，不扣减——库存留到结算环节扣）
 * url: /api/cart
 * method: POST
 * body: { productId: number, qty?: number }
 *
 * 设计说明：
 * - 购物车是「购买意向」，不动 mall_products.stock；
 *   仅校验「购物车总数量 + 本次新增 <= 剩余库存」，防止加进超出库存的数量
 * - 幂等合并：UNIQUE(user_id, product_id) + ON CONFLICT DO UPDATE，重复加购 qty 累加
 * - 单条数据修改 CTE：校验与写入在一条语句内完成，PG 保证语句级原子
 *
 * return: 200 { qty: 该商品购物车内总数量 }
 *         409 库存不足 / 404 商品不存在或已下架
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<{ qty: number } | null>> => {
    // auth.global.ts 非白名单接口已校验 token 并注入 userId
    const userId = event.context.user!.userId;
    const body = await readBody<{ productId?: number; qty?: number }>(event);

    const productId = Number(body?.productId);
    const qty = Number(body?.qty ?? 1);

    if (!Number.isInteger(productId) || productId <= 0) {
      return { code: 400, message: "无效的商品ID", data: null };
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return { code: 400, message: "无效的加购数量", data: null };
    }

    const { sql } = setupDatabase();

    try {
      // prod 只放行在售商品；新增分支校验 qty <= stock，
      // 冲突累加分支校验 已有qty + qty <= stock，条件不满足则不产出行
      const rows = (await sql`
        WITH prod AS (
          SELECT id, stock FROM mall_products WHERE id = ${productId} AND status = 1
        ), item AS (
          INSERT INTO store_cart_items (user_id, product_id, qty)
          SELECT ${userId}, id, ${qty} FROM prod WHERE ${qty} <= stock
          ON CONFLICT (user_id, product_id)
          DO UPDATE SET qty = store_cart_items.qty + ${qty}, added_at = now()
          WHERE store_cart_items.qty + ${qty} <= (SELECT stock FROM prod)
          RETURNING qty
        )
        SELECT qty FROM item
      `) as unknown as { qty: number }[];

      if (rows.length === 0) {
        // CTE 空：区分商品不存在/已下架（404）与库存不足（409）
        const product = (await sql`
          SELECT status FROM mall_products WHERE id = ${productId} LIMIT 1
        `) as unknown as { status: number }[];

        if (!product.length || product[0].status !== 1) {
          return { code: 404, message: "商品不存在或已下架", data: null };
        }
        return { code: 409, message: "库存不足，请调整数量", data: null };
      }

      return { code: 200, message: "success", data: { qty: Number(rows[0].qty) } };
    } catch (error) {
      console.error("加入购物车失败:", error);
      return { code: 500, message: "加入购物车失败", data: null };
    }
  },
);
