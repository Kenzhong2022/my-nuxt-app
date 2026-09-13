// POST /api/menus/sync —— 客户端上报文件系统路由，同步 menus 表最新菜单内容
// 同步规则（仅处理携带 definePageMeta 的路由）：
//   1. 按路径未匹配到菜单行 → 补建（menu_name 取 meta.title，否则路由 name）
//   2. 匹配到但 menu_name 为空 → 补齐
//   3. 已配置名称 → 保留不覆盖（跳过）
//   4. layout:false 或动态路由(:param)补建的行 menu_visible=0，仅用于权限匹配不进侧边栏
// 写操作：不走 /api/public 白名单，需登录且管理员角色
import { setupDatabase } from '~~/server/utils/database';
import { requireAdmin } from '~~/server/utils/requireAdmin';

/** 客户端上报的单条路由 */
interface SyncRouteItem {
  path: string;
  name: string;
  meta: Record<string, unknown> | null;
}

/** 同步结果统计 */
interface SyncResult {
  inserted: number;
  updated: number;
  skipped: number;
}

/** path 归一化：统一前导斜杠、去尾斜杠（DB 中目录行无前导斜杠、页面行有，统一口径后匹配） */
function normalizePath(path: string): string {
  const p = `/${String(path ?? '').replace(/^\/+/, '')}`.replace(/\/+$/, '');
  return p || '/';
}

export default defineEventHandler(async (event): Promise<{ code: number; msg: string; data: SyncResult }> => {
  const authUser = event.context.user;
  if (!authUser) {
    throw createError({ statusCode: 401, message: '登录状态已过期' });
  }

  const body = await readBody<{ routes?: SyncRouteItem[] }>(event);
  const routes = Array.isArray(body?.routes) ? body.routes : [];
  const result: SyncResult = { inserted: 0, updated: 0, skipped: 0 };
  if (routes.length === 0) {
    return { code: 200, msg: '无可同步路由', data: result };
  }

  const { sql } = setupDatabase();

  try {
    // 仅管理员可执行同步（写操作；requireAdmin 基于 auth.global.ts 注入的角色判断）
    requireAdmin(event);

    // 现有页面级菜单（含禁用），按归一化 path 建索引
    const existing = await sql`SELECT menu_id, path, menu_name FROM menus WHERE menu_type = 'C'`;
    const rowByPath = new Map<string, { menu_id: number; menu_name: string }>();
    for (const row of existing) {
      rowByPath.set(normalizePath(row.path as string), {
        menu_id: row.menu_id as number,
        menu_name: String(row.menu_name ?? ''),
      });
    }

    for (const route of routes) {
      // 规则：仅同步声明了 definePageMeta 的路由
      if (!route.meta || Object.keys(route.meta).length === 0) {
        result.skipped += 1;
        continue;
      }

      const normPath = normalizePath(route.path);
      // 菜单名：优先 meta.title，其次路由 name，最后路径本身
      const menuName = String(route.meta.title ?? route.name ?? normPath).trim() || normPath;
      const hit = rowByPath.get(normPath);

      if (!hit) {
        // 无布局页(layout:false) / 动态路由详情页(:param)不进侧边栏，仅保留作权限匹配
        const visible = route.meta.layout === false || normPath.includes(':') ? 0 : 1;
        await sql`
            INSERT INTO menus (parent_id, menu_name, path, route_name, menu_type, menu_visible, sort_order, status)
            VALUES (0, ${menuName}, ${normPath}, ${route.name ?? null}, 'C', ${visible}, 99, 1)
          `;
        rowByPath.set(normPath, { menu_id: 0, menu_name: menuName }); // 防同批重复插入
        result.inserted += 1;
      } else if (!hit.menu_name.trim()) {
        // 已有菜单行但名称为空 → 补齐
        await sql`
            UPDATE menus SET menu_name = ${menuName}, updated_at = now() WHERE menu_id = ${hit.menu_id}
          `;
        result.updated += 1;
      } else {
        // 已配置名称 → 保留，不覆盖
        result.skipped += 1;
      }
    }

    return { code: 200, msg: '同步完成', data: result };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error;
    console.error('同步菜单失败:', error);
    throw createError({ statusCode: 500, message: '同步菜单失败' });
  }
});
