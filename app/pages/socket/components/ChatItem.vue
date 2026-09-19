<template>
  <div class="chat-item">
    <el-avatar :src="item.avatar" />
    <div class="chat-info">
      <div class="chat-name">{{ item.name }}</div>
      <div class="chat-msg">{{ item.lastMsg }}</div>
    </div>
    <div class="chat-time">{{ item.time }}</div>
    <el-badge v-if="item.unread" :value="item.unread" class="badge-red" />
  </div>
</template>
<script setup lang="ts">
import type { ChatItemType } from './SessionList.vue';
defineProps<{
  item: ChatItemType;
}>();
</script>
<style scoped>
.chat-item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  position: relative;
}
.chat-item:hover {
  background: #383838;
}
.chat-info {
  flex: 1;
  overflow: hidden;
}
.chat-name {
  color: #eee;
  font-size: 14px;
}
.chat-msg {
  color: #999;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chat-time {
  font-size: 11px;
  color: #777;
  white-space: nowrap;
}
.badge-red :deep(.el-badge__content) {
  background-color: #f53f3f;
}
</style>
