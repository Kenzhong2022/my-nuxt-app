<template>
  <div class="conversation-list">
    <div class="conversation-item" v-for="item in list" :key="item.label">
      <IconMessage />
      <span class="label">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconMessage from '@/assets/svg/icon-message.svg';

const list = [
  { label: '创建 HTML 游戏环境…' },
  { label: '申请紧急事假' },
  { label: '什么是 UI/UX 设计？' },
  { label: '创建 POS 收银系统' },
  { label: '什么是 UX 审计？' },
  { label: '创建 GPT 聊天机器人…' },
  { label: 'GPT 是如何工作的？' },
]
</script>

<style scoped lang="scss">
// ===================== 会话列表 =====================
.conversation-list {
  .conversation-item {
    display: flex;
    gap: 0.375rem;
    padding: 0.4375rem 0.375rem;
    border-radius: 0.375rem;
    font-size: var(--kk-font-size-small);
    color: var(--el-text-color-primary);
    cursor: pointer;

    &:hover {
      background: var(--el-fill-color-light);
    }
  }
}
</style>