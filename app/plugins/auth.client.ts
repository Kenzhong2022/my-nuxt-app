// plugins/auth.client.ts
import { useAuthStore } from "~~/app/stores/auth";

/**
 * 客户端启动时从 localStorage 恢复 token
 * @description SSR 水合后 Pinia state 为 null，需在客户端重新恢复
 * @returns 无返回值
 */
export default defineNuxtPlugin(() => {
  const authStore = useAuthStore();
  const stored = localStorage.getItem("token");
  if (stored && !authStore.token) {
    authStore.setToken(stored);
  }
});
