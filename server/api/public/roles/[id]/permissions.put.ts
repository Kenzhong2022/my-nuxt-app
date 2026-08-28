import { setupDatabase } from "~~/server/utils/database";
import type {
  UpdateRolePermissionsRequest,
  UpdateRolePermissionsResponse,
} from "~~/types/role";

export default defineEventHandler(
  async (event): Promise<UpdateRolePermissionsResponse> => {
    const { sql } = setupDatabase();
    const roleId = getRouterParam(event, "id");

    if (!roleId) {
      return { code: 400, message: "缺少角色 ID" };
    }

    const body = await readBody<UpdateRolePermissionsRequest>(event);
    const permissions = body.permissions || [];

    try {
      // 先删除旧权限
      await sql`DELETE FROM role_permissions WHERE role_id = ${Number(roleId)}`;

      // 再批量插入新权限
      // neon() 直接调用仅支持标签模板（sql``），且不支持嵌套片段（嵌套会立即执行）。
      // 动态 SQL 用 sql.query(text, params)：占位符 $1..$n，值全走参数化
      if (permissions.length > 0) {
        const params: (number | string)[] = [];
        const placeholders = permissions.map((p, i) => {
          params.push(Number(roleId), p);
          const base = i * 2;
          return `($${base + 1}, $${base + 2})`;
        });
        await sql.query(
          `INSERT INTO role_permissions (role_id, perm_key) VALUES ${placeholders.join(", ")}`,
          params,
        );
      }

      return { code: 200, message: "权限更新成功" };
    } catch (error) {
      console.error("更新角色权限失败:", error);
      return { code: 500, message: "更新角色权限失败" };
    }
  },
);
