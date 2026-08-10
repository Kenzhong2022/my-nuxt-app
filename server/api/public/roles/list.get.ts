import { setupDatabase } from "~~/server/utils/database";
import type {
  Role,
  RoleWithPermissions,
  RoleListResponse,
} from "~~/types/role";
import type { PermissionId } from "~~/types/permission";

export default defineEventHandler(async (): Promise<RoleListResponse> => {
  const { sql } = setupDatabase();

  try {
    const roles = await sql`
      SELECT id, name, code, description, status, created_at, updated_at
      FROM roles
      ORDER BY id ASC
    `;

    const permissions = await sql`
      SELECT role_id, permission_id
      FROM role_permissions
      ORDER BY role_id ASC
    `;

    // 按 role_id 分组权限
    const permMap = new Map<number, PermissionId[]>();
    for (const row of permissions) {
      const list = permMap.get(row.role_id) || [];
      list.push(row.permission_id as PermissionId);
      permMap.set(row.role_id, list);
    }

    const data: RoleWithPermissions[] = roles.map((role) => ({
      ...(role as Role),
      permissions: permMap.get(role.id) || [],
    }));

    return {
      code: 200,
      message: "success",
      data,
    };
  } catch (error) {
    console.error("查询角色列表失败:", error);
    return {
      code: 500,
      message: "查询角色列表失败",
      data: [],
    };
  }
});
