// composables/socket.client.ts
import { io, type Socket } from 'socket.io-client';

// ---- 事件类型定义（可选，用于类型提示）----
export interface ServerToClientEvents {
  'new-message': (msg: ChatMessage) => void;
  'user-joined': (user: { id: string; name: string }) => void;
}

export interface ClientToServerEvents {
  'send-message': (data: { text: string }) => void;
}

/**
 * 聊天消息接口
 */
export interface ChatMessage {
  /** 消息 ID */
  id: string;
  /** 用户 ID */
  userId: string;
  /** 消息文本 */
  text: string;
  /** 消息时间戳 */
  timestamp: number;
}

// ---- 单例 socket 实例 ----
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    const config = useRuntimeConfig();
    socket = io(config.public.socketUrl, {
      autoConnect: false, // 手动控制连接时机
      transports: ['websocket'], // 强制 WebSocket，跳过 polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      withCredentials: true, // 如果需要跨域携带 Cookie
    });

    // 开发环境热更新时销毁旧连接，避免残留
    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        socket?.disconnect();
        socket = null;
      });
    }
  }
  return socket;
}

export function destroySocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
