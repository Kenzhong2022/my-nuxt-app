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
    <div class="chat-container" flex-1 overflow-hidden flex flex-col>
      <!-- 置顶会话区域 -->
      <div v-if="pinnedList.length > 0" class="pinned-wrap">
        <div class="pinned-header" @click="isPinnedCollapse = !isPinnedCollapse">
          <span class="pinned-title">置顶会话</span>
          <el-icon class="pinned-arrow" :class="{ rotate: isPinnedCollapse }">
            <ArrowDown />
          </el-icon>
        </div>
        <div v-show="!isPinnedCollapse" class="pinned-list">
          <ChatItem v-for="item in pinnedList" :key="item.id" :item="item" />
        </div>
      </div>
      <!-- 普通会话列表 -->
      <div class="chat-list flex-1 overflow-y-auto">
        <ChatItem v-for="item in normalList" :key="item.id" :item="item" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
// 会话列表组件
import ChatItem from './ChatItem.vue';
import { Search, Plus, ArrowDown } from '@element-plus/icons-vue';
import { ref } from 'vue';
// 会话数据类型定义
export interface ChatItemType {
  id: string | number;
  avatar: string;
  name: string;
  lastMsg: string;
  time: string;
  unread?: number;
}

defineProps<{
  searchKey: string;
}>();
defineEmits<{
  'update:searchKey': [value: string];
}>();
// 置顶会话列表
const pinnedList = ref<ChatItemType[]>([
  {
    id: 1,
    avatar: 'https://picsum.photos/id/1010/40/40',
    name: '北斗七行',
    lastMsg: '王：人呢？',
    time: '16:39',
    unread: 37,
  },
]);
// 普通会话列表
const normalList = ref<ChatItemType[]>([
  {
    id: 2,
    avatar: 'https://picsum.photos/id/1027/40/40',
    name: '小美',
    lastMsg: 'ok',
    time: '15:35',
  },
  {
    id: 3,
    avatar: 'https://picsum.photos/id/1025/40/40',
    name: '小美，小明，鲁迪...',
    lastMsg: '嗯哼: 好的',
    time: '15:16',
  },
]);
// 置顶折叠状态
const isPinnedCollapse = ref(false);
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
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
/* 置顶区域 */
.pinned-wrap {
  flex-shrink: 0;
}
.pinned-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
}
.pinned-title {
  font-size: 12px;
  color: #888;
}
.pinned-arrow {
  color: #888;
  font-size: 14px;
  transition: transform 0.2s;
}
.pinned-arrow.rotate {
  transform: rotate(-90deg);
}

/* 普通会话列表 */
.chat-list {
  flex: 1;
  overflow-y: auto;
}
</style>
