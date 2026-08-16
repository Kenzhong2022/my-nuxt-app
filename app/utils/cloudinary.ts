/**
 * 拼接 Cloudinary 投递 URL 变换参数，按需缩放/压缩/转格式（CDN 自动缓存）
 * 仅对 Cloudinary 域名的 URL 生效，其他 URL（如生图直链）原样返回
 *
 * @param url 原始图片 URL
 * @param transform Cloudinary 变换参数串
 * @example cloudinaryUrl(url, "w_100,h_100,c_fill,q_auto,f_webp")
 * @see https://cloudinary.com/documentation/transformation_reference
 */
export function cloudinaryUrl(
  url: string | null | undefined,
  transform: string,
): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/image/upload/", `/image/upload/${transform}/`);
}

/** 服务端签名接口返回的直传参数 */
export interface DirectUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: string;
  folder: string;
  transformation: string;
  signature: string;
}

/**
 * 浏览器直传 Cloudinary（先调 /api/admin/upload-signature 获取签名）
 * @param blob 图片二进制（可由 base64 data URL 转 Blob）
 * @param sig 服务端签发的签名参数
 * @returns 上传后的 secure_url
 */
export async function uploadImageDirect(
  blob: Blob,
  sig: DirectUploadSignature,
): Promise<string> {
  const form = new FormData();
  form.append("file", blob);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", sig.timestamp);
  form.append("folder", sig.folder);
  form.append("transformation", sig.transformation);
  form.append("signature", sig.signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: "POST", body: form },
  );
  const result = (await response.json()) as {
    secure_url?: string;
    error?: { message: string };
  };
  if (!response.ok || !result.secure_url) {
    throw new Error(result.error?.message || "Cloudinary 上传失败");
  }
  return result.secure_url;
}
