import { setupDatabase } from "~~/server/utils/database";
import { requireAdmin } from "~~/server/utils/requireAdmin";
import type { ApiResponse } from "~~/types/common";
import type { PermissionRow } from "~~/types/permission";
import { PermissionType } from "~~/types/permission";

/**
 * 删除权限资源节点
 * url: /api/admin/permissions/:id
 * method: DELETE（仅管理员）
 *
 * 级联规则:
 *   - 删除页面 → 同 path 的按钮一并删除（归属靠 path 表达，一条 SQL 完成）
 *   - 被删权限在 role_permissions 中的角色映射由外键 ON DELETE CASCADE 清理
 * return: message 携带级联删除的子节点数量
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<null>> => {
    requireAdmin(event);

    const id = Number(getRouterParam(event, "id"));
    if (!Number.isInteger(id) || id <= 0) {
      return { code: 400, message: "无效的权限ID", data: null };
    }

    const { sql } = setupDatabase();

    try {
      const existing = (await sql`
        SELECT id, type, path FROM permissions WHERE id = ${id}
      `) as unknown as PermissionRow[];
      const current = existing[0];
      if (!current) {
        return { code: 404, message: "权限节点不存在", data: null };
      }

      // 页面删除时连带同 path 按钮；按钮删除只删自身
      const isPage = Number(current.type) === PermissionType.PAGE;
      const rows = (await sql`
        DELETE FROM permissions
        WHERE id = ${id}
           OR (path = ${current.path} AND type = ${PermissionType.ACTION})
        RETURNING id
      `) as unknown as { id: number | string }[];

      const deleted = rows.length;
      const message =
        isPage && deleted > 1
          ? `删除成功，并级联删除 ${deleted - 1} 个按钮`
          : "删除成功";
      return { code: 200, message, data: null };
    } catch (error) {
      console.error("删除权限失败:", error);
      return { code: 500, message: "删除权限失败", data: null };
    }
  },
);
