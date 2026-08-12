// stores/auth.ts
import { defineStore } from "pinia";
import { computed } from "vue";

export const useAuthStore = defineStore("auth", () => {
  // 用 cookie 存储 token，SSR 和 CSR 都能读到，避免水合不匹配
  // 赋值时 useCookie 会自动写回 cookie，无需手动持久化
  const token = useCookie<string | null>("token", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7, // 7 天
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const isLoggedIn = computed(() => !!token.value);

  function setToken(newToken: string) {
    token.value = newToken;
  }

  function clearToken() {
    token.value = null;
  }

  return { token, isLoggedIn, setToken, clearToken };
});
