import { setupDatabase } from '~~/server/utils/database';
import { requireAdmin } from '~~/server/utils/requireAdmin';
import type { ApiResponse } from '~~/types/common';
import type { PermissionRow } from '~~/types/permission';
import { PermissionType } from '~~/types/permission';

/**
 * 删除权限资源节点（目录/页面/按钮）
 * url: /api/admin/permissions/:id
 * method: DELETE（仅管理员）
 *
 * 级联规则:
 *   - 删除目录 → 递归删除其下全部子孙（子目录/页面/按钮）
 *   - 删除页面 → 同 path 的按钮一并删除（按钮归属靠 path 表达）
 *   - 删除按钮 → 只删自身
 *   被删权限在 role_permissions 中的角色映射由外键 ON DELETE CASCADE 清理
 * return: message 携带级联删除的子节点数量
 */
export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
  requireAdmin(event);

  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id) || id <= 0) {
    return { code: 400, message: '无效的权限ID', data: null };
  }

  const { sql } = setupDatabase();

  try {
    const existing = (await sql`
        SELECT id, type, path FROM permissions WHERE id = ${id}
      `) as unknown as PermissionRow[];
    const current = existing[0];
    if (!current) {
      return { code: 404, message: '权限节点不存在', data: null };
    }

    // 待删 id 集合：初始为自身
    const deleteIds = new Set<number>([id]);

    // 目录/页面：递归收集 parent_id 子树，并把子树页面下的按钮按 path 纳入
    if (Number(current.type) !== PermissionType.ACTION) {
      const all = (await sql`SELECT id, parent_id, type, path FROM permissions`) as unknown as {
        id: number | string;
        parent_id: number | string;
        type: number;
        path: string;
      }[];

      const childIdsByParent = new Map<number, number[]>();
      for (const row of all) {
        const pid = Number(row.parent_id) || 0;
        const list = childIdsByParent.get(pid) ?? [];
        list.push(Number(row.id));
        childIdsByParent.set(pid, list);
      }

      const pagePaths = new Set<string>();
      const stack = [id];
      while (stack.length) {
        const cur = stack.pop()!;
        deleteIds.add(cur);
        for (const childId of childIdsByParent.get(cur) ?? []) stack.push(childId);
        const node = all.find((n) => Number(n.id) === cur);
        if (node && Number(node.type) === PermissionType.PAGE) pagePaths.add(String(node.path));
      }

      // 按钮归属由 path 表达：子树页面下的按钮一并纳入删除集
      for (const row of all) {
        if (Number(row.type) === PermissionType.ACTION && pagePaths.has(String(row.path))) {
          deleteIds.add(Number(row.id));
        }
      }
    }

    let deleted = 0;
    for (const targetId of deleteIds) {
      const rows = (await sql`DELETE FROM permissions WHERE id = ${targetId} RETURNING id`) as unknown as {
        id: number | string;
      }[];
      deleted += rows.length;
    }

    const message = deleted > 1 ? `删除成功，并级联删除 ${deleted - 1} 个子节点` : '删除成功';
    return { code: 200, message, data: null };
  } catch (error) {
    console.error('删除权限失败:', error);
    return { code: 500, message: '删除权限失败', data: null };
  }
});
