/**
 * ============================================================
 * 用户相关类型定义
 * ============================================================
 */

import type { RoleCode } from "./role";

/** 用户状态枚举 */
export enum UserStatus {
  DISABLED = 0,
  ACTIVE = 1,
}

/** 用户实体（数据库行映射） */
export interface User {
  id: number;
  uuid: string;
  email: string | null;
  phone: string | null;
  password_hash: string;
  nickname: string | null;
  avatar: string | null;
  status: UserStatus;
  last_login_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 用户列表返回项（不含敏感字段） */
export type UserListItem = Pick<
  User,
  | "id"
  | "uuid"
  | "email"
  | "phone"
  | "nickname"
  | "avatar"
  | "status"
  | "last_login_at"
  | "created_at"
  | "updated_at"
> & {
  role_id: number | null;
  role_name: string | null;
  role_code: RoleCode | null;
};

/** 用户列表响应 */
export interface UserListResponse {
  code: number;
  message: string;
  total: number;
  data: UserListItem[];
}

/**
 * ============================================================
 * 当前登录用户（RuoYi 规范）
 *  - GET /api/getInfo    → { code, msg, permissions, roles, user }
 *  - GET /api/getRouters → { code, msg, data: RuoYiRoute[] }
 * ============================================================
 */

/** 角色信息（RuoYi SysRole 子集；roleKey 对应本库 roles.code） */
export interface SysRole {
  roleId: number | null;
  roleName: string | null;
  roleKey: string | null;
}

/** 当前用户（RuoYi SysUser 子集；userName 取 email ?? phone 作为登录名） */
export interface SysUser {
  userId: number;
  userName: string | null;
  nickName: string | null;
  email: string | null;
  phonenumber: string | null;
  avatar: string | null;
  /** 是否超级管理员（roleKey === 'admin'） */
  admin: boolean;
  roles: SysRole[];
}

/** GET /api/getInfo 响应 */
export interface GetInfoResponse {
  code: number;
  msg: string;
  /** 权限标识数组（"模块:实体:操作"，超管为 ["*:*:*"]） */
  permissions: string[];
  /** 角色权限串数组（roleKey，如 ["admin"]） */
  roles: string[];
  user: SysUser;
}

/** 路由元信息（RuoYi MetaVo） */
export interface RuoYiRouteMeta {
  title: string;
  icon: string | null;
  noCache: boolean;
  link: string | null;
}

/** 菜单路由节点（RuoYi RouterVo；父级 component 为 Layout，子级为页面组件路径） */
export interface RuoYiRoute {
  /** 路由名称（大驼峰，如 SystemUser） */
  name: string;
  /** 路由地址（父级如 /system，子级为相对父级的路径如 user） */
  path: string;
  /** 是否隐藏（true 不在侧边栏显示） */
  hidden: boolean;
  /** 重定向地址（父级目录为 "noRedirect"） */
  redirect?: string;
  /** 组件路径：父级为 "Layout"，子级为 "system/user/index" 形式 */
  component: string;
  /** 始终显示（单子路由时父级是否仍作为目录展示） */
  alwaysShow?: boolean;
  /** 路由元信息 */
  meta: RuoYiRouteMeta;
  /** 子路由 */
  children?: RuoYiRoute[];
}

/** GET /api/getRouters 响应 */
export interface GetRoutersResponse {
  code: number;
  msg: string;
  data: RuoYiRoute[];
}
