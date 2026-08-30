// composables/useDevice.ts
import { ref, onMounted, onUnmounted, onActivated, onDeactivated, type Ref } from 'vue';

export function useDevice(): { isDesktop: Ref<boolean> } {
  const isDesktop: Ref<boolean> = ref(false);

  function checkDevice(): void {
    isDesktop.value = window.innerWidth > 768 && !('ontouchstart' in window);
  }

  // 必须定义一个具名函数引用，保证添加和移除的是同一个
  function handleResize(): void {
    checkDevice();
  }

  // 先删后加，防止重复注册
  function addResizeListener(): void {
    window.removeEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
  }

  function removeResizeListener(): void {
    window.removeEventListener('resize', handleResize);
  }

  onMounted(() => {
    checkDevice();
    addResizeListener();
  });

  // keepalive 缓存页面激活回来时重新监听
  onActivated(addResizeListener);

  // 页面失活（缓存未销毁）时卸载监听
  onDeactivated(removeResizeListener);

  onUnmounted(removeResizeListener);

  return { isDesktop };
}
