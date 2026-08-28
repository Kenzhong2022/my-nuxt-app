import { setupDatabase } from "~~/server/utils/database";
import { requireAdmin } from "~~/server/utils/requireAdmin";
import { buildPageList } from "~~/server/utils/permission";
import type { ApiResponse } from "~~/types/common";
import type { PermissionResource, PermissionRow } from "~~/types/permission";

/**
 * 获取权限资源列表（页面 → 按钮 两级）
 * url: /api/admin/permissions
 * method: GET（仅管理员）
 * return: 页面数组，按钮按 path 归组挂各页面 children，同级按 path/id 排序
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<PermissionResource[]>> => {
    requireAdmin(event);
    const { sql } = setupDatabase();

    try {
      const rows = (await sql`
        SELECT id, perm_key, type, path, name,
               route_name, menu_visible, icon, button_type,
               status, description, created_at, updated_at
        FROM permissions
        ORDER BY path, type, id
      `) as unknown as PermissionRow[];

      return { code: 200, message: "success", data: buildPageList(rows) };
    } catch (error) {
      console.error("获取权限列表失败:", error);
      return { code: 500, message: "获取权限列表失败", data: [] };
    }
  },
);
