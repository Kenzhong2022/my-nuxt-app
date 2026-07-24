// stores/auth.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";

// 工具函数：安全读写 localStorage（仅在客户端）
const STORAGE_KEY = "token";

function getStoredToken(): string | null {
  if (process.client) {
    return localStorage.getItem(STORAGE_KEY);
  }
  return null;
}

function setStoredToken(token: string) {
  if (process.client) {
    localStorage.setItem(STORAGE_KEY, token);
  }
}

function removeStoredToken() {
  if (process.client) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const useAuthStore = defineStore("auth", () => {
  // 初始化时从 localStorage 读取（客户端才执行）
  const token = ref<string | null>(getStoredToken());

  const isLoggedIn = computed(() => !!token.value);

  function setToken(newToken: string) {
    token.value = newToken;
    setStoredToken(newToken);
  }

  function clearToken() {
    token.value = null;
    removeStoredToken();
  }

  return { token, isLoggedIn, setToken, clearToken };
});
