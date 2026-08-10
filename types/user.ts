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
