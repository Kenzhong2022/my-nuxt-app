// stores/loading.ts
export const useLoadingStore = defineStore("loading", () => {
  const isFullLoading = ref(false);

  function setLoading(loading: boolean) {
    isFullLoading.value = loading;
  }

  return { isFullLoading, setLoading };
});
