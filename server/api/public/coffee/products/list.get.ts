/**
 * 获取商品列表
 * url: /api/coffee/products/list
 * method: GET
 * params:
 *   - storeId: 店铺ID，默认值为1
 * return: 商品列表
 */
import type { ApiResponse } from "~~/types/common";
import type { Product } from "~~/types/order";

export default defineEventHandler(
  async (event): Promise<ApiResponse<Product[]>> => {
    const { sql } = setupDatabase();
    const query = getQuery(event);
    const storeId = Number(query.storeId) || 1;

    try {
      // 去掉泛型，用类型注解声明返回类型
      const products: Product[] = (await sql`
      SELECT 
        id,
        store_id as "storeId",
        name,
        description,
        price,
        image_url as "imageUrl",
        category,
        sort_order as "sortOrder",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM products 
      WHERE status = 1 AND store_id = ${storeId}
      ORDER BY sort_order ASC, id ASC
    `) as Product[];

      return {
        code: 200,
        message: "success",
        data: products,
      };
    } catch (error) {
      console.error("获取商品列表失败:", error);
      return {
        code: 500,
        message: "获取商品列表失败",
        data: [],
      };
    }
  },
);
