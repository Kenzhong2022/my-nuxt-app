import type { ApiResponse } from "~~/types/common";
import { createUploadSignature } from "~~/server/utils/cloudinary";

/**
 * 签发前端直传 Cloudinary 的签名参数
 * url: /api/admin/upload-signature
 * method: POST（受 auth.global.ts 保护，需 Bearer Token）
 * return: { cloudName, apiKey, timestamp, folder, transformation, signature }
 *         前端携这些参数 + 文件直传 Cloudinary，apiSecret 永不下发
 */
export default defineEventHandler(
  async (): Promise<
    ApiResponse<ReturnType<typeof createUploadSignature> | null>
  > => {
    try {
      return {
        code: 200,
        message: "success",
        data: createUploadSignature(),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "生成上传签名失败";
      console.error("[upload-signature] 生成签名失败:", error);
      return { code: 500, message, data: null };
    }
  },
);
