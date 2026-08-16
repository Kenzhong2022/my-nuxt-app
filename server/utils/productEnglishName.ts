import { translateToEnglish } from "./baiduTranslate";

/**
 * 获取商品英文名：优先读 name_en 缓存，无则百度翻译并异步回写缓存
 * 供 AI 生图提示词构建使用（中文提示词生图效果差）
 * @param product 含 id / name / name_en 的商品行
 * @returns 英文商品名，翻译失败时降级返回中文名
 */
export async function getEnglishProductName(product: {
  id: string;
  name: string;
  name_en: string | null;
}): Promise<string> {
  if (product.name_en) return product.name_en;

  const englishName = await translateToEnglish(product.name);
  // 异步回写缓存，避免下次重复翻译（失败仅记日志，不影响主流程）
  const { sql } = setupDatabase();
  sql`
    UPDATE mall_products
    SET name_en = ${englishName}, updated_at = NOW()
    WHERE id = ${product.id}
  `.catch((err) => console.error("更新 name_en 失败:", err));
  return englishName;
}
