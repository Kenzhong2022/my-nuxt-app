import { setupDatabase } from '~~/server/utils/database';
import { requireAdmin } from '~~/server/utils/requireAdmin';
import {
  derivePermKey,
  isUniqueViolation,
  isValidButtonType,
  isValidPath,
  isValidRouteName,
  toPermissionResource,
} from '~~/server/utils/permission';
import type { ApiResponse } from '~~/types/common';
import type { PermissionResource, PermissionRow, UpdatePermissionRequest } from '~~/types/permission';
import { PermissionType } from '~~/types/permission';

/**
 * 更新权限资源的可编辑字段（名称/路由地址/路由元数据/排序/层级/状态等）
 * url: /api/admin/permissions/:id
 * method: PUT（仅管理员）
 *
 * 注意: type 不可变更（身份键，调整请删除重建）；
 *       path 可变更（目录/页面级）：级联更新自身 perm_key、下属按钮的 path 与 perm_key、
 *       以及 role_permissions 中对旧 perm_key 的引用；
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

    // ---------- 路由地址变更（目录/页面级）：校验并派生新 perm_key ----------
    let finalPath = current.path;
    let finalPermKey = current.perm_key;
    if (!isAction && body.path !== undefined) {
      const newPath = String(body.path).trim();
      if (newPath !== current.path) {
        if (!newPath || !isValidPath(newPath)) {
          return {
            code: 400,
            message: '路由路径格式无效：需 / 开头，段为小写字母/数字/:参数/-/_',
            data: null,
          };
        }
        finalPath = newPath;
        // perm_key 由 path 派生：页面 page:{path}，目录 dir:{path}（按钮无 path 概念，走不到这）
        finalPermKey = derivePermKey(currentType, newPath, '');
      }
    }

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

    // ---------- 页面 path 变更前置处理 ----------
    // role_permissions.perm_key 有外键指向 permissions.perm_key，主 UPDATE 改键前必须先清掉旧引用：
    // 记录授权角色 → 删子表旧键（页面键 + 下属按钮键），新键在主 UPDATE 后回插
    const pathChanged = finalPath !== current.path && currentType === PermissionType.PAGE;
    let pageGrants: { role_id: number }[] = [];
    let actionGrants: { role_id: number; perm_key: string }[] = [];
    if (pathChanged) {
      const oldPath = current.path;
      // 记录页面键与下属按钮旧键的授权角色（按钮逐键查询，neon 模板不支持 IN 列表展开）
      pageGrants = (await sql`
          SELECT role_id FROM role_permissions WHERE perm_key = ${current.perm_key}
        `) as unknown as { role_id: number }[];
      const actionKeys = (await sql`
          SELECT perm_key FROM permissions
          WHERE type = ${PermissionType.ACTION} AND path = ${oldPath}
        `) as unknown as { perm_key: string }[];
      for (const { perm_key } of actionKeys) {
        const grants = (await sql`
            SELECT role_id FROM role_permissions WHERE perm_key = ${perm_key}
          `) as unknown as { role_id: number }[];
        for (const { role_id } of grants) actionGrants.push({ role_id, perm_key });
      }

      // 删除旧键引用（先删子表，才能改父表键）
      await sql`DELETE FROM role_permissions WHERE perm_key = ${current.perm_key}`;
      for (const { perm_key } of actionKeys) {
        await sql`DELETE FROM role_permissions WHERE perm_key = ${perm_key}`;
      }
    }

    const rows = (await sql`
        UPDATE permissions
        SET label = ${label},
            path = ${finalPath},
            perm_key = ${finalPermKey},
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

    // ---------- 页面 path 变更后置处理：更新下属按钮 + 按新键回插角色授权 ----------
    if (pathChanged) {
      const oldPath = current.path;

      // 按钮行：path 指向新页面路径，perm_key = action:{newPath}:{code}（code 取旧键末段）
      await sql`
          UPDATE permissions
          SET path = ${finalPath},
              perm_key = 'action:' || ${finalPath} || ':' || split_part(perm_key, ':', 3),
              updated_at = NOW()
          WHERE type = ${PermissionType.ACTION} AND path = ${oldPath}
        `;

      // 回插角色授权（页面键 + 按钮键）
      for (const { role_id } of pageGrants) {
        await sql`
            INSERT INTO role_permissions (role_id, perm_key)
            VALUES (${role_id}, ${finalPermKey})
            ON CONFLICT (role_id, perm_key) DO NOTHING
          `;
      }
      for (const { role_id, perm_key } of actionGrants) {
        const newKey = `action:${finalPath}:${perm_key.split(':')[2] ?? ''}`;
        await sql`
            INSERT INTO role_permissions (role_id, perm_key)
            VALUES (${role_id}, ${newKey})
            ON CONFLICT (role_id, perm_key) DO NOTHING
          `;
      }
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
