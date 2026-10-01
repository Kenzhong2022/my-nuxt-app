import type { ApiResponse } from "~~/types/common";
import type { CartItem, MallProductRow } from "~~/types/product";
import { toMallProduct } from "~~/server/utils/mallProduct";

/**
 * 拉取当前用户购物车
 * url: /api/cart
 * method: GET
 * return: items 为 CartItem[]（JOIN mall_products 取商品快照，按加购时间倒序）
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<{ items: CartItem[] } | null>> => {
    // auth.global.ts 非白名单接口已校验 token 并注入 userId
    const userId = event.context.user!.userId;

    const { sql } = setupDatabase();

    try {
      const rows = (await sql`
        SELECT p.id, p.title, p.name, p.description, p.price,
               p.original_price, p.image, p.category, p.stock, p.sales,
               p.rating_rate, p.rating_count, p.tags,
               p.created_at, p.updated_at,
               c.qty, c.added_at
        FROM store_cart_items c
        JOIN mall_products p ON p.id = c.product_id AND p.status = 1
        WHERE c.user_id = ${userId}
        ORDER BY c.added_at DESC
      `) as unknown as (MallProductRow & { qty: number; added_at: string })[];

      const items = rows.map((row) => ({
        ...toMallProduct(row),
        qty: Number(row.qty),
        addedAt: row.added_at,
      }));

      return { code: 200, message: "success", data: { items } };
    } catch (error) {
      console.error("获取购物车失败:", error);
      return { code: 500, message: "获取购物车失败", data: null };
    }
  },
);
