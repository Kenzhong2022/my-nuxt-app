// stores/loading.ts
import { readonly } from "vue";

export const useLoadingStore = defineStore("loading", () => {
  const _isRouteChanging = ref(false); // 私有变量（下划线约定）

  /**
   * @description 当路由变化时，设置为true，加载完成后设置为false（只读）通过setLoading方法设置
   * @default false
   */
  const isRouteChanging = readonly(_isRouteChanging); // 对外只读

  function setLoading(loading: boolean) {
    _isRouteChanging.value = loading;
  }

  return { isRouteChanging, setLoading };
});
