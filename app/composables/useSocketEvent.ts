import { onUnmounted } from 'vue';
import type { ServerToClientEvents } from '~~/types/socket';

/**
 * 自动注册并在组件卸载时清理的 socket 事件监听
 * 必须在 setup 顶层调用（依赖 onUnmounted）
 */
export function useSocketEvent<K extends keyof ServerToClientEvents>(event: K, handler: ServerToClientEvents[K]) {
  if (!import.meta.client) return;

  const socket = getSocket();
  socket.on(event as any, handler as any);

  onUnmounted(() => {
    socket.off(event as any, handler as any);
  });
}
