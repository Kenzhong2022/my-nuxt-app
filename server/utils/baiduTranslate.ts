import { createHash } from "node:crypto";

/**
 * 百度翻译工具
 * @description 走通用文本翻译 API，GET + MD5 签名（与官方 demo 对齐）
 * 文档：https://fanyi-api.baidu.com/doc/21
 */

/** 翻译请求选项 */
export interface TranslateOptions {
  /** 源语言，默认 zh（中文），auto 为自动检测 */
  from?: string;
  /** 目标语言，默认 en（英文） */
  to?: string;
}

/** 百度翻译响应（节选业务字段） */
interface BaiduTranslateResponse {
  trans_result?: Array<{ src: string; dst: string }>;
  error_code?: string;
  error_msg?: string;
}

/** 读取并校验百度翻译配置，缺失时抛出明确错误 */
function getBaiduConfig() {
  const config = useRuntimeConfig().baidu;
  if (!config?.appId || !config?.appKey) {
    throw new Error(
      "百度翻译未配置：请在 .env 中填写 BAIDU_APPID / BAIDU_APPKEY，并在 nuxt.config.ts runtimeConfig 中声明 baidu",
    );
  }
  return config as { appId: string; appKey: string };
}

/**
 * 翻译文本，默认中文 → 英文
 * @param text 待翻译文本（多段用 \n 连接，一次请求批量翻译）
 * @param options.from 源语言，默认 zh，传 auto 自动检测
 * @param options.to 目标语言，默认 en
 * @returns 译文字符串（多段以 \n 连接）
 * @throws 翻译失败时抛出 Error（含百度错误码与描述）
 */
export async function translate(
  text: string,
  options: TranslateOptions = {},
): Promise<string> {
  const { appId, appKey } = getBaiduConfig();
  const from = options.from || "zh";
  const to = options.to || "en";
  const trimmed = text.trim();

  if (!trimmed) return "";

  const salt = Date.now();
  // 签名规则：appid + q + salt + 密钥 的 MD5
  const sign = createHash("md5")
    .update(appId + trimmed + salt + appKey)
    .digest("hex");

  const params = new URLSearchParams({
    q: trimmed,
    from,
    to,
    appid: appId,
    salt: String(salt),
    sign,
  });

  const resp = await fetch(
    `https://api.fanyi.baidu.com/api/trans/vip/translate?${params.toString()}`,
  );
  const data = (await resp.json()) as BaiduTranslateResponse;

  if (data.error_code) {
    throw new Error(`百度翻译失败: ${data.error_code} ${data.error_msg ?? ""}`);
  }
  if (!data.trans_result?.length) {
    throw new Error("百度翻译返回空结果");
  }

  return data.trans_result.map((item) => item.dst).join("\n");
}

/**
 * 中译英的便捷封装（生图提示词等场景）
 * @param text 中文文本
 * @returns 英文译文；已是英文或翻译失败时返回原文（容错，不阻断主流程）
 */
export async function translateToEnglish(text: string): Promise<string> {
  // 不含中文则视为已是英文，直接返回
  if (!/[\u4e00-\u9fa5]/.test(text)) return text;

  try {
    return await translate(text, { from: "zh", to: "en" });
  } catch (error) {
    console.error("中译英失败，降级使用原文:", error);
    return text;
  }
}
