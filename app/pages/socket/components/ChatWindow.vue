<template>
  <div class="chat-main">
    <div class="empty-chat">
      <el-icon size="80" color="#444"><ChatDotRound /></el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChatDotRound } from '@element-plus/icons-vue';
</script>

<style scoped>
.chat-main {
  height: 100%;
  background: #1c1c1c;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-chat {
  color: #444;
}
</style>
