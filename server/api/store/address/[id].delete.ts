import type { ApiResponse } from "~~/types/common";

/**
 * 删除收货地址
 * url: /api/store/address/:id
 * method: DELETE
 *
 * 删除的是默认地址时自动补位：将剩余最近更新的一条设为默认，
 * 保证用户有地址时始终存在默认地址（订单快照不受影响，历史订单无需处理）
 *
 * return: 200 / 404 地址不存在或不属于当前用户
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<null>> => {
    const userId = event.context.user!.userId;
    const id = Number(getRouterParam(event, "id"));

    if (!Number.isInteger(id) || id <= 0) {
      return { code: 400, message: "无效的地址ID", data: null };
    }

    const { sql } = setupDatabase();

    try {
      const rows = (await sql`
        DELETE FROM store_addresses
        WHERE user_id = ${userId} AND id = ${id}
        RETURNING is_default
      `) as unknown as { is_default: boolean }[];

      if (!rows.length || !rows[0]) {
        return { code: 404, message: "地址不存在", data: null };
      }

      // 删掉的是默认地址 → 补位最近更新的非默认地址为默认
      if (rows[0].is_default) {
        await sql`
          UPDATE store_addresses
          SET is_default = true, updated_at = now()
          WHERE id = (
            SELECT id FROM store_addresses
            WHERE user_id = ${userId}
            ORDER BY updated_at DESC LIMIT 1
          )
        `;
      }

      return { code: 200, message: "success", data: null };
    } catch (error) {
      console.error("删除地址失败:", error);
      return { code: 500, message: "删除地址失败", data: null };
    }
  },
);
