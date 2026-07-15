<template>
  <div class="chat-area">
    <div class="chat-header">
      <div class="header-title">智能客服</div>
      <div
        v-if="streamStatus === ConnectionStatus.Connecting"
        class="connection-status"
      >
        连接中...
      </div>
      <div
        v-else-if="streamStatus === ConnectionStatus.Reconnecting"
        class="connection-status"
      >
        ⚠️ 网络连接中断，正在重连...
      </div>
      <div
        v-else-if="streamStatus === ConnectionStatus.Error"
        class="connection-status"
      >
        ❌ 连接失败，请重试
      </div>
      <div class="header-actions">
        <el-button size="small" text @click="$emit('clear')"
          >清空记录</el-button
        >
      </div>
    </div>
    <div ref="messagesContainer" class="chat-content">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message-item', message.role]"
      >
        <div class="message-role">
          {{ message.role === "user" ? "用户" : "AI" }}
        </div>
        <div class="message-content">
          <template v-if="message.role === 'user'">
            <div v-for="(item, itemIndex) in message.content" :key="itemIndex">
              <div v-if="item.type === 'text'">{{ item.text }}</div>
              <ImageWithFallback
                v-else-if="item.type === 'image_url'"
                :src="item.image_url.url"
                :preview-list="[item.image_url.url]"
                fit="cover"
                class="message-image"
                error-text="图片加载失败"
              />
            </div>
          </template>
          <template v-else>
            <div
              class="markdown-content"
              v-html="renderMarkdown(message.content as string)"
            ></div>
          </template>
        </div>
      </div>
    </div>
    <AIChatInput @send="handleSend" @pauseSend="stopGeneration" />
  </div>
</template>

<script setup lang="ts">
import AIChatInput from "./AIChatInput.vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { ChatMessage, UserMessageContent } from "~~/types/agent";
import { ConnectionStatus } from "@/composables/useAgentApi";

// 1. 使用 defineModel 替代 props
const messages = defineModel<ChatMessage[]>("messages", { required: true });

defineEmits<{
  clear: [];
}>();

marked.setOptions({
  breaks: true,
  gfm: true,
});

function renderMarkdown(text: string): string {
  if (!text || typeof text !== "string") return "";
  const rawHtml = marked.parse(text) as string;
  return DOMPurify.sanitize(rawHtml);
}

const messagesContainer = ref<HTMLDivElement>();

// ---------- SSE 连接管理 ----------
const { sendMessageStreamWithControl } = useAgentApi();
const isStreaming = ref(false); // 是否正在流式输出
const streamStatus = ref<ConnectionStatus>(ConnectionStatus.Idle); // 连接状态，同步给模板

// 处理发送事件
interface SendPayload {
  thread_id: string;
  prompt: string;
  image?: string;
}

let cancelStream: (() => void) | null = null;

const handleSend = async (payload: SendPayload) => {
  // 取消已有流（如果有）
  if (cancelStream) {
    cancelStream();
    cancelStream = null;
    isStreaming.value = false;
  }

  // 添加用户消息
  const userContent: UserMessageContent = [];
  if (payload.prompt?.trim())
    userContent.push({ type: "text", text: payload.prompt.trim() });
  if (payload.image)
    userContent.push({ type: "image_url", image_url: { url: payload.image } });
  messages.value.push({ role: "user", content: userContent });

  // 添加占位助手消息
  const assistantIndex = messages.value.length;
  messages.value.push({ role: "assistant", content: "" });
  isStreaming.value = true;

  // 调用可中断的流式方法
  const { cancel, status } = sendMessageStreamWithControl(
    {
      prompt: payload.prompt.trim(),
      image: payload.image || "",
      thread_id: payload.thread_id,
    },
    // onMessage
    (data) => {
      messages.value[assistantIndex]!.content += data;
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop =
            messagesContainer.value.scrollHeight;
        }
      });
    },
    // onDone
    () => {
      isStreaming.value = false;
      cancelStream = null;
      console.log("流正常结束");
    },
    // onError
    (err) => {
      messages.value[assistantIndex]!.content = `❌ 请求出错：${err.message}`;
      isStreaming.value = false;
      cancelStream = null;
    },
  );

  cancelStream = cancel;
  // 将内部 status 同步到组件级 streamStatus，供模板响应式使用
  watch(
    status,
    (val) => {
      streamStatus.value = val;
      console.log("status", val);
    },
    { immediate: true },
  );
};

// 手动停止生成（点击停止按钮调用）
const stopGeneration = () => {
  console.log("手动停止生成123");
  if (cancelStream) {
    cancelStream();
    cancelStream = null;
    isStreaming.value = false;
    const lastMsg = messages.value[messages.value.length - 1];
    if (lastMsg && lastMsg.role === "assistant") {
      lastMsg.content += "\n\n⏹️ 用户点击了暂停，已停止生成";
    }
  }
};

// 组件卸载时清理
onBeforeUnmount(() => {
  if (cancelStream) {
    cancelStream();
    cancelStream = null;
  }
});
</script>

<style lang="scss">
.chat-area .markdown-content p {
  margin: 0.3em 0;
}
.chat-area .markdown-content h1,
.chat-area .markdown-content h2,
.chat-area .markdown-content h3 {
  font-weight: bold;
  margin: 0.5em 0;
}
.chat-area .markdown-content ul,
.chat-area .markdown-content ol {
  padding-left: 1.2em;
}
.chat-area .markdown-content code {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: monospace;
}
.chat-area .markdown-content pre {
  background: #f6f8fa;
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
}
.chat-area .markdown-content pre code {
  background: transparent;
  padding: 0;
}
.chat-area .markdown-content table {
  border-collapse: collapse;
  width: 100%;
}
.chat-area .markdown-content table th,
.chat-area .markdown-content table td {
  border: 1px solid #ddd;
  padding: 6px 10px;
}
.chat-area .markdown-content blockquote {
  border-left: 3px solid #ddd;
  padding-left: 10px;
  color: #666;
}
</style>

<style scoped lang="scss">
.chat-area {
  width: 100%;
  height: 100%;
  background: #ffffff;
  display: flex;
  flex-direction: column;

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);

    .header-title {
      font-weight: bold;
      font-size: 16px;
    }
  }

  .chat-content {
    flex: 1;
    padding: 10px;
    margin: 0 auto;
    width: 70%;
    overflow-y: auto;
  }

  .message-item {
    display: flex;
    flex-direction: column;
    margin-bottom: 15px;
    max-width: 100%;

    .message-role {
      font-weight: bold;
      margin-bottom: 4px;
      font-size: 13px;
      color: #666;
    }

    .message-content {
      padding: 8px 14px;
      border-radius: 8px;
      word-wrap: break-word;
      line-height: 1.6;
    }

    &.user {
      align-self: flex-end;

      .message-content {
        background-color: #dbeafe;
        max-width: 80%;
        margin-left: auto;
      }
    }

    &.assistant {
      align-self: flex-start;

      .message-content {
        background-color: #f3f4f6;
      }
    }

    .message-image {
      max-width: 200px;
      max-height: 200px;
      border-radius: 4px;
    }
  }
}
</style>
