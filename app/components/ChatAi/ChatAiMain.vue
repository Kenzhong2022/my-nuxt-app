<template>
  <div class="main-container">
    <!-- 欢迎首页 -->
    <ChatAiWelcome />
    <!-- 底部输入框 -->
    <div class="input-wrap">
      <ChatInputBar />
    </div>
  </div>
</template>

<script setup lang="ts">
import ChatAiWelcome from './ChatAiWelcome.vue'
import ChatInputBar from './ChatInputBar.vue'
</script>

<style scoped lang="scss">
// ===================== 主对话容器 =====================
.main-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: center;
  position: relative;

  .input-wrap {
    position: absolute;
    bottom: 1.875rem;
    left: 0;
    right: 0;
    width: 80%;
    margin: 0 auto;
  }
}
</style>