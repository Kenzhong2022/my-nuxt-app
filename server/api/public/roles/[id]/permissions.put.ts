import { setupDatabase } from "~~/server/utils/database";
import type {
  UpdateRolePermissionsRequest,
  UpdateRolePermissionsResponse,
} from "~~/types/role";
import type { PermissionId } from "~~/types/permission";

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
      if (permissions.length > 0) {
        const values = permissions.map((p) => [Number(roleId), p]);
        await sql`
          INSERT INTO role_permissions (role_id, perm_key)
          ${sql(values.map((v) => sql`${v[0]}, ${v[1]}`))}
        `;
      }

      return { code: 200, message: "权限更新成功" };
    } catch (error) {
      console.error("更新角色权限失败:", error);
      return { code: 500, message: "更新角色权限失败" };
    }
  },
);
