// ============================================================
// 文件: server/api/admin/products/[id]/generate-main-image.post.ts
// 功能: AI 生成商品主图，返回 base64 供前端预览（不上传不入库）
//       用户在编辑弹窗点击保存时，由 PUT /api/admin/products/:id
//       上传 Cloudinary 并写入数据库
// 依赖: 百度翻译 API (免费) + 生图服务
// ============================================================

import type { ApiResponse } from "~~/types/common";

// ============================================================
// 1. 构建主图提示词（所有商品共用一套模板）
// ============================================================
function buildMainImagePrompt(englishName: string): string {
  // 通用基础风格（适用于所有商品）
  const baseStyle =
    "professional product photography, high resolution, 8k, detailed, studio lighting";

  // 中文含义：商品摄影，干净白色背景，正面视角，均匀布光，1:1方形比例，专业高细节
  return `${englishName} product photography, clean white background, front view, evenly lit, 1:1 aspect ratio, ${baseStyle}`;
}

// ============================================================
// 2. 主 API 处理函数
// ============================================================
export default defineEventHandler(
  async (event): Promise<ApiResponse<{ image: string } | null>> => {
    // ---------- 2a. 解析参数 ----------
    const id = Number(getRouterParam(event, "id"));
    if (!Number.isInteger(id) || id <= 0) {
      return { code: 400, message: "无效的商品ID", data: null };
    }

    const { sql } = setupDatabase();

    try {
      // ---------- 2b. 查询商品信息 ----------
      const products = (await sql`
        SELECT id, name, description, category, image, name_en
        FROM mall_products
        WHERE id = ${id}
        LIMIT 1
      `) as unknown as Array<{
        id: string;
        name: string;
        description: string;
        category: string;
        image: string;
        name_en: string | null;
      }>;

      const product = products[0];
      if (!product) {
        console.warn(`[gen-main] 商品 id=${id} 不存在`);
        return { code: 404, message: "商品不存在", data: null };
      }
      console.log(
        `[gen-main] 商品 id=${id} name="${product.name}" name_en=${product.name_en ? `"${product.name_en}"(缓存)` : "无"}`,
      );

      // ---------- 2c. 获取英文商品名（优先缓存，否则翻译并回写） ----------
      const englishName = await getEnglishProductName(product);

      // ---------- 2d. 生成主图，返回 base64 data URL（仅预览，不上传不入库） ----------
      const prompt = buildMainImagePrompt(englishName!);
      console.log(`[gen-main] 开始生成主图, prompt: ${prompt}`);
      const buffer = await generateImage(prompt);
      const image = `data:image/png;base64,${buffer.toString("base64")}`;
      console.log(
        `[gen-main] 主图生图完成 (${buffer.length} bytes), 返回 base64 预览`,
      );

      return {
        code: 200,
        message: "success",
        data: { image },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "生成商品主图失败";
      console.error("生成商品主图失败:", error);
      return { code: 500, message, data: null };
    }
  },
);
