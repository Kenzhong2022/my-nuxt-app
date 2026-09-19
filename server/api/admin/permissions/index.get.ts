import { setupDatabase } from "~~/server/utils/database";
import { requireAdmin } from "~~/server/utils/requireAdmin";
import { buildMenuTree } from "~~/server/utils/permission";
import type { ApiResponse } from "~~/types/common";
import type { PermissionResource, PermissionRow } from "~~/types/permission";

/**
 * 获取权限资源列表（目录 → 页面 → 按钮 三级菜单树）
 * url: /api/admin/permissions
 * method: GET（仅管理员）
 * return: 菜单树；按钮按 path 归组挂页面 children，目录/页面按 parent_id 挂接，同级按 sort/id 排序
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<PermissionResource[]>> => {
    requireAdmin(event);
    const { sql } = setupDatabase();

    try {
      const rows = (await sql`
        SELECT id, perm_key, type, path, label,
               route_name, menu_visible, icon, button_type,
               sort_order, parent_id, status, description, created_at, updated_at
        FROM permissions
        ORDER BY sort_order, id
      `) as unknown as PermissionRow[];

      return { code: 200, message: "success", data: buildMenuTree(rows) };
    } catch (error) {
      console.error("获取权限列表失败:", error);
      return { code: 500, message: "获取权限列表失败", data: [] };
    }
  },
);
