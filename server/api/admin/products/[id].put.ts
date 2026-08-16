import type { ApiResponse } from "~~/types/common";
import type { MallProductRow, Product } from "~~/types/product";

/**
 * 更新商品基础信息（名称、标题、描述、价格、原价、分类、库存、标签）
 * url: /api/admin/products/:id
 * method: PUT（受 auth.global.ts 保护，需 Bearer Token）
 * body.imageUrl: 可选，前端直传 Cloudinary 后的 secure_url，
 *               传入时更新 image 列；不传则不改动图片
 * return: 更新后的商品数据
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<Product | null>> => {
    const id = Number(getRouterParam(event, "id"));
    if (!Number.isInteger(id) || id <= 0) {
      return { code: 400, message: "无效的商品ID", data: null };
    }

    const body = await readBody<Record<string, unknown>>(event);
    const name = String(body.name ?? "").trim();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const category = String(body.category ?? "").trim();
    const price = Number(body.price);
    const originalPrice =
      body.originalPrice === null || body.originalPrice === undefined
        ? null
        : Number(body.originalPrice);
    const stock = Number(body.stock);
    const tags = Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    // 参数校验
    if (!name || !title) {
      return { code: 400, message: "商品名称和标题不能为空", data: null };
    }
    if (!Number.isFinite(price) || price < 0) {
      return { code: 400, message: "价格无效", data: null };
    }
    if (
      originalPrice !== null &&
      (!Number.isFinite(originalPrice) || originalPrice < 0)
    ) {
      return { code: 400, message: "原价无效", data: null };
    }
    if (!Number.isInteger(stock) || stock < 0) {
      return { code: 400, message: "库存无效", data: null };
    }

    const { sql } = setupDatabase();

    try {
      // ---------- 可选：接收前端直传后的 Cloudinary URL ----------
      const imageUrl =
        typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
      // 只信任自家 Cloudinary 域名，防止写入任意外链
      if (imageUrl && !imageUrl.startsWith("https://res.cloudinary.com/")) {
        return { code: 400, message: "图片 URL 无效", data: null };
      }

      // tags 以 JSON 字符串传入，SQL 内转 text[]，避免数组参数绑定兼容问题
      const tagsJson = JSON.stringify(tags);
      // 有新图时才更新 image 列，否则保持原值（postgres.js 空 fragment 渲染为空）
      const imageSet = imageUrl ? sql`image = ${imageUrl},` : sql``;
      const rows = (await sql`
        UPDATE mall_products
        SET name = ${name},
            title = ${title},
            description = ${description},
            price = ${price},
            original_price = ${originalPrice},
            category = ${category},
            stock = ${stock},
            tags = ARRAY(SELECT jsonb_array_elements_text(${tagsJson}::jsonb)),
            ${imageSet}
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, title, name, description, price, original_price, image,
                  category, stock, sales, rating_rate, rating_count, tags,
                  created_at, updated_at
      `) as unknown as MallProductRow[];

      const row = rows[0];
      if (!row) {
        return { code: 404, message: "商品不存在", data: null };
      }

      return { code: 200, message: "success", data: toMallProduct(row) };
    } catch (error) {
      console.error("更新商品失败:", error);
      return { code: 500, message: "更新商品失败", data: null };
    }
  },
);
