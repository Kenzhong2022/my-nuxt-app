import { setupDatabase } from "~~/server/utils/database";
import { requireAdmin } from "~~/server/utils/requireAdmin";
import {
  derivePermKey,
  isUniqueViolation,
  isValidButtonType,
  isValidPath,
  isValidPermissionCode,
  isValidRouteName,
  toPermissionResource,
} from "~~/server/utils/permission";
import type { ApiResponse } from "~~/types/common";
import type {
  CreatePermissionRequest,
  PermissionButtonType,
  PermissionResource,
  PermissionRow,
} from "~~/types/permission";
import { PermissionType } from "~~/types/permission";

/**
 * 新增权限资源（页面/按钮）
 * url: /api/admin/permissions
 * method: POST（仅管理员）
 *
 * 两级规则:
 *   页面(1) path 必填（即路由路径），perm_key = page:{path}
 *   按钮(2) path 必填（所属页面路径，需已存在）+ code 必填（操作动词），
 *           perm_key = action:{path}:{code}，可带 button_type（el-button type）
 * return: 创建后的权限资源
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<PermissionResource | null>> => {
    requireAdmin(event);

    const body = await readBody<CreatePermissionRequest>(event);
    const type = Number(body.type);
    const name = String(body.name ?? "").trim();
    const path = String(body.path ?? "").trim();

    // ---------- 基础字段校验 ----------
    if (type !== 1 && type !== 2) {
      return { code: 400, message: "无效的权限类型（1=页面 2=按钮）", data: null };
    }
    if (!name) {
      return { code: 400, message: "名称不能为空", data: null };
    }
    if (!path || !isValidPath(path)) {
      return {
        code: 400,
        message: "路由路径格式无效：需 / 开头，段为小写字母/数字/:参数/-/_",
        data: null,
      };
    }

    const { sql } = setupDatabase();

    let code = "";
    let routeName: string | null = null;
    let buttonType: PermissionButtonType | null = null;

    if (type === PermissionType.PAGE) {
      // ---------- 页面级：path 即身份 ----------
      routeName = String(body.routeName ?? "").trim() || null;
      if (routeName && !isValidRouteName(routeName)) {
        return {
          code: 400,
          message: "路由名称格式无效：需字母开头，仅含字母/数字/-/_",
          data: null,
        };
      }
    } else {
      // ---------- 按钮级：path 须指向已存在的页面 ----------
      code = String(body.code ?? "").trim().toLowerCase();
      if (!isValidPermissionCode(code)) {
        return {
          code: 400,
          message: "操作标识格式无效：需小写字母开头，仅含小写字母/数字",
          data: null,
        };
      }

      const rawButtonType = String(body.buttonType ?? "default");
      if (!isValidButtonType(rawButtonType)) {
        return {
          code: 400,
          message:
            "按钮样式无效：default/primary/success/warning/danger/info",
          data: null,
        };
      }
      buttonType = rawButtonType;

      const parents = (await sql`
        SELECT path FROM permissions
        WHERE path = ${path} AND type = ${PermissionType.PAGE}
      `) as unknown as { path: string }[];
      if (!parents[0]) {
        return { code: 400, message: "所属页面不存在", data: null };
      }
    }

    const permKey = derivePermKey(type, path, code);
    const icon = String(body.icon ?? "").trim() || null;
    const description = String(body.description ?? "").trim() || null;
    const menuVisible = body.menuVisible === false ? 0 : 1;
    const status = [0, 1].includes(Number(body.status)) ? Number(body.status) : 1;

    try {
      const rows = (await sql`
        INSERT INTO permissions (
          perm_key, type, path, name,
          route_name, menu_visible, icon, button_type,
          status, description
        ) VALUES (
          ${permKey}, ${type}, ${path}, ${name},
          ${routeName}, ${menuVisible}, ${icon}, ${buttonType},
          ${status}, ${description}
        )
        RETURNING id, perm_key, type, path, name,
                  route_name, menu_visible, icon, button_type,
                  status, description, created_at, updated_at
      `) as unknown as PermissionRow[];

      return { code: 200, message: "创建成功", data: toPermissionResource(rows[0]) };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return {
          code: 409,
          message: "权限键已存在（页面路径重复或页面下已有同名操作）",
          data: null,
        };
      }
      console.error("创建权限失败:", error);
      return { code: 500, message: "创建权限失败", data: null };
    }
  },
);
