// GET /api/public/menus/list —— 菜单管理列表：返回 permissions 全量树（含禁用项，供后台管理页筛选）
// 数据源：permissions 表（type 0=目录 / 1=页面 / 2=按钮；menus 表已废弃）
import { setupDatabase } from '~~/server/utils/database';

/** 权限类型映射：0 目录 / 1 页面 / 2 按钮 */
const TYPE_MAP: Record<number, 'module' | 'page' | 'action'> = {
  0: 'module',
  1: 'page',
  2: 'action',
};

/** permissions 表行中列表所需的字段 */
type PermRow = {
  id: number;
  parent_id: number;
  perm_key: string;
  label: string;
  path: string | null;
  icon: string | null;
  type: number;
  sort_order: number;
  status: number;
  created_at: Date | string;
};

/** 前端菜单节点 */
interface MenuNode {
  /** 权限标识（page:/xxx、action:/xxx:code、dir:/xxx） */
  id: string;
  /** permissions 表主键（供 CRUD 定位） */
  dbId: number;
  label: string;
  type: 'module' | 'page' | 'action';
  /** 路由地址（目录/菜单；按钮=所属页面） */
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
      SELECT id, parent_id, perm_key, label, path, icon, type, sort_order, status, created_at
      FROM permissions
      ORDER BY sort_order ASC, id ASC
    `) as unknown as PermRow[];

    // 两遍循环建树：先建 Map 再按 parent_id 挂接；按钮(type=2)按 path 归到同路径页面下
    const nodeMap = new Map<number, MenuNode>();
    const pageByPath = new Map<string, MenuNode>();
    for (const row of rows) {
      const node: MenuNode = {
        id: row.perm_key,
        dbId: row.id,
        label: row.label,
        type: TYPE_MAP[row.type] ?? 'page',
        path: row.path ?? undefined,
        icon: row.icon ?? undefined,
        sort: row.sort_order,
        status: row.status === 1 ? 1 : 0,
        createTime: formatDateTime(row.created_at),
      };
      nodeMap.set(row.id, node);
      if (row.type === 1 && row.path) pageByPath.set(row.path, node);
    }

    const tree: MenuNode[] = [];
    for (const row of rows) {
      const node = nodeMap.get(row.id)!;
      // 按钮挂所属页面；目录/页面按 parent_id 挂接
      const parent =
        row.type === 2
          ? pageByPath.get(row.path ?? '')
          : row.parent_id === 0
            ? null
            : nodeMap.get(row.parent_id);
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
