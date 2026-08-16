import type { ApiResponse } from "~~/types/common";

/**
 * 图集 AI 生图的各类型默认提示词
 * url: /api/admin/products/:id/gallery-prompts
 * method: GET（受 auth.global.ts 保护，需 Bearer Token）
 * 职责单一：只负责按商品英文名 + 主图参考模式构建默认提示词，不生图
 * 前置约束：商品必须有主图（与 generate-gallery 一致，提前拦截引导补主图）
 * return: { prompts: 默认提示词数组 }
 */

/** 图片类型提示词项 */
export interface GalleryPromptItem {
  /** 类型标识 */
  type: string;
  /** 类型中文名（前端下拉展示） */
  label: string;
  /** 提示词 */
  prompt: string;
}

/**
 * 图集默认提示词（按图片类型）：
 * - angle 角度图：合并 side 侧面、back 背面等各拍摄角度
 * - detail 细节图：合并 detail 普通特写、zoom 放大细节
 * - scene  场景图：合并场景效果图、使用环境图（区别于主图的白色背景正面图）
 * - wear   佩戴图：真人佩戴/使用效果，展示商品与人的交互
 */
function buildGalleryPrompts(subject: string): GalleryPromptItem[] {
  const baseStyle =
    "professional product photography, high resolution, 8k, detailed";

  return [
    {
      type: "angle",
      label: "角度图",
      prompt: `${subject} product photography, dynamic three-quarter rear-side angle view, revealing the sleek side contour and detailed back panel, clean light gray seamless background, soft diffused studio lighting with gentle shadows, product-centered composition, ${baseStyle}`,
    },
    {
      type: "detail",
      label: "细节图",
      prompt: `${subject} extreme close-up macro detail shot, razor-sharp focus on premium surface textures and material grain, dramatic side-lighting to emphasize tactile feel, minimalist pure white or light gray backdrop, shallow depth of field, isolated product element, ${baseStyle}`,
    },
    {
      type: "scene",
      label: "场景图",
      prompt: `${subject} lifestyle scene, elegantly placed on a modern wooden desk in a bright, airy living room, soft natural daylight streaming through sheer curtains, warm ambient tones, subtle bokeh background, hero product prominently in foreground, harmonious and inviting composition, ${baseStyle}`,
    },
    {
      type: "wear",
      label: "佩戴图",
      prompt: `${subject} worn on a person, realistic human model, natural and relaxed posture, showing the product fitting naturally on the user, authentic lifestyle photography, soft natural daylight, modern urban or cozy home setting, warm skin tones, medium shot, focus on both product and user interaction, harmonious composition, ${baseStyle}`,
    },
  ];
}

export default defineEventHandler(
  async (
    event,
  ): Promise<ApiResponse<{ prompts: GalleryPromptItem[] } | null>> => {
    const id = Number(getRouterParam(event, "id"));
    if (!Number.isInteger(id) || id <= 0) {
      return { code: 400, message: "无效的商品ID", data: null };
    }

    const { sql } = setupDatabase();

    try {
      const products = (await sql`
        SELECT id, name, name_en, image
        FROM mall_products
        WHERE id = ${id}
        LIMIT 1
      `) as unknown as Array<{
        id: string;
        name: string;
        name_en: string | null;
        image: string;
      }>;

      const product = products[0];
      if (!product) {
        return { code: 404, message: "商品不存在", data: null };
      }

      // 与生图接口同款约束：无主图直接失败，避免用户填完提示词才被拦
      if (!/^https?:\/\//.test(product.image || "")) {
        return {
          code: 400,
          message: "缺少主图参考，请先在「编辑」中设置或 AI 生成商品主图",
          data: null,
        };
      }

      // 有主图走"参考图编辑"模式，默认提示词带一致性指令前缀
      const consistencyPrefix =
        "Using the product in the reference image, keep its exact same design, shape, color and materials unchanged. ";

      const englishName = await getEnglishProductName(product);
      return {
        code: 200,
        message: "success",
        data: { prompts: buildGalleryPrompts(consistencyPrefix + englishName) },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "获取默认提示词失败";
      console.error("获取图集默认提示词失败:", error);
      return { code: 500, message, data: null };
    }
  },
);
