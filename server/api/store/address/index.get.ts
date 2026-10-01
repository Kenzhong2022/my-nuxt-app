import type { ApiResponse } from "~~/types/common";
import type { StoreAddress } from "~~/types/address";

/**
 * 拉取当前用户收货地址列表
 * url: /api/store/address
 * method: GET
 * return: 默认地址置顶，其余按更新时间倒序
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<{ items: StoreAddress[] } | null>> => {
    // auth.global.ts 非白名单接口已校验 token 并注入 userId
    const userId = event.context.user!.userId;

    const { sql } = setupDatabase();

    try {
      const rows = (await sql`
        SELECT id, receiver, phone, region, detail, is_default, created_at, updated_at
        FROM store_addresses
        WHERE user_id = ${userId}
        ORDER BY is_default DESC, updated_at DESC
      `) as unknown as Record<string, unknown>[];

      const items: StoreAddress[] = rows.map((r) => ({
        id: Number(r.id),
        receiver: r.receiver as string,
        phone: r.phone as string,
        region: r.region as string,
        detail: r.detail as string,
        isDefault: Boolean(r.is_default),
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      }));

      return { code: 200, message: "success", data: { items } };
    } catch (error) {
      console.error("获取地址列表失败:", error);
      return { code: 500, message: "获取地址列表失败", data: null };
    }
  },
);
