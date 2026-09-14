<template>
  <div class="sidebar-center">
    <!-- 搜索框 -->
    <div class="search-wrap">
      <el-input
        placeholder="搜索"
        :model-value="searchKey"
        clearable
        size="small"
        @update:model-value="$emit('update:searchKey', $event)"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button circle size="small" icon="Plus" />
    </div>

    <!-- 会话列表 -->
    <div class="chat-list">
      <div class="chat-item">
        <el-avatar src="https://picsum.photos/id/1010/40/40" />
        <div class="chat-info">
          <div class="chat-name">北斗七行</div>
          <div class="chat-msg">王：人呢？</div>
        </div>
        <div class="chat-time">16:39</div>
        <el-badge :value="37" class="badge-red" />
      </div>

      <div class="chat-item">
        <el-avatar src="https://picsum.photos/id/1027/40/40" />
        <div class="chat-info">
          <div class="chat-name">小美</div>
          <div class="chat-msg">ok</div>
        </div>
        <div class="chat-time">15:35</div>
      </div>

      <div class="chat-item">
        <el-avatar src="https://picsum.photos/id/1025/40/40" />
        <div class="chat-info">
          <div class="chat-name">小美，小明，鲁迪...</div>
          <div class="chat-msg">嗯哼: 好的</div>
        </div>
        <div class="chat-time">15:16</div>
      </div>
    </div>

    <div class="chat-list-footer">
      <el-button text>折叠置顶聊天</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, Plus } from '@element-plus/icons-vue';

defineProps<{
  searchKey: string;
}>();

defineEmits<{
  'update:searchKey': [value: string];
}>();
</script>

<style scoped>
.sidebar-center {
  height: 100%;
  background: #2b2b2b;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.search-wrap {
  display: flex;
  gap: 8px;
  padding: 12px;
  align-items: center;
}
.search-wrap :deep(.el-input__wrapper) {
  background-color: #383838;
  box-shadow: none;
}
.chat-list {
  flex: 1;
  overflow-y: auto;
}
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
.chat-list-footer {
  padding: 8px;
  text-align: center;
}
.chat-list-footer :deep(.el-button--text) {
  color: #999;
  font-size: 12px;
}
</style>
