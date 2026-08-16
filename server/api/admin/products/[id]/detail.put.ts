import type { ApiResponse } from "~~/types/common";
import type { MallProductDetailRow } from "~~/types/product";

/**
 * 更新商品详情（product_details 表，UPSERT：不存在则插入，存在则覆盖）
 * url: /api/admin/products/:id/detail
 * method: PUT（受 auth.global.ts 保护，需 Bearer Token）
 * body: { gallery, detailContent, specs, highlights, packaging, services }
 * return: 更新后的详情数据（view_count 为系统数据，不接受修改）
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<MallProductDetailRow | null>> => {
    const id = Number(getRouterParam(event, "id"));
    if (!Number.isInteger(id) || id <= 0) {
      return { code: 400, message: "无效的商品ID", data: null };
    }

    const body = await readBody<Record<string, unknown>>(event);

    /** 字符串数组参数统一清洗：转字符串、去首尾空白、过滤空项 */
    const toStringArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : [];

    const gallery = toStringArray(body.gallery);
    const highlights = toStringArray(body.highlights);
    const packaging = toStringArray(body.packaging);
    const services = toStringArray(body.services);
    const detailContent = String(body.detailContent ?? "").trim();

    // specs: Record<string, string>，键值去空白后成对保留
    const specs: Record<string, string> = {};
    if (body.specs && typeof body.specs === "object") {
      for (const [k, v] of Object.entries(
        body.specs as Record<string, unknown>,
      )) {
        const key = k.trim();
        const value = String(v ?? "").trim();
        if (key && value) specs[key] = value;
      }
    }

    // 图集仅允许 http(s) 链接，防止写入脏数据
    if (gallery.some((u) => !/^https?:\/\//.test(u))) {
      return { code: 400, message: "图集包含无效的图片链接", data: null };
    }

    const { sql } = setupDatabase();

    try {
      // 数组以 JSON 字符串传入，SQL 内转 text[]（同 [id].put.ts 的 tags 处理，避免数组参数绑定兼容问题）
      const galleryJson = JSON.stringify(gallery);
      const highlightsJson = JSON.stringify(highlights);
      const packagingJson = JSON.stringify(packaging);
      const servicesJson = JSON.stringify(services);
      const specsJson = JSON.stringify(specs);

      const rows = (await sql`
        INSERT INTO product_details
          (product_id, gallery, detail_content, specs,
           highlights, packaging, services)
        VALUES (
          ${id},
          ARRAY(SELECT jsonb_array_elements_text(${galleryJson}::jsonb)),
          ${detailContent},
          ${specsJson}::jsonb,
          ARRAY(SELECT jsonb_array_elements_text(${highlightsJson}::jsonb)),
          ARRAY(SELECT jsonb_array_elements_text(${packagingJson}::jsonb)),
          ARRAY(SELECT jsonb_array_elements_text(${servicesJson}::jsonb))
        )
        ON CONFLICT (product_id) DO UPDATE SET
          gallery = EXCLUDED.gallery,
          detail_content = EXCLUDED.detail_content,
          specs = EXCLUDED.specs,
          highlights = EXCLUDED.highlights,
          packaging = EXCLUDED.packaging,
          services = EXCLUDED.services,
          updated_at = NOW()
        RETURNING id, product_id, gallery, detail_content, specs,
                  highlights, packaging, services, view_count,
                  created_at, updated_at
      `) as unknown as MallProductDetailRow[];

      const row = rows[0];
      if (!row) {
        return { code: 500, message: "保存商品详情失败", data: null };
      }
      return { code: 200, message: "success", data: row };
    } catch (error) {
      // 外键约束失败说明商品不存在
      const pgCode = (error as { code?: string }).code;
      if (pgCode === "23503") {
        return { code: 404, message: "商品不存在", data: null };
      }
      console.error("保存商品详情失败:", error);
      return { code: 500, message: "保存商品详情失败", data: null };
    }
  },
);
