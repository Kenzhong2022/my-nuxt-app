import type {
  PermissionButtonType,
  PermissionRow,
  PermissionResource,
} from "~~/types/permission";
import { PermissionType } from "~~/types/permission";
import { toCamelCase } from "./caseConvert";

/** 按钮标识段（code）合法格式：小写字母开头，仅含小写字母/数字 */
const CODE_PATTERN = /^[a-z][a-z0-9]*$/;

/** 路由 path 合法格式：/ 开头，段为小写字母/数字（支持 :param 动态段） */
const PATH_PATTERN = /^\/[a-z0-9:_-]*(\/[a-z0-9:_-]+)*$/;

/** 路由 name 合法格式：字母开头，仅含字母/数字/-/_ */
const ROUTE_NAME_PATTERN = /^[a-zA-Z][\w-]*$/;

/** el-button type 合法值（与表 CHECK 约束一致） */
const BUTTON_TYPES: readonly PermissionButtonType[] = [
  "default",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
  "",
  "text",
];

/**
 * permissions 数据库行 → 前端 PermissionResource 类型
 * 键名转换交给通用 toCamelCase，这里只处理 bigint 数值化与布尔化
 */
export function toPermissionResource(row: PermissionRow): PermissionResource {
  const { id, menuVisible, type, ...rest } = toCamelCase(row);

  return {
    ...rest,
    id: Number(id),
    type: type as PermissionType,
    menuVisible: menuVisible === 1,
  };
}

/**
 * 平铺行集合 → 页面数组（按钮按 path 归组挂到同路径页面 children）
 * 同级顺序由调用方 SQL 排序决定
 */
export function buildPageList(
  rows: PermissionRow[],
): PermissionResource[] {
  const pages = new Map<string, PermissionResource>();

  for (const row of rows) {
    if (Number(row.type) === PermissionType.PAGE) {
      const node = toPermissionResource(row);
      node.children = [];
      pages.set(row.path, node);
    }
  }

  for (const row of rows) {
    if (Number(row.type) === PermissionType.ACTION) {
      const parent = pages.get(row.path);
      if (parent) {
        parent.children!.push(toPermissionResource(row));
      }
    }
  }

  return [...pages.values()];
}

/** 校验按钮标识段（code）：小写字母开头，仅含小写字母/数字 */
export function isValidPermissionCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/** 校验路由 path：/ 开头，段为小写字母/数字/:param/-/_ */
export function isValidPath(path: string): boolean {
  return PATH_PATTERN.test(path);
}

/** 校验路由 name：字母开头，仅含字母/数字/-/_ */
export function isValidRouteName(name: string): boolean {
  return ROUTE_NAME_PATTERN.test(name);
}

/** 校验 el-button type 取值 */
export function isValidButtonType(t: string): t is PermissionButtonType {
  return (BUTTON_TYPES as readonly string[]).includes(t);
}

/** 拼接权限键：页面 page:{path}，按钮 action:{path}:{code} */
export function derivePermKey(
  type: PermissionType,
  path: string,
  code: string,
): string {
  return type === PermissionType.PAGE
    ? `page:${path}`
    : `action:${path}:${code}`;
}

/** 判断 PostgreSQL 错误是否为唯一约束冲突（perm_key / 页面 path 唯一索引） */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
