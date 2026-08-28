import { jwtVerify } from "jose";
export interface TokenPayload {
  userId: number;
  role?: string;
}
/**
 * @description 校验访问令牌
 * @param token 访问令牌（不包含 "Bearer " 前缀）
 * @returns 访问令牌有效时返回 payload，否则抛出错误（JWTExpired 已过期 / JWTInvalid 签名无效或格式错误）
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  // 校验token（调用方 auth.global.ts 已剥离 "Bearer " 前缀，此处接收纯 JWT）
  if (!token) {
    throw new Error("token不能为空");
  }
  const config = useRuntimeConfig();
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(config.jwt.accessSecret),
  );
  return payload as unknown as TokenPayload;
}
