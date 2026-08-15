import type {
  MallProductDetailRow,
  MallProductRow,
  Product,
  ProductDetail,
} from "~~/types/product";
import { toCamelCase } from "./caseConvert";

/**
 * mall_products 数据库行 → 前端 Product 类型
 * 键名转换交给通用 toCamelCase，这里只处理 numeric/bigint 的数值化与 rating 结构
 */
export function toMallProduct(row: MallProductRow): Product {
  const { id, price, originalPrice, ratingRate, ratingCount, ...rest } =
    toCamelCase(row);

  return {
    ...rest,
    id: Number(id),
    price: Number(price),
    originalPrice: originalPrice === null ? undefined : Number(originalPrice),
    rating: { rate: Number(ratingRate), count: ratingCount },
  };
}

/**
 * mall_products 行 + product_details 行 → 前端 ProductDetail 类型
 * detail 为 null 时（详情未配置）返回带默认值的详情结构
 */
export function toMallProductDetail(
  row: MallProductRow,
  detail: MallProductDetailRow | null,
): ProductDetail {
  const d = toCamelCase(detail);

  return {
    ...toMallProduct(row),
    gallery: d?.gallery ?? [],
    detailContent: d?.detailContent ?? "",
    specs: d?.specs ?? {},
    highlights: d?.highlights ?? [],
    packaging: d?.packaging ?? [],
    services: d?.services ?? [],
    viewCount: d ? Number(d.viewCount) : 0,
  };
}
