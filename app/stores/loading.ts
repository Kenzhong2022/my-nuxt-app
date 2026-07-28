// stores/loading.ts
interface LoadingStore {
  isRouteChanging: Ref<boolean>;
  setLoading: (loading: boolean) => void;
}
export const useLoadingStore = defineStore("loading", (): LoadingStore => {
  /**
   * @description 当路由变化时，设置为true，加载完成后设置为false（只读）通过setLoading方法设置
   * @default false
   */
  const isRouteChanging = ref(false); // 对外只读

  function setLoading(loading: boolean) {
    // 确保只在客户端执行
    if (!import.meta.client) {
      return;
    }

    isRouteChanging.value = loading;
  }

  return { isRouteChanging, setLoading };
});
