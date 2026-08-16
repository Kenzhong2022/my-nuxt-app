// ============================================================
// 文件: server/api/admin/products/[id]/regenerate-images.post.ts
// 功能: AI 生成商品主图，返回 base64 供前端预览（不上传不入库）
//       用户在编辑弹窗点击保存时，由 PUT /api/admin/products/:id
//       上传 Cloudinary 并写入数据库
// 依赖: 百度翻译 API (免费) + 生图服务
// ============================================================

import type { ApiResponse } from "~~/types/common";
import { translateToEnglish } from "~~/server/utils/baiduTranslate"; // 你的翻译工具（服务端）

// ============================================================
// 1. 构建通用提示词（所有商品共用一套模板）
//    每个 slot 对应不同的拍摄角度/场景，但仅包含商品名，
//    模型会根据商品名自行生成对应的产品形态
// ============================================================
function buildPromptMap(
  englishName: string,
): Array<{ slot: string; prompt: string }> {
  // 通用基础风格（适用于所有商品）
  const baseStyle =
    "professional product photography, high resolution, 8k, detailed, studio lighting";

  return [
    {
      slot: "main",
      prompt: `${englishName} product photography, clean white background, front view, evenly lit, 1:1 aspect ratio, ${baseStyle}`,
      // 中文含义：商品摄影，干净白色背景，正面视角，均匀布光，1:1方形比例，专业高细节
    },
    // TODO: 暂时只生成主图，图集生成注释，后续需要时恢复
    // {
    //   slot: "g1",
    //   prompt: `${englishName} product photography, three-quarter angle view, soft shadows, 4:3 aspect ratio, ${baseStyle}`,
    //   // 中文含义：商品摄影，四分之三侧面视角，柔和阴影，4:3比例
    // },
    // {
    //   slot: "g2",
    //   prompt: `${englishName} close-up detail shot, macro lens, focusing on textures and materials, 4:3 aspect ratio, ${baseStyle}`,
    //   // 中文含义：微距细节特写，突出材质和纹理，4:3比例
    // },
    // {
    //   slot: "g3",
    //   prompt: `${englishName} lifestyle scene, placed in a modern indoor environment, natural daylight, 4:3 aspect ratio, ${baseStyle}`,
    //   // 中文含义：生活场景，置于现代室内环境，自然日光，4:3比例
    // },
  ];
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
        console.warn(`[regen-images] 商品 id=${id} 不存在`);
        return { code: 404, message: "商品不存在", data: null };
      }
      console.log(
        `[regen-images] 商品 id=${id} name="${product.name}" name_en=${product.name_en ? `"${product.name_en}"(缓存)` : "无"}`,
      );

      // ---------- 2c. 获取英文商品名（优先缓存，否则翻译） ----------
      let englishName = product.name_en;
      if (!englishName) {
        try {
          console.log(
            `[regen-images] name_en 为空，开始翻译: "${product.name}"`,
          );
          englishName = await translateToEnglish(product.name);
          console.log(
            `[regen-images] 翻译成功: "${product.name}" -> "${englishName}"`,
          );
          // 异步更新数据库，避免下次重复翻译
          sql`
            UPDATE mall_products
            SET name_en = ${englishName}, updated_at = NOW()
            WHERE id = ${id}
          `.catch((err) => console.error("更新 name_en 失败:", err));
        } catch (transError) {
          console.error(
            `[regen-images] 翻译失败，降级使用中文名 "${product.name}"`,
            transError,
          );
          englishName = product.name; // 降级（但可能影响生图效果）
        }
      }

      // ---------- 2d. 生成通用提示词列表 ----------
      const promptMap = buildPromptMap(englishName!); // 无需传入 product，只传英文名

      // ---------- 2e. 生成主图，返回 base64 data URL（仅预览，不上传不入库） ----------
      const mainPrompt = promptMap[0] ? promptMap[0].prompt : ""; // 现阶段仅主图
      console.log(`[regen-images] 开始生成主图, prompt: ${mainPrompt}`);
      const buffer = await generateImage(mainPrompt);
      const image = `data:image/png;base64,${buffer.toString("base64")}`;
      console.log(
        `[regen-images] 主图生图完成 (${buffer.length} bytes), 返回 base64 预览`,
      );

      return {
        code: 200,
        message: "success",
        data: { image },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "重新生成图片失败";
      console.error("重新生成商品图片失败:", error);
      return { code: 500, message, data: null };
    }
  },
);
