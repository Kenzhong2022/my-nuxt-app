import type { PermissionId } from "./permission";

/** 角色状态 */
export enum RoleStatus {
  DISABLED = 0,
  ACTIVE = 1,
}

/** 角色编码枚举 */
export enum RoleCode {
  /** 超级管理员 */
  ADMIN = "admin",
  /** 运营人员 */
  OPERATOR = "operator",
  /** 访客 */
  GUEST = "guest",
}

/** 角色实体 */
export interface Role {
  id: number;
  name: string;
  code: RoleCode;
  description: string | null;
  status: RoleStatus;
  created_at: string;
  updated_at: string;
}

/** 角色列表项（含权限 ID 列表） */
export interface RoleWithPermissions extends Role {
  permissions: PermissionId[];
}

/** 角色列表响应 */
export interface RoleListResponse {
  code: number;
  message: string;
  data: RoleWithPermissions[];
}

/** 角色权限更新请求 */
export interface UpdateRolePermissionsRequest {
  permissions: PermissionId[];
}

/** 角色权限更新响应 */
export interface UpdateRolePermissionsResponse {
  code: number;
  message: string;
}
