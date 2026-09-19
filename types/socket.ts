// 业务消息
export interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}

export interface UserInfo {
  id: string;
  name: string;
}

// 服务端 → 客户端事件
export interface ServerToClientEvents {
  'new-message': (msg: ChatMessage) => void;
  'user-joined': (user: UserInfo) => void;
}

// 客户端 → 服务端事件
export interface ClientToServerEvents {
  'send-message': (data: { text: string }) => void;
}
