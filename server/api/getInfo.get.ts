// GET /api/getInfo —— RuoYi 规范：返回 { code, msg, permissions, roles, user }
// 鉴权：server/middleware/auth.global.ts 已校验 token 并注入 event.context.user
import { setupDatabase } from "~~/server/utils/database";
import type { GetInfoResponse, SysUser } from "~~/types/user";

/** RuoYi 约定：超级管理员通配权限 */
const ALL_PERMISSION = "*:*:*";

/**
 * 库内 perm_key → RuoYi 权限标识
 *   page:/system/user        → system:user
 *   action:/system/user:create → system:user:create
 */
function toRuoYiPerm(permKey: string): string | null {
  const matched = /(?:page|action):\/?(.+)/.exec(permKey);
  if (!matched?.[1]) return null;
  return matched[1].replace(/\/+$/, "").replace(/\//g, ":");
}

export default defineEventHandler(
  async (event): Promise<GetInfoResponse> => {
    const authUser = event.context.user;
    if (!authUser) {
      throw createError({ statusCode: 401, message: "登录状态已过期" });
    }

    const { sql } = setupDatabase();

    try {
      // 1. 用户基础信息 + 角色（单角色，role_id 关联；code 即 RuoYi roleKey）
      const [userRow] = await sql`
        SELECT u.id, u.nickname, u.avatar, u.email, u.phone,
               r.id AS role_id, r.name AS role_name, r.code AS role_key
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ${authUser.userId} AND u.deleted_at IS NULL
      `;
      if (!userRow) {
        throw createError({ statusCode: 401, message: "用户不存在" });
      }

      const isAdmin = userRow.role_key === "admin";

      // 2. 角色拥有的权限（RuoYi：超管只下发通配符 *:*:*）
      let permissions: string[];
      if (isAdmin) {
        permissions = [ALL_PERMISSION];
      } else if (userRow.role_id) {
        const permKeyRows = await sql`
          SELECT perm_key FROM role_permissions WHERE role_id = ${userRow.role_id}
        `;
        permissions = [
          ...new Set(
            permKeyRows
              .map((r) => toRuoYiPerm(r.perm_key as string))
              .filter((p): p is string => !!p),
          ),
        ];
      } else {
        permissions = [];
      }

      // 3. 角色权限串数组（roleKey）
      const roles: string[] = userRow.role_key ? [userRow.role_key] : [];

      const user: SysUser = {
        userId: userRow.id as number,
        userName: (userRow.email ?? userRow.phone) as string | null,
        nickName: (userRow.nickname as string | null) ?? null,
        email: (userRow.email as string | null) ?? null,
        phonenumber: (userRow.phone as string | null) ?? null,
        avatar: (userRow.avatar as string | null) ?? null,
        admin: isAdmin,
        roles: [
          {
            roleId: (userRow.role_id as number | null) ?? null,
            roleName: (userRow.role_name as string | null) ?? null,
            roleKey: (userRow.role_key as string | null) ?? null,
          },
        ],
      };

      return { code: 200, msg: "操作成功", permissions, roles, user };
    } catch (error) {
      // createError 抛出的业务错误（401 等）原样上抛，不吞成 500
      if (error && typeof error === "object" && "statusCode" in error) throw error;
      console.error("获取用户信息失败:", error);
      throw createError({ statusCode: 500, message: "获取用户信息失败" });
    }
  },
);
