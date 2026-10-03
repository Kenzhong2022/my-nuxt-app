import { setupDatabase } from '~~/server/utils/database';
import { requireAdmin } from '~~/server/utils/requireAdmin';
import {
  isUniqueViolation,
} from '~~/server/utils/permission';
import {
  isValidClientId,
  isValidRedirectUri,
  normalizeRedirectUris,
  toOauthClient,
} from '~~/server/utils/oauthClient';
import type { ApiResponse } from '~~/types/common';
import type {
  CreateOauthClientRequest,
  OauthClient,
  OauthClientRow,
} from '~~/types/oauthClient';

/**
 * 新增 SSO 客户端（单点登录白名单应用）
 * url: /api/admin/oauth-clients
 * method: POST（仅管理员）
 *
 * 校验：client_id 格式且唯一（409）、client_name 非空、redirect_uris 至少一条且均为 http(s) URL
 */
export default defineEventHandler(async (event): Promise<ApiResponse<OauthClient | null>> => {
  requireAdmin(event);

  const body = await readBody<CreateOauthClientRequest>(event);
  const clientId = String(body.clientId ?? '').trim();
  const clientSecret = String(body.clientSecret ?? '').trim();
  const clientName = String(body.clientName ?? '').trim();
  const redirectUris = normalizeRedirectUris(body.redirectUris);

  // ---------- 基础字段校验 ----------
  if (!isValidClientId(clientId)) {
    return {
      code: 400,
      message: 'client_id 格式无效：字母/数字开头，仅含字母/数字/-/_，长度 2-64',
      data: null,
    };
  }
  if (!clientSecret) {
    return { code: 400, message: 'client_secret 不能为空', data: null };
  }
  if (!clientName) {
    return { code: 400, message: '应用名称不能为空', data: null };
  }
  if (redirectUris.length === 0) {
    return { code: 400, message: '回调地址至少填写一条', data: null };
  }
  const invalidUri = redirectUris.find((uri) => !isValidRedirectUri(uri));
  if (invalidUri) {
    return { code: 400, message: `回调地址格式无效（需 http/https 绝对地址）：${invalidUri}`, data: null };
  }

  const { sql } = setupDatabase();
  const enabled = body.enabled !== false;

  try {
    const rows = (await sql`
      INSERT INTO oauth_clients (
        client_id, client_secret, client_name, redirect_uris, enabled
      ) VALUES (
        ${clientId}, ${clientSecret}, ${clientName}, ${redirectUris}, ${enabled}
      )
      RETURNING client_id, client_secret, client_name,
                redirect_uris, enabled, created_at, updated_at
    `) as unknown as OauthClientRow[];

    if (!rows[0]) {
      return { code: 500, message: '创建 SSO 客户端失败', data: null };
    }
    return { code: 200, message: '创建成功', data: toOauthClient(rows[0]) };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { code: 409, message: 'client_id 已存在', data: null };
    }
    console.error('创建 SSO 客户端失败:', error);
    return { code: 500, message: '创建 SSO 客户端失败', data: null };
  }
});
