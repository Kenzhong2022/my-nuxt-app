import jwt from "jsonwebtoken";
export interface TokenPayload {
  userId: number;
  role?: string;
}

export function verifyAccessToken(token: string): TokenPayload {
  // 校验token
  if (!token) {
    throw new Error("token不能为空");
  }
  // 校验token格式
  if (!token.startsWith("Bearer ")) {
    throw new Error("token格式错误");
  }
  // 校验token签名
  try {
    const config = useRuntimeConfig();
    const payload = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
    console.log("payload", payload);
    return payload;
  } catch {
    throw new Error("token签名错误");
  }
}
