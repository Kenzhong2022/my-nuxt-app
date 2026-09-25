// composables/useRouteLoading.ts
import { ref, readonly } from 'vue'

/** 路由加载状态（模块级共享，替代原 Pinia loading store） */
const isRouteChanging = ref(false)

/**
 * 路由加载状态：由 page:loading 插件钩子驱动写入，供全局加载指示器只读消费
 */
export const useRouteLoading = () => {
  /** 设置加载状态（仅客户端生效） */
  const setLoading = (loading: boolean): void => {
    if (!import.meta.client) return
    isRouteChanging.value = loading
  }

  return { isRouteChanging: readonly(isRouteChanging), setLoading }
}
