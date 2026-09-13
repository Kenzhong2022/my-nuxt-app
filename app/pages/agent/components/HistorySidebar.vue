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
      <el-icon size="24" @click="toggleDrawer"><Expand /></el-icon>
      <!-- <Fold /> -->
    </div>
    <div class="sidebar-content">
      <div
        v-for="(session, index) in sessions"
        :key="index"
        :class="['session-item', { active: currentThreadId === session.id }]"
        @click="$emit('select', session.id)"
      >
        <div class="session-info">
          <div class="session-name">{{ session.name }}</div>
          <div class="session-preview">{{ session.preview }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  sessions: Array<{
    id: string;
    name: string;
    preview: string;
  }>;
  currentThreadId: string;
  visible: boolean;
}>();

const emit = defineEmits<{
  "update:visible": [visible: boolean];
  select: [threadId: string];
}>();

const toggleDrawer = () => {
  // 提交抽屉状态变化到父组件处理
  emit("update:visible", !props.visible);
};
</script>

<style scoped lang="scss">
.history-sidebar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 4px var(--el-box-shadow);

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    font-weight: bold;
    font-size: 16px;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .sidebar-content {
    padding: 8px;
    flex: 1;
    overflow-y: auto;
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
      background-color: var(--el-fill-color-light);
    }

    &.active {
      background-color: var(--el-color-primary-light-7);
    }

    .session-info {
      flex: 1;
      min-width: 0;

      .session-name {
        color: var(--el-color-primary);
        font-weight: 700;
        font-size: 14px;
        margin-bottom: 2px;
      }

      .session-preview {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}
</style>
