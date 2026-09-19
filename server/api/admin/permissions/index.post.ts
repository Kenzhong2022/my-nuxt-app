import { setupDatabase } from '~~/server/utils/database';
import { requireAdmin } from '~~/server/utils/requireAdmin';
import {
  derivePermKey,
  isUniqueViolation,
  isValidButtonType,
  isValidPath,
  isValidPermissionCode,
  isValidRouteName,
  toPermissionResource,
} from '~~/server/utils/permission';
import type { ApiResponse } from '~~/types/common';
import type {
  CreatePermissionRequest,
  PermissionButtonType,
  PermissionResource,
  PermissionRow,
} from '~~/types/permission';
import { PermissionType } from '~~/types/permission';

/** 超管角色标识（新建菜单/权限自动分配给该角色） */
const ADMIN_ROLE = 'admin';

/**
 * 新增权限资源（目录/页面/按钮）
 * url: /api/admin/permissions
 * method: POST（仅管理员）
 *
 * 三级规则:
 *   目录(0) path 必填（分组前缀），perm_key = dir:{path}，parent_id 表达层级
 *   页面(1) path 必填（即路由路径），perm_key = page:{path}，parent_id 挂目录（0=根）
 *   按钮(2) path 必填（所属页面路径，需已存在）+ code 必填，perm_key = action:{path}:{code}
 * 自动授权: 新建成功后写入 role_permissions(role_id=admin)，超管显式持有该权限
 * return: 创建后的权限资源
 */
export default defineEventHandler(async (event): Promise<ApiResponse<PermissionResource | null>> => {
  requireAdmin(event);

  const body = await readBody<CreatePermissionRequest>(event);
  const type = Number(body.type);
  const label = String(body.label ?? '').trim();
  const path = String(body.path ?? '').trim();

  // ---------- 基础字段校验 ----------
  if (type !== 0 && type !== 1 && type !== 2) {
    return { code: 400, message: '无效的权限类型（0=目录 1=页面 2=按钮）', data: null };
  }
  if (!label) {
    return { code: 400, message: '名称不能为空', data: null };
  }
  if (!path || !isValidPath(path)) {
    return {
      code: 400,
      message: '路由路径格式无效：需 / 开头，段为小写字母/数字/:参数/-/_',
      data: null,
    };
  }

  const { sql } = setupDatabase();

  let code = '';
  let routeName: string | null = null;
  let buttonType: PermissionButtonType | null = null;
  // 层级父节点 id（0=根）；按钮行归属由 path 表达，parent_id 恒为 0
  let parentId = Number.isInteger(Number(body.parentId)) && Number(body.parentId) > 0 ? Number(body.parentId) : 0;

  if (type === PermissionType.ACTION) {
    // ---------- 按钮级：path 须指向已存在的页面 ----------
    parentId = 0;
    code = String(body.code ?? '')
      .trim()
      .toLowerCase();
    if (!isValidPermissionCode(code)) {
      return {
        code: 400,
        message: '操作标识格式无效：需小写字母开头，仅含小写字母/数字',
        data: null,
      };
    }

    const rawButtonType = String(body.buttonType ?? 'default');
    if (!isValidButtonType(rawButtonType)) {
      return {
        code: 400,
        message: '按钮样式无效：default/primary/success/warning/danger/info',
        data: null,
      };
    }
    buttonType = rawButtonType;

    const parents = (await sql`
        SELECT path FROM permissions
        WHERE path = ${path} AND type = ${PermissionType.PAGE}
      `) as unknown as { path: string }[];
    if (!parents[0]) {
      return { code: 400, message: '所属页面不存在', data: null };
    }
  } else {
    // ---------- 目录/页面级：路由元数据 + 父节点校验 ----------
    routeName = String(body.routeName ?? '').trim() || null;
    if (routeName && !isValidRouteName(routeName)) {
      return {
        code: 400,
        message: '路由名称格式无效：需字母开头，仅含字母/数字/-/_',
        data: null,
      };
    }
    if (parentId) {
      const valid = (await sql`
          SELECT id FROM permissions WHERE id = ${parentId} AND type = ${PermissionType.DIRECTORY}
        `) as unknown as { id: number }[];
      if (!valid[0]) {
        return { code: 400, message: '上级目录不存在（页面/目录的上级须为目录或根）', data: null };
      }
    }
  }

  const permKey = derivePermKey(type, path, code);
  const icon = String(body.icon ?? '').trim() || null;
  const description = String(body.description ?? '').trim() || null;
  const menuVisible = body.menuVisible === false ? 0 : 1;
  const sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
  const status = [0, 1].includes(Number(body.status)) ? Number(body.status) : 1;

  try {
    const rows = (await sql`
        INSERT INTO permissions (
          perm_key, type, path, label,
          route_name, menu_visible, icon, button_type,
          sort_order, parent_id, status, description
        ) VALUES (
          ${permKey}, ${type}, ${path}, ${label},
          ${routeName}, ${menuVisible}, ${icon}, ${buttonType},
          ${sortOrder}, ${parentId}, ${status}, ${description}
        )
        RETURNING id, perm_key, type, path, label,
                  route_name, menu_visible, icon, button_type,
                  sort_order, parent_id, status, description, created_at, updated_at
      `) as unknown as PermissionRow[];
    if (!rows[0]) {
      return { code: 500, message: '创建权限失败', data: null };
    }

    // ---------- 自动分配给超管（role_permissions；admin 在 getRouters 已特判全量，此处显式落库供角色页可见） ----------
    await sql`
        INSERT INTO role_permissions (role_id, perm_key)
        SELECT id, ${permKey} FROM roles WHERE code = ${ADMIN_ROLE}
        ON CONFLICT (role_id, perm_key) DO NOTHING
      `;

    return { code: 200, message: '创建成功', data: toPermissionResource(rows[0]) };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        code: 409,
        message: '权限键已存在（路径重复或页面下已有同名操作）',
        data: null,
      };
    }
    console.error('创建权限失败:', error);
    return { code: 500, message: '创建权限失败', data: null };
  }
});
