<!-- pages/chat.vue -->
<template>
  <div class="chat-page">
    <h1>我的第一个 AI 聊天</h1>

    <!-- 聊天历史区域 -->
    <div class="messages" ref="messagesRef">
      <!-- 遍历显示所有聊天消息 -->
      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="['message', msg.role]"
      >
        <div class="font-bold">{{ msg.role === "user" ? "我" : "AI" }}：</div>

        <!-- 思考过程显示（灰色斜体，思考完成后自动消失） -->
        <div v-if="msg.reasoningContent" class="reasoning">
          💭 {{ msg.reasoningContent }}
        </div>

        <!-- 最终答案（保留换行和格式） -->
        <div class="answer">{{ msg.content }}</div>
      </div>

      <!-- 生成中动画 -->
      <div v-if="loading" class="message assistant typing">
        <strong>AI：</strong>
        <span class="typing-dots">正在思考...</span>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <input
        v-model="userInput"
        @keyup.enter="sendMessage"
        placeholder="输入你想说的话..."
        :disabled="loading"
        autocomplete="off"
      />
      <button @click="sendMessage" :disabled="loading || !userInput.trim()">
        {{ loading ? "发送中" : "发送" }}
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 聊天消息类型定义
 */
interface Message {
  role: "user" | "assistant"; // 消息角色：用户/AI助手
  content: string; // 最终回答内容
  reasoningContent?: string; // 思考过程（仅AI消息有）
}

// 响应式状态
const messages = ref<Message[]>([]); // 聊天历史数组
const userInput = ref(""); // 用户输入框内容
const loading = ref(false); // 加载状态
const error = ref(""); // 错误信息
const messagesRef = ref<HTMLDivElement>(); // 聊天区域DOM引用

/**
 * 自动滚动到底部
 * 当消息数组变化时，自动滚动到最新消息
 */
watch(
  messages,
  () => {
    nextTick(() => {
      if (messagesRef.value) {
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
      }
    });
  },
  { deep: true },
);

/**
 * 发送消息核心函数
 */
async function sendMessage() {
  // 输入验证：空输入或正在加载时不执行
  if (!userInput.value.trim() || loading.value) return;

  // 重置状态
  const userContent = userInput.value.trim();
  userInput.value = "";
  loading.value = true;
  error.value = "";

  // 添加用户消息到聊天历史
  messages.value.push({
    role: "user",
    content: userContent,
  });

  // 创建AI消息对象（使用ref确保响应式）
  const aiMessage = ref<Message>({
    role: "assistant",
    content: "",
    reasoningContent: "",
  });
  messages.value.push(aiMessage.value);

  try {
    // 调用流式API接口
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.value.slice(0, -1), // 发送除当前空AI消息外的所有历史
      }),
    });

    // 检查HTTP响应状态
    if (!response.ok) {
      throw new Error(`服务器错误：${response.status}`);
    }

    // 获取流读取器和解码器
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("无法建立流式连接");
    }

    // 循环读取流数据
    while (true) {
      const { done, value } = await reader.read();

      if (done) break; // 流读取完成，退出循环

      // 解码二进制数据为字符串
      const rawChunk = decoder.decode(value);
      // 按SSE协议分割数据块
      const lines = rawChunk.split("\n\n").filter((line) => line.trim());

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);

          // 收到结束信号
          if (dataStr === "[DONE]") continue;

          // 解析JSON数据
          const data = JSON.parse(dataStr);

          // 处理服务端返回的错误
          if (data.error) {
            throw new Error(data.error);
          }

          // 追加思考过程
          if (data.reasoningContent) {
            aiMessage.value.reasoningContent += data.reasoningContent;
          }

          // 追加最终答案
          if (data.content) {
            aiMessage.value.content += data.content;
          }

          // ✅ 关键：强制Vue立即更新DOM，实现逐字打字效果
          // 解决Vue异步批量更新导致内容一次性显示的问题
          await nextTick();
        }
      }
    }
  } catch (e) {
    // 统一错误处理
    console.error("聊天请求失败:", e);
    error.value = e instanceof Error ? e.message : "网络连接失败，请稍后重试";
    aiMessage.value.content = "抱歉，我遇到了一点问题，请稍后再试。";
  } finally {
    // 无论成功失败，最终都关闭加载状态
    loading.value = false;
  }
}
</script>

<style scoped>
.chat-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.messages {
  height: 550px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  background-color: white;
  scroll-behavior: smooth;
}

.message {
  margin-bottom: 15px;
  line-height: 1.6;
  padding: 12px 16px;
  border-radius: 8px;
  max-width: 85%;
  word-wrap: break-word;
}

.message.user {
  background-color: #dbeafe;
  color: #1e40af;
  margin-left: auto; /* 用户消息靠右对齐 */
}

.message.assistant {
  background-color: #f3f4f6;
  color: #374151;
  margin-right: auto; /* AI消息靠左对齐 */
}

/* 思考过程样式：灰色斜体，底部虚线分隔 */
.reasoning {
  font-size: 14px;
  color: #6b7280;
  font-style: italic;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #d1d5db;
}

/* 最终答案样式：保留换行和空格 */
.answer {
  white-space: pre-wrap;
  word-break: break-word;
}

.typing-dots {
  display: inline-block;
  animation: typing 1.4s infinite ease-in-out;
  color: #6b7280;
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.3;
  }
  30% {
    opacity: 1;
  }
}

.input-area {
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 14px 18px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

button {
  padding: 14px 28px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: #2563eb;
}

button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.error {
  margin-top: 20px;
  padding: 15px;
  background-color: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  text-align: center;
}
</style>
