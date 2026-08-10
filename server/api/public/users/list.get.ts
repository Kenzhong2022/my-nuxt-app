import { setupDatabase } from "~~/server/utils/database";
import type { UserListItem, UserListResponse } from "~~/types/user";

export default defineEventHandler(async (): Promise<UserListResponse> => {
  const { sql } = setupDatabase();

  try {
    const rows = await sql`
      SELECT
        u.id, u.uuid, u.email, u.phone, u.nickname, u.avatar,
        u.status, u.last_login_at, u.created_at, u.updated_at,
        u.role_id, r.name AS role_name, r.code AS role_code
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.id ASC
    `;

    return {
      code: 200,
      message: "success",
      total: rows.length,
      data: rows as UserListItem[],
    };
  } catch (error) {
    console.error("查询用户列表失败:", error);
    return {
      code: 500,
      message: "查询用户列表失败",
      total: 0,
      data: [],
    };
  }
});
