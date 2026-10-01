import type { ApiResponse } from "~~/types/common";
import type { AddressPayload, StoreAddress } from "~~/types/address";
import { validateAddress, normalizeAddress } from "~~/server/utils/storeAddress";

/**
 * 新增收货地址
 * url: /api/store/address
 * method: POST
 * body: { receiver, phone, region, detail, isDefault? }
 *
 * 默认地址规则（单语句 CTE 原子完成）：
 * - isDefault=true → 先清掉该用户旧的默认地址，再插入为默认
 * - 用户的第一条地址 → 无论传什么都是默认地址
 *
 * return: 200 新建的地址对象
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<StoreAddress | null>> => {
    const userId = event.context.user!.userId;
    const body = await readBody<Partial<AddressPayload>>(event);

    const invalid = validateAddress(body);
    if (invalid) {
      return { code: 400, message: invalid, data: null };
    }
    const addr = normalizeAddress(body!);

    const { sql } = setupDatabase();

    try {
      // clr 清理旧默认（快照语义：与新行无冲突）；first 判定是否首条地址
      const rows = (await sql`
        WITH clr AS (
          UPDATE store_addresses SET is_default = false
          WHERE user_id = ${userId} AND is_default = true
        ), first AS (
          SELECT NOT EXISTS (SELECT 1 FROM store_addresses WHERE user_id = ${userId}) AS is_first
        ), ins AS (
          INSERT INTO store_addresses (user_id, receiver, phone, region, detail, is_default)
          SELECT ${userId}, ${addr.receiver}, ${addr.phone}, ${addr.region}, ${addr.detail},
                 ${addr.isDefault} OR f.is_first
          FROM first f
          RETURNING id, receiver, phone, region, detail, is_default, created_at, updated_at
        )
        SELECT * FROM ins
      `) as unknown as Record<string, unknown>[];

      if (!rows.length || !rows[0]) {
        return { code: 500, message: "新增地址失败", data: null };
      }

      const r = rows[0];
      
      return {
        code: 200,
        message: "success",
        data: {
          id: Number(r.id),
          receiver: r.receiver as string,
          phone: r.phone as string,
          region: r.region as string,
          detail: r.detail as string,
          isDefault: Boolean(r.is_default),
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        },
      };
    } catch (error) {
      console.error("新增地址失败:", error);
      return { code: 500, message: "新增地址失败", data: null };
    }
  },
);
