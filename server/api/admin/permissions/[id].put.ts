import { setupDatabase } from "~~/server/utils/database";
import { requireAdmin } from "~~/server/utils/requireAdmin";
import {
  isUniqueViolation,
  isValidButtonType,
  isValidRouteName,
  toPermissionResource,
} from "~~/server/utils/permission";
import type { ApiResponse } from "~~/types/common";
import type {
  PermissionResource,
  PermissionRow,
  UpdatePermissionRequest,
} from "~~/types/permission";
import { PermissionType } from "~~/types/permission";

/**
 * 更新权限资源的可编辑字段（名称/路由元数据/样式/状态等）
 * url: /api/admin/permissions/:id
 * method: PUT（仅管理员）
 *
 * 注意: type/path 不可变更（权限身份键，调整请删除重建）；
 *       route_name/menu_visible/icon 仅页面级有意义，button_type 仅按钮级有意义
 * return: 更新后的权限资源
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<PermissionResource | null>> => {
    requireAdmin(event);

    const id = Number(getRouterParam(event, "id"));
    if (!Number.isInteger(id) || id <= 0) {
      return { code: 400, message: "无效的权限ID", data: null };
    }

    const body = await readBody<UpdatePermissionRequest>(event);
    const name = String(body.name ?? "").trim();
    if (!name) {
      return { code: 400, message: "名称不能为空", data: null };
    }

    const { sql } = setupDatabase();

    try {
      const existing = (await sql`
        SELECT * FROM permissions WHERE id = ${id}
      `) as unknown as PermissionRow[];
      const current = existing[0];
      if (!current) {
        return { code: 404, message: "权限节点不存在", data: null };
      }

      const isPage = Number(current.type) === PermissionType.PAGE;

      // 路由元数据仅页面级可填
      let routeName: string | null = null;
      if (isPage) {
        routeName = String(body.routeName ?? "").trim() || null;
        if (routeName && !isValidRouteName(routeName)) {
          return {
            code: 400,
            message: "路由名称格式无效：需字母开头，仅含字母/数字/-/_",
            data: null,
          };
        }
      }

      // 按钮样式仅按钮级可填
      let buttonType: string | null = null;
      if (!isPage) {
        buttonType = String(body.buttonType ?? "default");
        if (!isValidButtonType(buttonType)) {
          return {
            code: 400,
            message: "按钮样式无效：default/primary/success/warning/danger/info",
            data: null,
          };
        }
      }

      const icon = String(body.icon ?? "").trim() || null;
      const description = String(body.description ?? "").trim() || null;
      const menuVisible = body.menuVisible === false ? 0 : 1;
      const status = [0, 1].includes(Number(body.status))
        ? Number(body.status)
        : Number(current.status);

      const rows = (await sql`
        UPDATE permissions
        SET name = ${name},
            route_name = ${routeName},
            menu_visible = ${menuVisible},
            icon = ${icon},
            button_type = ${buttonType},
            status = ${status},
            description = ${description},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, perm_key, type, path, name,
                  route_name, menu_visible, icon, button_type,
                  status, description, created_at, updated_at
      `) as unknown as PermissionRow[];
      if (rows.length === 0 || !rows[0]) {
        return { code: 404, message: "权限节点不存在", data: null };
      }

      return { code: 200, message: "更新成功", data: toPermissionResource(rows[0]) };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { code: 409, message: "权限键冲突", data: null };
      }
      console.error("更新权限失败:", error);
      return { code: 500, message: "更新权限失败", data: null };
    }
  },
);
