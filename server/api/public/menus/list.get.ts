// GET /api/public/menus/list —— 菜单管理列表：返回 menus 全量树（含禁用项，供后台管理页筛选）
import { setupDatabase } from '~~/server/utils/database';

/** 菜单类型映射：M 目录 / C 页面 / F 按钮（与 RuoYi 约定一致） */
const TYPE_MAP = { M: 'module', C: 'page', F: 'action' } as const;

/** menus 表行中列表所需的字段 */
type MenuRow = {
  menu_id: number;
  parent_id: number;
  menu_name: string;
  path: string | null;
  icon: string | null;
  perms: string | null;
  menu_type: string;
  sort_order: number;
  status: number;
  created_at: Date | string;
};

/** 前端菜单节点（与 pages/system/role/index.vue 的 MenuItem 结构对齐） */
interface MenuNode {
  /** 权限标识；目录/页面通常无 perms，回退为稳定占位 menu:{id} */
  id: string;
  label: string;
  type: 'module' | 'page' | 'action';
  /** 路由地址（目录/菜单） */
  path?: string;
  /** 菜单图标（目录/菜单） */
  icon?: string;
  sort: number;
  status: 0 | 1;
  createTime: string;
  children?: MenuNode[];
}

/** timestamptz → "YYYY-MM-DD HH:mm:ss"（服务器本地时区） */
function formatDateTime(value: Date | string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default defineEventHandler(async () => {
  const { sql } = setupDatabase();

  try {
    // 管理页需要看到禁用项，不做 status 过滤；排序与侧边栏渲染口径一致
    const rows = (await sql`
      SELECT menu_id, parent_id, menu_name, path, icon, perms, menu_type, sort_order, status, created_at
      FROM menus
      ORDER BY sort_order ASC, menu_id ASC
    `) as MenuRow[];

    // 两遍循环建树：先建 Map 再按 parent_id 挂接，避免排序后父行晚于子行导致断链
    const nodeMap = new Map<number, MenuNode>();
    for (const row of rows) {
      nodeMap.set(row.menu_id, {
        id: row.perms ?? `menu:${row.menu_id}`,
        label: row.menu_name,
        type: TYPE_MAP[row.menu_type as keyof typeof TYPE_MAP] ?? 'page',
        path: row.path ?? undefined,
        icon: row.icon ?? undefined,
        sort: row.sort_order,
        status: row.status === 1 ? 1 : 0,
        createTime: formatDateTime(row.created_at),
      });
    }

    const tree: MenuNode[] = [];
    for (const row of rows) {
      const node = nodeMap.get(row.menu_id)!;
      const parent = row.parent_id === 0 ? null : nodeMap.get(row.parent_id);
      if (parent) {
        (parent.children ??= []).push(node);
      } else {
        tree.push(node); // 顶级节点；父节点异常缺失时同样挂到根，避免丢数据
      }
    }

    return { code: 200, message: 'success', data: tree };
  } catch (error) {
    console.error('查询菜单列表失败:', error);
    return { code: 500, message: '查询菜单列表失败', data: [] as MenuNode[] };
  }
});
