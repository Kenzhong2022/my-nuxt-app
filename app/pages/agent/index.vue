<template>
  <div class="agent-container">
    <div class="agent-content-inner">
      <clientOnly>
        <div
          class="left-history"
          :style="{ width: leftWidth }"
          v-if="drawerVisible"
        >
          <!-- 历史会话按钮（放置在左上角） -->
          <HistorySidebar
            :sessions="sessions"
            :current-thread-id="currentThreadId"
            @select="handleSelectSession"
            v-model:visible="drawerVisible"
          />
        </div>
      </clientOnly>
      <div class="right-chat" :style="rightPanelStyle">
        <ChatArea
          v-model:messages="messages"
          @clear="handleClearMessages"
          v-model:drawerVisible="drawerVisible"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useMediaQuery } from "@vueuse/core";
import { useAgentApi } from "@/composables/useAgentApi";
import type { ChatMessage } from "~~/types/agent";
import HistorySidebar from "./HistorySidebar.vue";
import ChatArea from "./ChatArea.vue";
definePageMeta({ layout: false });

const { getMessages, clearMessages } = useAgentApi();

const emit = defineEmits(["close"]);
const currentThreadId = ref("1");

// 判断是否为移动设备（宽度 <= 768px）
const isMobile = useMediaQuery("(max-width: 768px)");

// 计算左侧宽度
const leftWidth = computed(() => (isMobile.value ? "80%" : "20%"));

const drawerVisible = ref(!isMobile.value);

// 计算右侧宽度
const rightPanelStyle = computed(() => {
  // 移动端
  // 左侧历史记录是否客家你
  if (drawerVisible.value) {
    if (isMobile.value) {
      return {
        left: "80%",
        width: "100%",
      };
    } else {
      return {
        left: "20%",
        width: "80%",
      };
    }
  } else {
    if (isMobile.value) {
      return {
        left: 0,
        width: "100%",
      };
    } else {
      return {
        left: 0,
        width: "100%",
      };
    }
  }
});

const sessions = ref([
  { id: "1", name: "智能客服", preview: "图片内容是什么..." },
  { id: "2", name: "美食推荐", preview: "宫保鸡丁做法..." },
]);

const messages = ref<ChatMessage[]>([]);

async function fetchMessages(threadId: string): Promise<void> {
  try {
    const response = await getMessages(threadId);
    if (response && response.messages) {
      messages.value = response.messages;
      console.log("获取消息成功:", messages.value);
    }
  } catch (error) {
    console.error("获取消息失败:", error);
  }
}

function handleSelectSession(threadId: string): void {
  currentThreadId.value = threadId;
  fetchMessages(threadId);
}

function handleClearMessages(): void {
  clearMessages(currentThreadId.value);
  messages.value = [];
}

onActivated(() => {
  console.log("===========代理商服务组件激活===========");
  fetchMessages(currentThreadId.value);
});

onMounted(() => {
  console.log("===========代理商服务组件挂载完成===========");
  fetchMessages(currentThreadId.value);
});

onUnmounted(() => {
  console.log("===========代理商服务组件卸载完成===========");
});
</script>

<style lang="scss">
.agent-container {
  display: flex;
  flex-direction: column;
  height: 100vh !important;
  background: var(--el-bg-color-page);

  .agent-content-inner {
    position: relative;
    width: 100%;
    height: inherit;
    .left-history {
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }
    .right-chat {
      flex: 1;
      height: 100%;
      padding: 10px;
      position: absolute;
      top: 0;
      left: 20%;
    }
  }
}
</style>
