// POST /api/menus/sync —— 客户端上报文件系统路由，同步 permissions 表页面行（type=1）
// 同步规则（仅处理携带 definePageMeta 的路由）：
//   1. 按 path 未匹配到页面行 → 补建（label 取 meta.title，否则路由 name），
//      并按最长目录前缀挂 parent_id（无匹配目录则入根）
//   2. 匹配到但 label 为空 → 补齐
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

/** path 归一化：统一前导斜杠、去尾斜杠 */
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

    // 现有页面行（含禁用），按归一化 path 建索引
    const existing = await sql`SELECT id, path, label FROM permissions WHERE type = 1`;
    const rowByPath = new Map<string, { id: number; label: string }>();
    for (const row of existing) {
      rowByPath.set(normalizePath(row.path as string), {
        id: row.id as number,
        label: String(row.label ?? ''),
      });
    }

    // 现有目录行（type=0），用于按前缀挂 parent_id
    const dirs = await sql`SELECT id, path FROM permissions WHERE type = 0`;
    const dirList = dirs.map((d) => ({ id: d.id as number, path: normalizePath(d.path as string) }));

    // 最长目录前缀匹配（/store/cart → /store；无匹配返回 0 入根）
    const findParentId = (normPath: string): number => {
      let best = { id: 0, len: -1 };
      for (const dir of dirList) {
        if (dir.path !== '/' && (normPath === dir.path || normPath.startsWith(`${dir.path}/`))) {
          if (dir.path.length > best.len) best = { id: dir.id, len: dir.path.length };
        }
      }
      return best.id;
    };

    for (const route of routes) {
      // 规则：仅同步声明了 definePageMeta 的路由
      if (!route.meta || Object.keys(route.meta).length === 0) {
        result.skipped += 1;
        continue;
      }

      const normPath = normalizePath(route.path);
      // 名称：优先 meta.title，其次路由 name，最后路径本身
      const menuName = String(route.meta.title ?? route.name ?? normPath).trim() || normPath;
      const hit = rowByPath.get(normPath);

      if (!hit) {
        // 无布局页(layout:false) / 动态路由详情页(:param)不进侧边栏，仅保留作权限匹配
        const visible = route.meta.layout === false || normPath.includes(':') ? 0 : 1;
        const parentId = findParentId(normPath);
        await sql`
            INSERT INTO permissions (perm_key, type, path, label, route_name, menu_visible, sort_order, parent_id, status)
            VALUES (${`page:${normPath}`}, 1, ${normPath}, ${menuName}, ${route.name ?? null}, ${visible}, 99, ${parentId}, 1)
          `;
        rowByPath.set(normPath, { id: 0, label: menuName }); // 防同批重复插入
        result.inserted += 1;
      } else if (!hit.label.trim()) {
        // 已有页面行但名称为空 → 补齐
        await sql`
            UPDATE permissions SET label = ${menuName}, updated_at = now() WHERE id = ${hit.id}
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
