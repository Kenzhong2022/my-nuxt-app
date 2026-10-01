import type { ApiResponse } from "~~/types/common";
import type { CheckoutInsufficient, CheckoutPreview } from "~~/types/product";
import type { StoreAddress } from "~~/types/address";
import type { MallProductRow } from "~~/types/product";
import { toMallProduct } from "~~/server/utils/mallProduct";

/**
 * 结算预览：确认订单页的数据源
 * url: /api/checkout?productIds=1,2,3
 * method: GET
 *
 * 设计说明：
 * - 只取勾选且在购物车中、且在售（status=1）的商品；下架/不在购物车的项自然被过滤
 * - totalAmount 由服务端按 当前价格 x 数量 重算，不信任前端金额
 * - insufficient 逐个对比 购物车qty 与 商品剩余库存，兜底「加购后库存被他人消费」的窗口
 * - 附带返回地址列表（默认置顶），确认订单页一次请求拿齐数据
 *
 * return: 200 CheckoutPreview / 400 未选择结算商品
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<CheckoutPreview | null>> => {
    // auth.global.ts 非白名单接口已校验 token 并注入 userId
    const userId = event.context.user!.userId;

    // 解析勾选的商品 id（逗号分隔），过滤非法值
    const productIds = String(getQuery(event).productIds ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (!productIds.length) {
      return { code: 400, message: "请选择结算商品", data: null };
    }

    const { sql } = setupDatabase();

    try {
      // = ANY($1::bigint[])：数组参数整体传入，避免拼接 IN 列表
      const rows = (await sql`
        SELECT p.id, p.title, p.name, p.description, p.price,
               p.original_price, p.image, p.category, p.stock, p.sales,
               p.rating_rate, p.rating_count, p.tags,
               p.created_at, p.updated_at,
               c.qty, c.added_at
        FROM store_cart_items c
        JOIN mall_products p ON p.id = c.product_id AND p.status = 1
        WHERE c.user_id = ${userId} AND c.product_id = ANY(${productIds}::bigint[])
        ORDER BY c.added_at DESC
      `) as unknown as (MallProductRow & { qty: number; added_at: string })[];

      const items = rows.map((row) => ({
        ...toMallProduct(row),
        qty: Number(row.qty),
        addedAt: row.added_at,
      }));

      // 服务端重算总价（分为单位累加再还原，规避浮点误差）
      const totalAmount =
        items.reduce((sum, i) => sum + Math.round(i.price * 100) * i.qty, 0) /
        100;

      // 库存校验：购物车数量 > 当前剩余库存 → 记入缺货清单
      const insufficient: CheckoutInsufficient[] = items
        .filter((i) => i.qty > (i.stock ?? 0))
        .map((i) => ({
          productId: i.id,
          name: i.name,
          stock: i.stock ?? 0,
          qty: i.qty,
        }));

      const addressRows = (await sql`
        SELECT id, receiver, phone, region, detail, is_default, created_at, updated_at
        FROM store_addresses
        WHERE user_id = ${userId}
        ORDER BY is_default DESC, updated_at DESC
      `) as unknown as Record<string, unknown>[];

      const addresses: StoreAddress[] = addressRows.map((r) => ({
        id: Number(r.id),
        receiver: r.receiver as string,
        phone: r.phone as string,
        region: r.region as string,
        detail: r.detail as string,
        isDefault: Boolean(r.is_default),
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      }));

      return {
        code: 200,
        message: "success",
        data: { items, totalAmount, insufficient, addresses },
      };
    } catch (error) {
      console.error("获取结算预览失败:", error);
      return { code: 500, message: "获取结算预览失败", data: null };
    }
  },
);
