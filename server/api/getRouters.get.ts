// GET /api/getRouters —— RuoYi 规范：返回角色可见的菜单路由树（RouterVo）
// 结构：父级 component=Layout + 子级页面组件路径，供前端动态注册/侧边栏渲染
import { setupDatabase } from "~~/server/utils/database";
import type {
  GetRoutersResponse,
  RuoYiRoute,
} from "~~/types/user";

/** 页面级权限行中构建路由所需的最小字段 */
type PageRow = {
  perm_key: string;
  path: string;
  name: string;
  route_name: string | null;
  icon: string | null;
};

/** "/system/user" → "SystemUser"（RuoYi 路由 name 约定：大驼峰） */
function toRouteName(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

export default defineEventHandler(
  async (event): Promise<GetRoutersResponse> => {
    const authUser = event.context.user;
    if (!authUser) {
      throw createError({ statusCode: 401, message: "登录状态已过期" });
    }

    const { sql } = setupDatabase();

    // 用户与角色（校验逻辑置于 try 外，避免 createError 被吞成 500）
    const [userRow] = await sql`
      SELECT u.role_id, r.code AS role_key
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ${authUser.userId} AND u.deleted_at IS NULL
    `;
    if (!userRow) {
      throw createError({ statusCode: 401, message: "用户不存在" });
    }
    const isAdmin = userRow.role_key === "admin";

    try {
      // 角色拥有的权限键集合（超管全量可见）
      const ownedKeys = new Set<string>();
      if (!isAdmin && userRow.role_id) {
        const rows = await sql`
          SELECT perm_key FROM role_permissions WHERE role_id = ${userRow.role_id}
        `;
        for (const r of rows) ownedKeys.add(r.perm_key as string);
      }

      // 页面级权限（type=1 页面 / menu_visible=1 菜单展示 / status=1 启用）
      const pageRows = (await sql`
        SELECT perm_key, path, name, route_name, icon
        FROM permissions
        WHERE type = 1 AND menu_visible = 1 AND status = 1
        ORDER BY id ASC
      `) as PageRow[];
      const visiblePages = pageRows.filter((p) =>
        isAdmin ? true : ownedKeys.has(p.perm_key),
      );

      // 按一级路径分组 → Layout 父路由 + 子路由（RuoYi getRouters 结构）
      const groups = new Map<string, PageRow[]>();
      for (const page of visiblePages) {
        const basePath =
          "/" + (page.path.split("/").filter(Boolean)[0] ?? "");
        const list = groups.get(basePath);
        if (list) {
          list.push(page);
        } else {
          groups.set(basePath, [page]);
        }
      }

      const data: RuoYiRoute[] = [...groups.entries()].map(
        ([basePath, items]) => ({
          name: toRouteName(basePath),
          path: basePath,
          hidden: false,
          redirect: "noRedirect",
          component: "Layout",
          alwaysShow: true,
          meta: {
            title: items[0]?.route_name ?? basePath,
            icon: items[0]?.icon ?? null,
            noCache: false,
            link: null,
          },
          children: items.map((p) => ({
            name: toRouteName(p.path),
            path: p.path.slice(basePath.length + 1), // 相对父级的子路径
            hidden: false,
            component: p.path.replace(/^\//, "") + "/index", // "system/user/index"
            meta: {
              title: p.name,
              icon: p.icon ?? null,
              noCache: false,
              link: null,
            },
          })),
        }),
      );

      return { code: 200, msg: "操作成功", data };
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error;
      console.error("获取菜单路由失败:", error);
      throw createError({ statusCode: 500, message: "获取菜单路由失败" });
    }
  },
);
