import type { ApiResponse } from "~~/types/common";

/**
 * 图集 AI 生图（以用户提示词生图，返回 base64 预览；默认提示词由 gallery-prompts.get.ts 提供）
 * url: /api/admin/products/:id/generate-gallery
 * method: POST（受 auth.global.ts 保护，需 Bearer Token）
 * body.prompt: 必填，用户确认/修改后的提示词
 * body.type: 图片类型标识（angle / detail / scene / wear），仅用于日志追踪
 * 前置约束：商品必须有主图（作为参考图锁定商品形态，保证图集一致性），
 *           无主图直接 400，引导用户先设置主图
 * return: { prompt: 实际使用的提示词, image: base64 data URL }
 */
export default defineEventHandler(
  async (
    event,
  ): Promise<ApiResponse<{ prompt: string; image: string } | null>> => {
    const id = Number(getRouterParam(event, "id"));
    if (!Number.isInteger(id) || id <= 0) {
      return { code: 400, message: "无效的商品ID", data: null };
    }

    const body =
      (await readBody<{ prompt?: unknown; type?: unknown }>(event)) ?? {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "";

    if (!prompt) {
      return { code: 400, message: "提示词不能为空", data: null };
    }

    const { sql } = setupDatabase();

    try {
      const products = (await sql`
        SELECT id, name, image
        FROM mall_products
        WHERE id = ${id}
        LIMIT 1
      `) as unknown as Array<{
        id: string;
        name: string;
        image: string;
      }>;

      const product = products[0];
      if (!product) {
        return { code: 404, message: "商品不存在", data: null };
      }

      // 强制要求主图：图集以主图为参考锚点，无主图的一致性无从谈起
      if (!/^https?:\/\//.test(product.image || "")) {
        return {
          code: 400,
          message: "缺少主图参考，请先在「编辑」中设置或 AI 生成商品主图",
          data: null,
        };
      }

      console.log(
        `[gen-gallery] 商品 id=${id} 生图开始, type=${type || "custom"}, mode=qwen-edit(qwen-image-edit-plus 主图参考)`,
      );
      const startTime = Date.now();
      const buffer = await generateImage(prompt, {
        provider: "qwen-edit",
        // qwen-image-3.0 免费额度已耗尽；edit-plus 支持自定义分辨率，额度独立
        model: "qwen-image-edit-plus",
        // 商品图集统一 4:3（电商详情页标准比例），尺寸需为 16 的倍数
        // 1152*864 为推荐档，比 1472*1104 体积小约 40%
        size: "1152*864",
        referenceImageUrl: product.image,
      });
      // 耗时埋点：观察同步生图 + base64 返回的整体等待时间
      console.log(
        `[gen-gallery] 商品 id=${id} 生图完成, type=${type || "custom"}, 耗时 ${((Date.now() - startTime) / 1000).toFixed(1)}s, 图片 ${Math.round(buffer.length / 1024)}KB`,
      );
      return {
        code: 200,
        message: "success",
        data: {
          prompt,
          image: `data:image/png;base64,${buffer.toString("base64")}`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 生图失败";
      console.error("图集 AI 生图失败:", error);
      return { code: 500, message, data: null };
    }
  },
);
