import type { ApiResponse } from "~~/types/common";

/**
 * 设为默认地址
 * url: /api/store/address/:id/default
 * method: PUT
 *
 * 单语句 CTE 原子：clr 清理其他默认（排除目标行，避免同行双写冲突）+ set1 目标置默认
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
        WITH clr AS (
          UPDATE store_addresses SET is_default = false
          WHERE user_id = ${userId} AND is_default = true AND id != ${id}
        ), set1 AS (
          UPDATE store_addresses SET is_default = true, updated_at = now()
          WHERE user_id = ${userId} AND id = ${id}
          RETURNING id
        )
        SELECT id FROM set1
      `) as unknown as { id: number }[];

      if (!rows.length) {
        return { code: 404, message: "地址不存在", data: null };
      }
      return { code: 200, message: "success", data: null };
    } catch (error) {
      console.error("设置默认地址失败:", error);
      return { code: 500, message: "设置默认地址失败", data: null };
    }
  },
);
