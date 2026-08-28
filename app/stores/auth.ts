// stores/auth.ts
import { defineStore } from "pinia";
import { computed } from "vue";

export const useAuthStore = defineStore("auth", () => {
  // 用 cookie 存储 token，SSR 和 CSR 都能读到，避免水合不匹配
  // 赋值时 useCookie 会自动写回 cookie，无需手动持久化
  const token = useCookie<string | null>("token", {
    default: () => null,
    // 与认证中心 access_token 的 2h 有效期对齐：
    // token 过期时 cookie 同步失效，避免 isLoggedIn 谎报已登录
    maxAge: 60 * 60 * 2,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // 注意：只代表本地存有 token（大概率已登录），
  // token 是否真实有效以服务端接口校验为准
  const isLoggedIn = computed(() => !!token.value);

  function setToken(newToken: string) {
    token.value = newToken;
  }

  function clearToken() {
    token.value = null;
  }

  return { token, isLoggedIn, setToken, clearToken };
});
