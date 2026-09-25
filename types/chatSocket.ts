// types/chatSocket.ts - 聊天 WebSocket 类型定义（与 app/composables/useChatSocket.ts 配套）

/** 房间成员（与服务端 ChatRoom 的 Member 协议一致） */
export interface RoomMember {
  id: string;
  name: string;
}

/** 聊天消息：chat 广播 / dm 私聊 / system 系统提示（进出房间） */
export interface RoomMessage {
  kind: 'chat' | 'dm' | 'system';
  /** 发送者；system 消息为 null */
  from: RoomMember | null;
  text: string;
  ts: number;
}

/** 连接状态 */
export type ChatStatus = 'idle' | 'connecting' | 'open' | 'closed';

/** 服务端 -> 客户端消息（协议见 cf-nuxt-chat/worker/chat-room.ts 头部注释） */
export type ServerMessage =
  | { type: 'welcome'; id: string; members: RoomMember[] }
  | { type: 'presence'; members: RoomMember[] }
  | { type: 'joined'; member: RoomMember }
  | { type: 'left'; member: RoomMember }
  | { type: 'chat'; from: RoomMember; text: string; ts: number }
  | { type: 'dm'; from: RoomMember; text: string; ts: number }
  | { type: 'error'; message: string };
