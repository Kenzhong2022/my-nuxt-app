import jwt from "jsonwebtoken";
export interface TokenPayload {
  userId: number;
  role?: string;
}
/**
 * @description 校验访问令牌
 * @param token 访问令牌（不包含 "Bearer " 前缀）
 * @returns 访问令牌有效时返回 payload，否则抛出错误
 */
export function verifyAccessToken(token: string): TokenPayload {
  // 校验token（调用方 auth.global.ts 已剥离 "Bearer " 前缀，此处接收纯 JWT）
  if (!token) {
    throw new Error("token不能为空");
  }
  // 校验token签名
  try {
    const config = useRuntimeConfig();
    const payload = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
    return payload;
  } catch {
    throw new Error("token签名错误");
  }
}
