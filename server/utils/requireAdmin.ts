import { createError, type H3Event } from "h3";
import { RoleCode } from "~~/types/role";

/**
 * 校验当前请求用户是否为管理员，非管理员直接抛出 403
 *
 * 依赖 auth.global.ts 中间件已完成 JWT 校验并将用户信息
 * 写入 event.context.user（因此本工具只做角色判断，不做登录判断）
 */
export function requireAdmin(event: H3Event): void {
  const user = event.context.user;

  if (!user || user.role !== RoleCode.ADMIN) {
    throw createError({
      statusCode: 403,
      message: "需要管理员权限",
    });
  }
}
