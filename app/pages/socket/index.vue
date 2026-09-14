<template>
  <div class="chat-layout">
    <!-- 左侧：功能导航（定宽） -->
    <SidebarLeft />

    <!-- 剩余区域：会话列表 + 聊天窗口，按 3:7 分 -->
    <div class="chat-body">
      <SessionList :search-key="searchKey" class="session-area" />
      <ChatWindow class="chat-area" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SidebarLeft from './components/SidebarLeft.vue';
import SessionList from './components/SessionList.vue';
import ChatWindow from './components/ChatWindow.vue';

const searchKey = ref('');

definePageMeta({
  title: '聊天窗口',
  layout: 'default',
  name: 'Socket',
});
</script>

<style scoped>
.chat-layout {
  display: flex;
  width: 100%;
  height: 100%;
  background: #1c1c1c;
  color: #ccc;
  overflow: hidden;
}

/* 剩余区域：横向排列，按 3:7 分 */
.chat-body {
  flex: 1;
  display: flex;
  min-width: 0; /* 防止子元素溢出撑破布局 */
}

/* 会话列表：占 3 份 */
.session-area {
  flex: 3;
  min-width: 260px; /* 可选：设个最小宽度，防止太窄 */
  max-width: 400px; /* 可选：设个最大宽度，防止大屏下太宽 */
}

/* 聊天窗口：占 7 份 */
.chat-area {
  flex: 7;
  min-width: 0;
}
</style>
