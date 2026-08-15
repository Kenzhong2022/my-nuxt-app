import type { ApiResponse, Pagination } from "~~/types/common";
import type { MallProductRow, Product } from "~~/types/product";

export default defineEventHandler(
  async (event): Promise<ApiResponse<Product[]>> => {
    const query = getQuery(event);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
    const search = String(query.search || "").trim();
    const category = String(query.category || "").trim();

    const { sql } = setupDatabase();

    try {
      const like = `%${search}%`;
      const totalRows = (await sql`
        SELECT COUNT(*)::int AS total
        FROM mall_products
        WHERE status = 1
          AND (${search} = '' OR name ILIKE ${like} OR title ILIKE ${like})
          AND (${category} = '' OR category = ${category})
      `) as { total: number }[];
      const total = totalRows[0] ? totalRows[0].total : 0;

      const rows = (await sql`
        SELECT id, title, name, description, price, original_price, image,
               category, stock, sales, rating_rate, rating_count, tags,
               created_at, updated_at
        FROM mall_products
        WHERE status = 1
          AND (${search} = '' OR name ILIKE ${like} OR title ILIKE ${like})
          AND (${category} = '' OR category = ${category})
        ORDER BY id
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      `) as unknown as MallProductRow[];

      const pagination: Pagination = {
        current: page,
        pageSize: pageSize,
        total: total,
      };

      return {
        code: 200,
        message: "success",
        data: rows.map((row) => toMallProduct(row)),
        pagination,
      };
    } catch (error) {
      console.error("查询商品列表失败:", error);
      return {
        code: 500,
        message: "获取商品列表失败",
        data: [],
        pagination: { current: page, pageSize: pageSize, total: 0 },
      };
    }
  },
);
