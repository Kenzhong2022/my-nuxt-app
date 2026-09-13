// GET /api/public/getRouters —— RuoYi 规范：返回角色可见的菜单路由树（RouterVo）
// 公共接口（白名单内做尽力鉴权）：登录用户按其角色返回；未登录一律按访客
// （roles.code = 'guest'）返回访客菜单；数据库无菜单时返回空数组
// 取数口径：admin → menus 全量；其余角色 → role_permissions 的 page 权限按 path
// 匹配 menus 页面行，并自动补全祖先目录（role_menus 为遗留数据，授权以 role_permissions 为准）
import { setupDatabase } from '~~/server/utils/database';
import type { RuoYiRoute, RuoYiRouteMeta } from '~~/types/user';

/** 访客角色标识（roles.code，role_id = 3） */
const GUEST_ROLE = 'guest';

/** menus 表行（建树所需列） */
interface MenuRow {
  menu_id: number;
  parent_id: number;
  menu_name: string;
  path: string;
  route_name: string | null;
  menu_type: string;
  menu_visible: number;
  icon: string | null;
  sort_order: number;
}

/** 带树构建元数据的路由节点 */
type RouteNode = RuoYiRoute & { _menuId: number; _parentId: number; _sort: number };

/** 数据库执行器类型（setupDatabase 返回的 sql 标签模板） */
type Sql = ReturnType<typeof setupDatabase>['sql'];

/**
 * 解析当前请求方角色（登录用户 → 其角色；未登录 → 访客角色）
 * @returns roleId / roleCode，均可能为 null（角色不存在或用户无角色）
 */
async function resolveViewerRole(
  sql: Sql,
  userId: number | undefined,
): Promise<{ roleId: number | null; roleCode: string | null }> {
  if (userId) {
    const [row] = await sql`
      SELECT r.id, r.code
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ${userId} AND u.deleted_at IS NULL
    `;
    if (row) return { roleId: row.id as number, roleCode: row.code as string };
  }
  // 未登录 / 用户已删除 / 无角色 → 访客
  const [guestRole] = await sql`
    SELECT id, code FROM roles WHERE code = ${GUEST_ROLE} LIMIT 1
  `;
  return {
    roleId: (guestRole?.id as number | undefined) ?? null,
    roleCode: (guestRole?.code as string | undefined) ?? GUEST_ROLE,
  };
}

/**
 * 按角色取可见菜单行（menu_type M/C，status=1）
 * @returns 全量菜单行数组（admin 全量；其余按角色 page 权限过滤 + 祖先目录补全）
 */
async function loadMenuRows(sql: Sql, roleId: number | null, roleCode: string | null): Promise<MenuRow[]> {
  const allRows = (await sql`
    SELECT menu_id, parent_id, menu_name, path, route_name,
           menu_type, menu_visible, icon, sort_order
    FROM menus
    WHERE status = 1 AND menu_type IN ('M', 'C')
  `) as unknown as MenuRow[];

  // admin：全量
  if (roleCode === 'admin') return allRows;

  // 非admin：角色未解析到 → 空菜单
  if (!roleId) return [];

  // 角色的页面权限 path 集合（page:/store/cart → /store/cart）
  const permRows = await sql`
    SELECT perm_key FROM role_permissions WHERE role_id = ${roleId}
  `;
  const grantedPaths = new Set(
    permRows
      .map((r) => /^page:\/?(.+)$/.exec(r.perm_key as string)?.[1])
      .filter((p): p is string => !!p)
      .map((p) => `/${p.replace(/\/+$/, '')}`.replace(/\/+/g, '/')),
  );

  // 命中页面 + 祖先目录链（保证树完整）
  const byId = new Map(allRows.map((row) => [row.menu_id, row]));
  const kept = new Set<number>();
  for (const row of allRows) {
    if (row.menu_type !== 'C' || !grantedPaths.has(row.path.replace(/\/+/g, '/'))) continue;
    let current: MenuRow | undefined = row;
    while (current && !kept.has(current.menu_id)) {
      kept.add(current.menu_id);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
  }
  return allRows.filter((row) => kept.has(row.menu_id));
}

/**
 * menus 行 → RuoYi 路由节点（目录 'M' → Layout，页面 'C' → 'path/index'）
 * @param row 单条菜单行
 */
function toRouteNode(row: MenuRow): RouteNode {
  const meta: RuoYiRouteMeta = {
    title: row.menu_name,
    icon: row.icon ?? null,
    noCache: false,
    link: null,
  };
  const isDirectory = row.menu_type === 'M';
  const component = isDirectory ? 'Layout' : `${row.path.replace(/^\/+/, '')}/index`;
  return {
    name: row.route_name || row.path.replace(/[^a-zA-Z0-9]+/g, '-'),
    path: row.path,
    hidden: row.menu_visible === 0,
    redirect: isDirectory ? 'noRedirect' : undefined,
    component,
    meta,
    children: [],
    _menuId: row.menu_id,
    _parentId: row.parent_id,
    _sort: row.sort_order,
  };
}

/**
 * 平铺节点 → 按 parent_id 建树（同级按 sort_order、menu_id 排序）
 * @param nodes 已转换的节点数组（row 顺序无关）
 */
function buildTree(nodes: RouteNode[]): RuoYiRoute[] {
  const byId = new Map(nodes.map((node) => [node._menuId, node]));
  const childrenMap = new Map<number, RouteNode[]>();
  const roots: RouteNode[] = [];

  for (const node of nodes) {
    // 父节点不在可见集合（被禁用等）→ 提升为根，避免孤儿丢失
    const parent = node._parentId ? byId.get(node._parentId) : undefined;
    if (parent) {
      const list = childrenMap.get(node._parentId) ?? [];
      list.push(node);
      childrenMap.set(node._parentId, list);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (a: RouteNode, b: RouteNode) => a._sort - b._sort || a._menuId - b._menuId;

  function attach(list: RouteNode[]): RuoYiRoute[] {
    return list.sort(sortNodes).map(({ _menuId, _parentId, _sort, ...route }) => {
      const children = childrenMap.get(_menuId);
      return { ...route, children: children?.length ? attach(children) : undefined };
    });
  }

  return attach(roots);
}

export default defineEventHandler(async (event) => {
  const authUser = event.context.user;
  const { sql } = setupDatabase();

  try {
    const { roleId, roleCode } = await resolveViewerRole(sql, authUser?.userId);
    const menuRows = await loadMenuRows(sql, roleId, roleCode);
    return { code: 200, msg: '操作成功', data: buildTree(menuRows.map(toRouteNode)) };
  } catch (error) {
    console.error('获取菜单路由失败:', error);
    throw createError({ statusCode: 500, message: '获取菜单路由失败' });
  }
});
