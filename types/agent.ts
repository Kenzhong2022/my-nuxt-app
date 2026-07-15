/**
 * 流式消息请求参数
 */
interface StreamMessageRequest {
  /** 用户输入的文本内容 */
  prompt: string;
  /** 图片URL（可选） */
  image?: string;
  /** 会话线程ID */
  thread_id: string;
}

/**
 * 文本内容类型
 */
interface TextContent {
  /** 内容类型标识 */
  type: "text";
  /** 文本内容 */
  text: string;
}

/**
 * 图片内容类型
 */
interface ImageUrlContent {
  /** 内容类型标识 */
  type: "image_url";
  /** 图片URL信息 */
  image_url: {
    /** 图片地址 */
    url: string;
  };
}

/**
 * 用户消息内容集合（支持文本和图片混合）
 */
type UserMessageContent = (TextContent | ImageUrlContent)[];

/**
 * 用户消息接口
 */
interface UserMessage {
  /** 消息角色 */
  role: "user";
  /** 消息内容（数组形式，支持多模态） */
  content: UserMessageContent;
}

/**
 * 助手消息接口
 */
interface AssistantMessage {
  /** 消息角色 */
  role: "assistant";
  /** 消息内容（纯文本） */
  content: string;
}

/**
 * 聊天消息联合类型
 */
type ChatMessage = UserMessage | AssistantMessage;

/**
 * 获取消息列表响应结构
 */
interface GetMessagesResponse {
  /** 消息列表 */
  messages: ChatMessage[];
}

export type {
  StreamMessageRequest,
  TextContent,
  ImageUrlContent,
  UserMessageContent,
  UserMessage,
  AssistantMessage,
  ChatMessage,
  GetMessagesResponse,
};
