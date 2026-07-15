<template>
  <div class="agent-dialog">
    <div class="dialog-content-inner">
      <div class="left-history">
        <HistorySidebar
          :sessions="sessions"
          :current-thread-id="currentThreadId"
          @select="handleSelectSession"
        />
      </div>
      <div class="right-chat">
        <ChatArea v-model:messages="messages" @clear="handleClearMessages" />
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

const isMobile = useMediaQuery("(max-width:767px)");
const { getMessages, clearMessages } = useAgentApi();

const emit = defineEmits(["close"]);
const dialogVisible = ref(true);
const currentThreadId = ref("1");

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

function openDialog(): void {
  console.log("打开代理商服务弹窗");
  dialogVisible.value = true;
}

function closeDialog(): void {
  dialogVisible.value = false;
  console.log("关闭代理商服务弹窗");
  emit("close");
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

defineExpose({
  openDialog,
  closeDialog,
});
</script>

<style lang="scss">
.agent-dialog {
  display: flex;
  flex-direction: column;
  height: 100vh !important;
  .el-dialog__body {
    padding: 0;
    flex: 1;
    min-height: 0;
    display: flex;
  }
  &:not(.is-fullscreen) .el-dialog__body {
    min-height: 600px;
  }
  .dialog-content-inner {
    width: 100%;
    display: flex;
    height: inherit;
  }
  .left-history {
    width: 10%;
    height: 100%;
  }
  .right-chat {
    width: 90%;
    height: 100%;
  }
}
</style>
