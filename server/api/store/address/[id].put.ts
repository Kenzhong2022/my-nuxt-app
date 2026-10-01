import type { ApiResponse } from "~~/types/common";
import type { AddressPayload, StoreAddress } from "~~/types/address";
import { validateAddress, normalizeAddress } from "~~/server/utils/storeAddress";

/**
 * 修改收货地址
 * url: /api/store/address/:id
 * method: PUT
 * body: { receiver, phone, region, detail, isDefault? }
 *
 * isDefault=true 时单语句原子：清理其他默认 + 本行置默认；
 * isDefault 未传或 false 时仅更新字段（本行原本默认则保持默认，避免用户误清空默认地址）
 *
 * return: 200 更新后的地址对象 / 404 地址不存在或不属于当前用户
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<StoreAddress | null>> => {
    const userId = event.context.user!.userId;
    const id = Number(getRouterParam(event, "id"));
    const body = await readBody<Partial<AddressPayload>>(event);

    if (!Number.isInteger(id) || id <= 0) {
      return { code: 400, message: "无效的地址ID", data: null };
    }
    const invalid = validateAddress(body);
    if (invalid) {
      return { code: 400, message: invalid, data: null };
    }
    const addr = normalizeAddress(body!);

    const { sql } = setupDatabase();

    try {
      const rows = (await sql`
        WITH clr AS (
          UPDATE store_addresses SET is_default = false
          WHERE user_id = ${userId} AND is_default = true AND id != ${id}
            AND ${addr.isDefault}
        ), upd AS (
          UPDATE store_addresses
          SET receiver = ${addr.receiver}, phone = ${addr.phone},
              region = ${addr.region}, detail = ${addr.detail},
              is_default = ${addr.isDefault} OR is_default,
              updated_at = now()
          WHERE user_id = ${userId} AND id = ${id}
          RETURNING id, receiver, phone, region, detail, is_default, created_at, updated_at
        )
        SELECT * FROM upd
      `) as unknown as Record<string, unknown>[];

      if (!rows.length) {
        return { code: 404, message: "地址不存在", data: null };
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
      console.error("修改地址失败:", error);
      return { code: 500, message: "修改地址失败", data: null };
    }
  },
);
