import type { ApiResponse } from "~~/types/common";
import type {
  MallProductDetailRow,
  MallProductRow,
  ProductDetail,
} from "~~/types/product";

/**
 * 获取商品详情（mall_products 主信息 + product_details 详情内容，LEFT JOIN）
 * url: /api/public/products/:id
 * method: GET
 * return: 单个商品详情，不存在时 code = 404
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<ProductDetail | null>> => {
    const id = Number(getRouterParam(event, "id"));

    if (!Number.isInteger(id) || id <= 0) {
      return { code: 400, message: "无效的商品ID", data: null };
    }

    const { sql } = setupDatabase();

    try {
      // 详情行整体打包为 to_jsonb，未命中时为 null，避免 JOIN 列混入商品行
      const rows = (await sql`
        SELECT p.id, p.title, p.name, p.description, p.price,
               p.original_price, p.image, p.category, p.stock, p.sales,
               p.rating_rate, p.rating_count, p.tags,
               p.created_at, p.updated_at,
               to_jsonb(d) AS detail
        FROM mall_products p
        LEFT JOIN product_details d ON d.product_id = p.id
        WHERE p.id = ${id} AND p.status = 1
        LIMIT 1
      `) as unknown as (MallProductRow & {
        detail: MallProductDetailRow | null;
      })[];

      const row = rows[0];
      if (!row) {
        return { code: 404, message: "商品不存在", data: null };
      }

      const { detail, ...productRow } = row;

      return {
        code: 200,
        message: "success",
        data: toMallProductDetail(productRow, detail),
      };
    } catch (error) {
      console.error("查询商品详情失败:", error);
      return { code: 500, message: "获取商品详情失败", data: null };
    }
  },
);
