import { ref, type Ref } from "vue";
import type { StreamMessageRequest, GetMessagesResponse } from "~~/types/agent";
import {
  createParser,
  type EventSourceMessage,
  type ParseError,
} from "eventsource-parser";

/** SSE 连接状态 */
export enum ConnectionStatus {
  Idle = "idle", // 未开始
  Connecting = "connecting", // 首次连接中
  Streaming = "streaming", // 正在接收数据
  Reconnecting = "reconnecting", // 重连中
  Done = "done", // 正常结束
  Error = "error", // 失败（超过最大重试）
  Cancelled = "cancelled", // 用户取消
}

/**
 * Agent API 组合式函数
 * 提供与后端 Agent 服务交互的接口方法
 *
 * @returns API 方法集合
 */
export function useAgentApi() {
  const { agentBaseUrl } = useRuntimeConfig().public;
  const BASE_URL = agentBaseUrl || "http://127.0.0.1:8000";
  /**
   * 获取指定会话的消息列表
   *
   * @param {string} threadId - 会话线程ID
   * @returns {Promise<GetMessagesResponse>} 消息列表响应
   */
  async function getMessages(threadId: string): Promise<GetMessagesResponse> {
    return $fetch(`${BASE_URL}/api/v1/chat/messages`, {
      method: "GET",
      query: { thread_id: threadId },
    });
  }

  /**
   * 清空指定会话的所有消息
   *
   * @param {string} threadId - 会话线程ID
   * @returns {Promise<void>} 无返回值
   */
  async function clearMessages(threadId: string): Promise<void> {
    return $fetch(`${BASE_URL}/api/v1/chat/messages`, {
      method: "DELETE",
      query: { thread_id: threadId },
    });
  }

  /**
   * 流式发送消息（POST，支持手动中断和断点续传）
   * @param data 请求参数
   * @param onMessage 收到数据块回调 (data: string, id?: string)
   * @param onDone 流正常结束回调
   * @param onError 错误回调
   * @returns { cancel, status } cancel 调用即中断；status 为响应式连接状态
   */
  function sendMessageStreamWithControl(
    data: StreamMessageRequest,
    onMessage: (data: string, id?: string) => void,
    onDone?: () => void,
    onError?: (err: Error) => void,
  ): { cancel: () => void; status: Ref<ConnectionStatus> } {
    const status = ref<ConnectionStatus>(ConnectionStatus.Idle);
    let isCancelled = false;
    let abortController = new AbortController();
    let lastEventId: string | null = null;
    let retryInterval = 3000;
    let retryCount = 0;
    const MAX_RETRIES = 5;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    /** 执行重连：等待一段时间后重新发起请求 */
    function attemptRetry() {
      if (isCancelled) return;
      if (retryCount >= MAX_RETRIES) {
        status.value = ConnectionStatus.Error;
        console.warn(`已达最大重试次数 ${MAX_RETRIES}，停止重连`);
        return;
      }
      retryCount++;
      status.value = ConnectionStatus.Reconnecting;
      console.log(`第 ${retryCount} 次重连，等待 ${retryInterval}ms...`);
      retryTimer = setTimeout(() => {
        abortController = new AbortController();
        doFetch();
      }, retryInterval);
    }

    /** 执行实际的 fetch 请求 */
    async function doFetch() {
      if (isCancelled) return;
      // 首次连接设为 connecting，重连保持 reconnecting
      if (retryCount === 0) {
        status.value = ConnectionStatus.Connecting;
      }

      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (retryCount > 0 && lastEventId) {
          headers["last-event-id"] = lastEventId;
        }

        const response = await fetch(`${BASE_URL}/api/v1/chat/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: data.prompt,
            image: data.image || "",
            thread_id: data.thread_id,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) throw new Error(`请求失败: ${response.status}`);
        if (!response.body) throw new Error("响应体为空");

        status.value = ConnectionStatus.Streaming;

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        const parser = createParser({
          onEvent(event: EventSourceMessage) {
            if (event.id) {
              lastEventId = event.id;
            }
            if (event.data) {
              onMessage(event.data, event.id);
            }
          },
          onRetry(interval) {
            retryInterval = interval;
            console.log("服务端要求重连间隔: %dms", interval);
          },
          onError(error: ParseError) {
            console.error("SSE解析错误：", error);
          },
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          parser.feed(chunk);
        }

        // 流正常结束（服务端主动关闭）
        if (!isCancelled) {
          status.value = ConnectionStatus.Done;
          if (onDone) onDone();
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log("流被用户中断");
          return;
        }
        if (onError) onError(err);
        attemptRetry();
      }
    }

    doFetch();

    /** 取消函数：中断请求 + 清理重连定时器 */
    async function cancel() {
      isCancelled = true;
      status.value = ConnectionStatus.Cancelled;
      abortController.abort();
      await fetch(`${BASE_URL}/api/v1/chat/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: data.thread_id,
          last_event_id: lastEventId,
        }),
      });
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    }

    return { cancel, status };
  }

  return {
    sendMessageStreamWithControl,
    getMessages,
    clearMessages,
  };
}
