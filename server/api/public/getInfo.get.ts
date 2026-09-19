// GET /api/public/getInfo —— RuoYi 规范：返回 { code, msg, permissions, roles, user }
// 公共接口（白名单内做尽力鉴权）：登录用户返回其信息；未登录 / token 失效 /
// 用户已删除一律按访客（roles.code = 'guest'）返回访客信息，永不 401
import { setupDatabase } from "~~/server/utils/database";
import type { GetInfoResponse, SysUser } from "~~/types/user";

/** RuoYi 约定：超级管理员通配权限 */
const ALL_PERMISSION = "*:*:*";
/** 访客角色标识（roles.code，role_id = 3） */
const GUEST_ROLE = "guest";

/**
 * 按角色解析权限数组（超管通配；其余查 role_permissions）
 * 直接下发 perm_key 原值（page:/system/user、action:/system/user:create），
 * 与 permissions 表 / 前端 v-hasPermi / checker 同一口径，无需格式转换
 * @param sql 数据库执行器
 * @param roleId 角色 id（null 表示无角色 → 空权限）
 * @param isAdmin 是否超管角色
 */
async function resolvePermissions(
  sql: ReturnType<typeof setupDatabase>["sql"],
  roleId: number | null,
  isAdmin: boolean,
): Promise<string[]> {
  if (isAdmin) return [ALL_PERMISSION];
  if (!roleId) return [];
  const permKeyRows = await sql`
    SELECT DISTINCT perm_key FROM role_permissions WHERE role_id = ${roleId}
  `;
  return permKeyRows.map((r) => r.perm_key as string);
}

/**
 * 构造访客响应（未登录一律视为访客）
 * @param sql 数据库执行器（用于查访客角色及其权限）
 */
async function buildGuestResponse(
  sql: ReturnType<typeof setupDatabase>["sql"],
): Promise<GetInfoResponse> {
  // 访客角色可能未配置 → 兜底空权限
  const [guestRole] = await sql`
    SELECT id, name, code FROM roles WHERE code = ${GUEST_ROLE} LIMIT 1
  `;
  const roleId = (guestRole?.id as number | undefined) ?? null;
  const roleKey = (guestRole?.code as string | undefined) ?? GUEST_ROLE;
  const roleName = (guestRole?.name as string | undefined) ?? "访客";

  const user: SysUser = {
    userId: 0,
    userName: roleKey,
    nickName: "访客",
    email: null,
    phonenumber: null,
    avatar: null,
    admin: false,
    roles: [{ roleId, roleName, roleKey }],
  };

  return {
    code: 200,
    msg: "操作成功",
    permissions: await resolvePermissions(sql, roleId, false),
    roles: [roleKey],
    user,
  };
}

export default defineEventHandler(
  async (event): Promise<GetInfoResponse> => {
    const { sql } = setupDatabase();

    try {
      const authUser = event.context.user;

      if (authUser) {
        // 1. 用户基础信息 + 角色（单角色，role_id 关联；code 即 RuoYi roleKey）
        const [userRow] = await sql`
          SELECT u.id, u.nickname, u.avatar, u.email, u.phone,
                 r.id AS role_id, r.name AS role_name, r.code AS role_key
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.id
          WHERE u.id = ${authUser.userId} AND u.deleted_at IS NULL
        `;

        // token 有效但用户不存在/已删除 → 视为未登录，走访客分支
        if (userRow) {
          const isAdmin = userRow.role_key === "admin";
          const roleId = (userRow.role_id as number | null) ?? null;
          const roleKey = (userRow.role_key as string | null) ?? null;

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
                roleId,
                roleName: (userRow.role_name as string | null) ?? null,
                roleKey,
              },
            ],
          };

          return {
            code: 200,
            msg: "操作成功",
            permissions: await resolvePermissions(sql, roleId, isAdmin),
            roles: roleKey ? [roleKey] : [],
            user,
          };
        }
      }

      // 2. 未登录：返回访客信息
      return await buildGuestResponse(sql);
    } catch (error) {
      // createError 抛出的业务错误原样上抛，不吞成 500
      if (error && typeof error === "object" && "statusCode" in error) throw error;
      console.error("获取用户信息失败:", error);
      throw createError({ statusCode: 500, message: "获取用户信息失败" });
    }
  },
);
