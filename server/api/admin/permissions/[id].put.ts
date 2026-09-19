import { setupDatabase } from '~~/server/utils/database';
import { requireAdmin } from '~~/server/utils/requireAdmin';
import {
  isUniqueViolation,
  isValidButtonType,
  isValidRouteName,
  toPermissionResource,
} from '~~/server/utils/permission';
import type { ApiResponse } from '~~/types/common';
import type { PermissionResource, PermissionRow, UpdatePermissionRequest } from '~~/types/permission';
import { PermissionType } from '~~/types/permission';

/**
 * 更新权限资源的可编辑字段（名称/路由元数据/排序/层级/状态等）
 * url: /api/admin/permissions/:id
 * method: PUT（仅管理员）
 *
 * 注意: type/path 不可变更（权限身份键，调整请删除重建）；
 *       route_name/menu_visible/icon/sort_order/parent_id 仅目录/页面级有意义，
 *       button_type 仅按钮级有意义；parent_id 仅接受目录或 0（根）
 * return: 更新后的权限资源
 */
export default defineEventHandler(async (event): Promise<ApiResponse<PermissionResource | null>> => {
  requireAdmin(event);

  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id) || id <= 0) {
    return { code: 400, message: '无效的权限ID', data: null };
  }

  const body = await readBody<UpdatePermissionRequest>(event);
  const label = String(body.label ?? '').trim();
  if (!label) {
    return { code: 400, message: '名称不能为空', data: null };
  }

  const { sql } = setupDatabase();

  try {
    const existing = (await sql`
        SELECT * FROM permissions WHERE id = ${id}
      `) as unknown as PermissionRow[];
    const current = existing[0];
    if (!current) {
      return { code: 404, message: '权限节点不存在', data: null };
    }

    const currentType = Number(current.type);
    const isAction = currentType === PermissionType.ACTION;

    // 路由元数据仅目录/页面级可填
    let routeName: string | null;
    let menuVisible: number;
    let sortOrder: number;
    let parentId: number;
    if (!isAction) {
      // routeName 未提供时保留原值（菜单表单不含该字段，避免编辑清空路由注册名）
      if (body.routeName === undefined) {
        routeName = current.route_name ?? null;
      } else {
        routeName = String(body.routeName).trim() || null;
        if (routeName && !isValidRouteName(routeName)) {
          return {
            code: 400,
            message: '路由名称格式无效：需字母开头，仅含字母/数字/-/_',
            data: null,
          };
        }
      }
      menuVisible = body.menuVisible === false ? 0 : 1;
      sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : Number(current.sort_order) || 0;
      // parentId 未提供时保留原层级（编辑不改上级）；提供时按 0=根 / >0 目录处理
      parentId =
        body.parentId === undefined
          ? Number(current.parent_id) || 0
          : Number.isInteger(Number(body.parentId)) && Number(body.parentId) > 0
            ? Number(body.parentId)
            : 0;
      // 层级校验：上级须为目录（或根 0），且不能是自己
      if (parentId) {
        if (parentId === id) {
          return { code: 400, message: '上级目录不能是自己', data: null };
        }
        const valid = (await sql`
            SELECT id FROM permissions WHERE id = ${parentId} AND type = ${PermissionType.DIRECTORY}
          `) as unknown as { id: number }[];
        if (!valid[0]) {
          return { code: 400, message: '上级目录不存在（页面/目录的上级须为目录或根）', data: null };
        }
      }
    } else {
      // 按钮：元数据字段保持原值（归属由 path 表达）
      menuVisible = Number(current.menu_visible);
      sortOrder = Number(current.sort_order) || 0;
      parentId = 0;
      // 按钮：元数据字段保持原值（归属由 path 表达）
      routeName = current.route_name ?? null;
    }

    // 按钮样式仅按钮级可填；未提供时保留原值
    let buttonType: string | null = null;
    if (isAction) {
      buttonType = body.buttonType === undefined ? (current.button_type ?? 'default') : String(body.buttonType);
      if (!isValidButtonType(buttonType)) {
        return {
          code: 400,
          message: '按钮样式无效：default/primary/success/warning/danger/info',
          data: null,
        };
      }
    }

    const icon = String(body.icon ?? '').trim() || null;
    const description =
      body.description === undefined ? (current.description ?? null) : String(body.description).trim() || null;
    const status = [0, 1].includes(Number(body.status)) ? Number(body.status) : Number(current.status);

    const rows = (await sql`
        UPDATE permissions
        SET label = ${label},
            route_name = ${routeName},
            menu_visible = ${menuVisible},
            icon = ${icon},
            button_type = ${buttonType},
            sort_order = ${sortOrder},
            parent_id = ${parentId},
            status = ${status},
            description = ${description},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, perm_key, type, path, label,
                  route_name, menu_visible, icon, button_type,
                  sort_order, parent_id, status, description, created_at, updated_at
      `) as unknown as PermissionRow[];
    if (rows.length === 0 || !rows[0]) {
      return { code: 404, message: '权限节点不存在', data: null };
    }

    return { code: 200, message: '更新成功', data: toPermissionResource(rows[0]) };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { code: 409, message: '权限键冲突', data: null };
    }
    console.error('更新权限失败:', error);
    return { code: 500, message: '更新权限失败', data: null };
  }
});
