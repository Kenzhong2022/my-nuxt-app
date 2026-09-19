import { ref, onMounted, onUnmounted, readonly } from 'vue';
import type { ChatMessage } from '~~/types/socket';

export function useSocket() {
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const messages = ref<ChatMessage[]>([]);

  // 只在客户端初始化
  let socket: ReturnType<typeof getSocket> | null = null;
  if (import.meta.client) {
    socket = getSocket();
  }

  // ---------- 事件回调 ----------
  const onConnect = () => {
    isConnected.value = true;
    isConnecting.value = false;
    console.log('[Socket] connected:', socket?.id);
  };

  const onDisconnect = (reason: string) => {
    isConnected.value = false;
    isConnecting.value = false;
    console.log('[Socket] disconnected:', reason);
  };

  const onConnectError = (err: Error) => {
    isConnecting.value = false;
    console.error('[Socket] connect_error:', err.message);
  };

  // ---------- 唯一事实来源：事件注册表 ----------
  // 新增事件只在这里加一行，注册/清理自动同步
  const listeners = {
    connect: onConnect,
    disconnect: onDisconnect,
    connect_error: onConnectError,
  } as const;

  type EventName = keyof typeof listeners;

  const registerListeners = () => {
    if (!socket) return;
    (Object.keys(listeners) as EventName[]).forEach((event) => {
      socket!.on(event as any, listeners[event] as any);
    });
  };

  const unregisterListeners = () => {
    if (!socket) return;
    (Object.keys(listeners) as EventName[]).forEach((event) => {
      socket!.off(event as any, listeners[event] as any);
    });
  };

  // ---------- 生命周期 ----------
  onMounted(() => {
    if (!socket) return;
    registerListeners();
    isConnected.value = socket.connected;
  });

  onUnmounted(() => {
    unregisterListeners();
    // 注意：不断开连接（单例共享）
  });

  // ---------- 对外方法 ----------
  const connect = () => {
    if (!socket) return;
    if (!socket.connected) {
      isConnecting.value = true;
      socket.connect();
    }
  };

  const disconnect = () => {
    socket?.disconnect();
  };

  const sendMessage = (text: string) => {
    if (!socket?.connected) {
      console.warn('[Socket] not connected, message dropped');
      return;
    }
    socket.emit('send-message', { text });
  };

  return {
    isConnected: readonly(isConnected),
    isConnecting: readonly(isConnecting),
    messages: readonly(messages),
    connect,
    disconnect,
    sendMessage,
    socket,
  };
}
