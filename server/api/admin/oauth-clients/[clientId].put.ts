import { getRouterParam, createError } from 'h3';
import { setupDatabase } from '~~/server/utils/database';
import { requireAdmin } from '~~/server/utils/requireAdmin';
import {
  isValidRedirectUri,
  normalizeRedirectUris,
  toOauthClient,
} from '~~/server/utils/oauthClient';
import type { ApiResponse } from '~~/types/common';
import type {
  UpdateOauthClientRequest,
  OauthClient,
  OauthClientRow,
} from '~~/types/oauthClient';

/**
 * 更新 SSO 客户端（client_id 为身份键不可改；client_secret 留空 = 不修改）
 * url: /api/admin/oauth-clients/:clientId
 * method: PUT（仅管理员）
 */
export default defineEventHandler(async (event): Promise<ApiResponse<OauthClient | null>> => {
  requireAdmin(event);

  const clientId = decodeURIComponent(getRouterParam(event, 'clientId') ?? '');
  if (!clientId) {
    throw createError({ statusCode: 400, message: '缺少 client_id' });
  }

  const body = await readBody<UpdateOauthClientRequest>(event);
  const clientSecret = String(body.clientSecret ?? '').trim();
  const clientName = String(body.clientName ?? '').trim();
  const redirectUris = normalizeRedirectUris(body.redirectUris);

  // ---------- 基础字段校验 ----------
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
  if (clientSecret && clientSecret.length < 8) {
    return { code: 400, message: 'client_secret 长度不能少于 8 位', data: null };
  }

  const { sql } = setupDatabase();
  const enabled = body.enabled !== false;

  try {
    // client_secret 留空则不更新该列（保持原密钥）
    const rows = (
      clientSecret
        ? await sql`
            UPDATE oauth_clients
            SET client_name = ${clientName},
                client_secret = ${clientSecret},
                redirect_uris = ${redirectUris},
                enabled = ${enabled},
                updated_at = now()
            WHERE client_id = ${clientId}
            RETURNING client_id, client_secret, client_name,
                      redirect_uris, enabled, created_at, updated_at
          `
        : await sql`
            UPDATE oauth_clients
            SET client_name = ${clientName},
                redirect_uris = ${redirectUris},
                enabled = ${enabled},
                updated_at = now()
            WHERE client_id = ${clientId}
            RETURNING client_id, client_secret, client_name,
                      redirect_uris, enabled, created_at, updated_at
          `
    ) as unknown as OauthClientRow[];

    if (!rows[0]) {
      return { code: 404, message: 'SSO 客户端不存在', data: null };
    }
    return { code: 200, message: '保存成功', data: toOauthClient(rows[0]) };
  } catch (error) {
    console.error('更新 SSO 客户端失败:', error);
    return { code: 500, message: '更新 SSO 客户端失败', data: null };
  }
});
