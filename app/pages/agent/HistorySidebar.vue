<template>
  <div class="history-sidebar">
    <div class="sidebar-header">
      <div>
        <i
          class="iconfont icon-home"
          @click="() => navigateTo('/')"
          :style="{ fontSize: '36px', color: 'var(--el-color-primary)' }"
        />
      </div>
      <el-icon size="24"><Expand /></el-icon>
      <!-- <Fold /> -->
    </div>
    <div class="sidebar-content">
      <div
        v-for="(session, index) in sessions"
        :key="index"
        :class="['session-item', { active: currentThreadId === session.id }]"
        @click="$emit('select', session.id)"
      >
        <div class="session-avatar">{{ session.name.charAt(0) }}</div>
        <div class="session-info">
          <div class="session-name">{{ session.name }}</div>
          <div class="session-preview">{{ session.preview }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  sessions: Array<{
    id: string;
    name: string;
    preview: string;
  }>;
  currentThreadId: string;
}>();

defineEmits<{
  select: [threadId: string];
}>();
</script>

<style scoped lang="scss">
.history-sidebar {
  width: 100%;
  height: 100%;
  background: var(--color-bg-card);
  display: flex;
  flex-direction: column;

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    font-weight: bold;
    font-size: 16px;
    border-bottom: 1px solid var(--color-border-light);
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .session-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--color-bg-muted);
    }

    &.active {
      background-color: #dbeafe;
    }

    .session-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: #3b82f6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .session-info {
      flex: 1;
      min-width: 0;

      .session-name {
        font-weight: 500;
        font-size: 14px;
        margin-bottom: 2px;
      }

      .session-preview {
        font-size: 12px;
        color: var(--color-gray-500);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}
</style>
