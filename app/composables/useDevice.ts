// composables/useDevice.ts
import { ref, onMounted, onUnmounted, type Ref } from "vue";

export function useDevice(): { isDesktop: Ref<boolean> } {
  const isDesktop: Ref<boolean> = ref(false);

  function checkDevice(): void {
    isDesktop.value = window.innerWidth > 768 && !("ontouchstart" in window);
  }

  // 必须定义一个具名函数引用，保证添加和移除的是同一个
  function handleResize(): void {
    checkDevice();
  }

  onMounted(() => {
    checkDevice();
    window.addEventListener("resize", handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
  });

  return { isDesktop };
}
