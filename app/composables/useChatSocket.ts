import { ref, readonly, onUnmounted } from 'vue';
import type {
  ChatStatus,
  RoomMember,
  RoomMessage,
  ServerMessage,
} from '~~/types/chatSocket';

/**
 * 单聊房间号：双方用户 id 排序后拼接，保证两个人各自计算出的结果一致
 * （群聊直接用业务侧的会话 id 作为 roomId）
 */
export const directRoomId = (a: string, b: string): string => {
  return [a, b].sort().join('-');
};

/**
 * 聊天 WebSocket 组合式函数：连接 cf-nuxt-chat Worker 的 /room/<roomId>。
 * 内置应用层心跳（原生 "ping"/"pong"，不占用业务消息）与断线重连（指数退避，最多 6 次）。
 * 每个 roomId 对应一个独立房间，服务端天然隔离。
 */
export const useChatSocket = () => {
  const config = useRuntimeConfig();
  // 去掉可能误配置的尾部斜杠，避免拼出 //room/... 导致 404
  const wsBase = String(config.public.wsUrl || '').replace(/\/+$/, '');

  const status = ref<ChatStatus>('idle');
  /** 自己的成员 id（连接后由服务端 welcome 消息下发） */
  const selfId = ref('');
  /** 当前房间在线成员列表 */
  const members = ref<RoomMember[]>([]);
  /** 消息列表（chat/dm/system），按到达顺序追加 */
  const messages = ref<RoomMessage[]>([]);

  let ws: WebSocket | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  /** 主动断开标记：true 时不再自动重连 */
  let manualClose = false;

  /** 生成房间连接地址 */
  const roomUrl = (roomId: string): string => {
    return `${wsBase}/room/${encodeURIComponent(roomId)}`;
  };

  /** 处理服务端下发的消息，更新响应式状态 */
  const handleServerMessage = (event: MessageEvent): void => {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(event.data);
    } catch {
      console.warn('[ChatSocket] 非 JSON 消息已忽略:', event.data);
      return;
    }

    switch (msg.type) {
      case 'welcome':
        selfId.value = msg.id;
        members.value = msg.members;
        break;
      case 'presence':
        members.value = msg.members;
        break;
      case 'joined':
      case 'left':
        messages.value.push({
          kind: 'system',
          from: null,
          text:
            msg.type === 'joined'
              ? `${msg.member.name} 加入了房间`
              : `${msg.member.name} 离开了房间`,
          ts: Date.now(),
        });
        break;
      case 'chat':
      case 'dm':
        messages.value.push({ kind: msg.type, from: msg.from, text: msg.text, ts: msg.ts });
        break;
      case 'error':
        console.warn('[ChatSocket] 服务端错误:', msg.message);
        break;
    }
  };

  /** 启动心跳：每 30s 发原生 "ping"，Worker 运行时自动回 "pong"（不会唤醒休眠的 DO） */
  const startHeartbeat = (): void => {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) ws.send('ping');
    }, 30000);
  };

  const stopHeartbeat = (): void => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  /** 断线重连：指数退避 1s/2s/4s...上限 10s，最多尝试 6 次 */
  const scheduleReconnect = (roomId: string, name: string): void => {
    if (manualClose || reconnectAttempt >= 6) {
      status.value = 'closed';
      return;
    }
    const delay = Math.min(1000 * 2 ** reconnectAttempt, 10000);
    reconnectAttempt += 1;
    status.value = 'connecting';
    reconnectTimer = setTimeout(() => openSocket(roomId, name), delay);
  };

  /** 建立底层连接并绑定事件 */
  const openSocket = (roomId: string, name: string): void => {
    const socket = new WebSocket(roomUrl(roomId));
    ws = socket;

    socket.onopen = () => {
      reconnectAttempt = 0;
      status.value = 'open';
      startHeartbeat();
      // 连接即隐式加入房间，join 仅用于设置昵称
      socket.send(JSON.stringify({ type: 'join', name }));
    };
    socket.onmessage = handleServerMessage;
    socket.onclose = () => {
      // 已被新连接替换（重连/手动切房间）时，忽略旧连接迟到的 close 事件
      if (ws !== socket) return;
      ws = null;
      stopHeartbeat();
      scheduleReconnect(roomId, name);
    };
    socket.onerror = () => {
      console.error('[ChatSocket] 连接异常');
    };
  };

  /**
   * 连接指定房间
   * @param roomId 房间号（字符串一致即同一房间；单聊用 directRoomId 生成）
   * @param name 昵称，缺省由服务端命名为"匿名"
   */
  const connect = (roomId: string, name?: string): void => {
    if (!import.meta.client || !wsBase) return;
    disconnect();
    manualClose = false;
    reconnectAttempt = 0;
    status.value = 'connecting';
    openSocket(roomId, name ?? '匿名');
  };

  /** 主动断开连接（不再自动重连） */
  const disconnect = (): void => {
    manualClose = true;
    stopHeartbeat();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    ws?.close();
    ws = null;
    status.value = 'closed';
  };

  /** 发送广播消息（房间内除自己外都可见） */
  const sendChat = (text: string): void => {
    if (ws?.readyState !== WebSocket.OPEN || !text.trim()) {
      console.warn('[ChatSocket] 未连接或消息为空，已丢弃');
      return;
    }
    ws.send(JSON.stringify({ type: 'chat', text }));
  };

  /** 发送私聊消息（to 为对方成员 id，第三方收不到） */
  const sendDm = (to: string, text: string): void => {
    if (ws?.readyState !== WebSocket.OPEN || !text.trim()) {
      console.warn('[ChatSocket] 未连接或消息为空，已丢弃');
      return;
    }
    ws.send(JSON.stringify({ type: 'dm', to, text }));
  };

  // 组件卸载时断开，避免残留连接
  onUnmounted(disconnect);

  return {
    status: readonly(status),
    selfId: readonly(selfId),
    members: readonly(members),
    messages: readonly(messages),
    connect,
    disconnect,
    sendChat,
    sendDm,
  };
};
