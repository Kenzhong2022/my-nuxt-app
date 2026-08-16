import { createHash } from "node:crypto";
import { useRuntimeConfig } from "#imports";

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** 读取并校验 Cloudinary 配置，缺失时抛出明确错误 */
export function getCloudinaryConfig(): CloudinaryConfig {
  const config = useRuntimeConfig().cloudinary;
  if (!config?.cloudName || !config?.apiKey || !config?.apiSecret) {
    throw new Error(
      "Cloudinary 未配置：请在 .env 中填写 CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET",
    );
  }
  return config as CloudinaryConfig;
}

/**
 * Cloudinary 签名规则：待签名参数按字母排序后拼接 k=v&k=v，末尾拼 api_secret，取 sha1 十六进制
 * https://cloudinary.com/documentation/upload_api#authenticated_requests
 */
function signParams(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
}

/**
 * 生成前端直传 Cloudinary 所需的签名参数（签名需覆盖所有上传参数）
 * @param folder 存放目录
 * @param transformation 传入变换，如 "f_webp,q_auto"
 */
export function createUploadSignature(
  folder = "mall/products",
  transformation = "f_webp,q_auto",
) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signParams(
    { folder, timestamp, transformation },
    apiSecret,
  );
  return {
    cloudName,
    apiKey,
    timestamp,
    folder,
    transformation,
    signature,
  };
}
